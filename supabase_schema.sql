-- =====================================================================
-- סכימת Supabase למערכת בניית המבחנים
-- הרצה: Supabase Dashboard -> SQL Editor -> הדבק והרץ (ניתן להריץ שוב בבטחה)
-- =====================================================================

-- ---------- טבלאות ----------

-- מטא-דאטה של מבחן (קל, נטען ברשימות). active מופרד לעמודה כדי לסנן לפיו.
create table if not exists public.exams (
  id          text primary key default gen_random_uuid()::text,
  active      boolean not null default false,
  data        jsonb   not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- התוכן הכבד של המבחן (HTML + state) בנפרד, כמו תת-האוסף content/main ב-Firestore
create table if not exists public.exam_content (
  exam_id      text primary key references public.exams(id) on delete cascade,
  html_content text,
  state        jsonb
);

create table if not exists public.students (
  id    text primary key,
  data  jsonb not null default '{}'::jsonb
);

-- id בפורמט  studentID_examID
create table if not exists public.submissions (
  id           text primary key,
  last_update  bigint,
  data         jsonb not null default '{}'::jsonb
);
create index if not exists submissions_last_update_idx on public.submissions (last_update desc nulls last);

create table if not exists public.snapshots (
  submission_id text   not null,
  saved_at      bigint not null,
  answers       jsonb,
  primary key (submission_id, saved_at)
);

-- ארכיון המבחנים (archive.html). היה באותו אוסף "exams" של המבחנים החיים; כאן הופרד כדי
-- ש"אפס רשימה" בארכיון לא ימחק בטעות מבחנים אמיתיים.
create table if not exists public.archive_exams (
  id    text primary key default gen_random_uuid()::text,
  data  jsonb not null default '{}'::jsonb
);

-- מערכת ישנה (exam.html / student-login.js)
create table if not exists public.published_exams (
  id    text primary key default gen_random_uuid()::text,
  data  jsonb not null default '{}'::jsonb
);

-- ---------- תצוגה קלה להגשות (בלי answers/parts/questions/htmlContent) ----------
create or replace view public.submissions_light
  with (security_invoker = true) as
select id, last_update,
       data - 'answers' - 'parts' - 'questions' - 'htmlContent' as data
from public.submissions;

-- ---------- מיזוג הגשה (מקביל ל-setDoc(..., {merge:true})) ----------
create or replace function public.merge_submission(p_id text, p_data jsonb)
returns void
language sql
security invoker
as $$
  insert into public.submissions (id, last_update, data)
  values (
    p_id,
    case when jsonb_typeof(p_data->'lastUpdate') = 'number'
         then (p_data->>'lastUpdate')::bigint
         else (extract(epoch from now()) * 1000)::bigint end,
    p_data
  )
  on conflict (id) do update
    set data        = public.submissions.data || excluded.data,
        last_update = excluded.last_update;
$$;

-- ---------- Realtime (במקום onSnapshot) ----------
do $$
begin
  begin alter publication supabase_realtime add table public.exams;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.students;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.submissions; exception when duplicate_object then null; end;
end $$;

-- ---------- Row Level Security ----------
alter table public.exams           enable row level security;
alter table public.exam_content    enable row level security;
alter table public.students        enable row level security;
alter table public.submissions     enable row level security;
alter table public.snapshots       enable row level security;
alter table public.archive_exams   enable row level security;
alter table public.published_exams enable row level security;

-- !!! אזהרה !!!
-- המדיניות הבאה פותחת גישה מלאה לכל מי שמחזיק ב-anon key (כל מי שפותח את האתר).
-- זו אותה רמת הגנה שהיתה ב-Firebase במצב פתוח, והיא נועדה רק לעלות לאוויר מהר.
-- לפני שימוש אמיתי עם תלמידים מומלץ להחמיר (ראה הערות בתחתית הקובץ).
do $$
declare t text;
begin
  foreach t in array array['exams','exam_content','students','submissions','snapshots','archive_exams','published_exams']
  loop
    execute format('drop policy if exists "open_access" on public.%I', t);
    execute format('create policy "open_access" on public.%I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant select on public.submissions_light to anon, authenticated;
grant execute on function public.merge_submission(text, jsonb) to anon, authenticated;

-- =====================================================================
-- הידוק אבטחה מומלץ (דוגמה): התחברות מורה דרך Supabase Auth
-- 1. צור משתמש מורה ב-Authentication -> Users.
-- 2. מחק את open_access מכל הטבלאות והחלף:
--
--   -- תלמידים רואים רק מבחנים פעילים:
--   create policy "anon_read_active_exams" on public.exams for select to anon using (active = true);
--   create policy "anon_read_active_content" on public.exam_content for select to anon
--     using (exists (select 1 from public.exams e where e.id = exam_id and e.active));
--   -- תלמידים כותבים/קוראים הגשות (הדוגמה הזו עדיין פתוחה לכל anon; לחיזוק אמיתי העבר את
--   -- ההגשות ל-Edge Function שמאמתת תעודת זהות):
--   create policy "anon_submissions" on public.submissions for all to anon using (true) with check (true);
--   create policy "anon_snapshots"   on public.snapshots   for all to anon using (true) with check (true);
--   -- המורה (authenticated) מקבל הכל:
--   create policy "teacher_all_exams" on public.exams for all to authenticated using (true) with check (true);
--   ... וכן הלאה לשאר הטבלאות.
-- =====================================================================
