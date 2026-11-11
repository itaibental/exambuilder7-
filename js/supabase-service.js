// supabase-service.js v2.0.0 — מחליף את firebase-service.js (אותו API: CloudService / LiveService)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

// ---- Cache פנימי (30 שניות TTL) ----
const CACHE_TTL = 30_000;
const SUBMISSIONS_LIMIT = 100; // כמה הגשות אחרונות לטעון בדשבורד
const _cache = {};
function cacheGet(key) {
    const entry = _cache[key];
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
}
function cacheSet(key, data) { _cache[key] = { data, ts: Date.now() }; }
function cacheInvalidate(...keys) { keys.forEach(k => delete _cache[k]); }

if (SUPABASE_URL.includes("YOUR-PROJECT-REF")) {
    console.error("Supabase לא מוגדר: מלא את js/supabase-config.js");
}

// אין התחברות משתמשים באתר, לכן לא שומרים session (וגם נמנעת אזהרת "Multiple GoTrueClient")
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const HEAVY_EXAM_FIELDS = ["htmlContent", "state"];
const HEAVY_SUBMISSION_FIELDS = ["answers", "parts", "questions", "htmlContent"];

function strip(obj, fields) {
    const out = { ...(obj || {}) };
    fields.forEach(f => delete out[f]);
    return out;
}
function check({ data, error }) {
    if (error) throw new Error(error.message || String(error));
    return data;
}

// ---- מיפוי שורות -> אובייקטים באותו מבנה שהאפליקציה מכירה ----
const mapExam = row => ({ ...strip(row.data, HEAVY_EXAM_FIELDS), id: row.id, active: row.active });
const mapSubmission = row => {
    const d = strip(row.data, HEAVY_SUBMISSION_FIELDS);
    return { ...d, id: row.id, lastUpdate: d.lastUpdate ?? row.last_update };
};

// ---- שליפות גולמיות (ללא cache) ----
async function fetchStudents() {
    const rows = check(await supabase.from("students").select("data"));
    return rows.map(r => r.data);
}
async function fetchAllExams() {
    const rows = check(await supabase.from("exams").select("id, active, data"));
    return rows.map(mapExam);
}
async function fetchActiveExams() {
    const rows = check(await supabase.from("exams").select("id, active, data").eq("active", true));
    return rows.map(mapExam);
}
async function fetchSubmissions() {
    // רק ההגשות האחרונות, ובלי השדות הכבדים (תצוגה submissions_light)
    const rows = check(await supabase
        .from("submissions_light")
        .select("id, last_update, data")
        .order("last_update", { ascending: false, nullsFirst: false })
        .limit(SUBMISSIONS_LIMIT));
    return rows.map(mapSubmission);
}

export const CloudService = {
    // ---- מבחנים ----
    async uploadExam(examData) {
        const { htmlContent, state, ...lightData } = examData;
        const row = check(await supabase
            .from("exams")
            .insert({ active: !!lightData.active, data: lightData })
            .select("id")
            .single());
        check(await supabase.from("exam_content").upsert({
            exam_id: row.id, html_content: htmlContent ?? null, state: state ?? null
        }));
        cacheInvalidate("allExams", "activeExams");
        return { id: row.id };
    },
    async updateExam(examID, examData) {
        const { htmlContent, state, ...lightData } = examData;
        const existing = check(await supabase.from("exams").select("active, data").eq("id", examID).maybeSingle());
        if (!existing) throw new Error("מבחן לא נמצא");
        check(await supabase.from("exams").update({
            data: { ...existing.data, ...lightData },
            active: lightData.active !== undefined ? !!lightData.active : existing.active
        }).eq("id", examID));
        check(await supabase.from("exam_content").upsert({
            exam_id: examID, html_content: htmlContent ?? null, state: state ?? null
        }));
        cacheInvalidate("allExams", "activeExams");
    },
    async deleteExam(examID) {
        cacheInvalidate("allExams", "activeExams");
        // exam_content נמחק אוטומטית (on delete cascade)
        check(await supabase.from("exams").delete().eq("id", examID));
    },

    // ---- שכפול מבחן ----
    async duplicateExam(examID) {
        const [meta, content] = await Promise.all([
            supabase.from("exams").select("data").eq("id", examID).maybeSingle(),
            supabase.from("exam_content").select("html_content, state").eq("exam_id", examID).maybeSingle()
        ]);
        const metaRow = check(meta);
        if (!metaRow) throw new Error("מבחן לא נמצא");
        const contentRow = check(content);
        const newData = { ...metaRow.data, title: (metaRow.data.title || "מבחן") + " (עותק)", createdAt: Date.now(), active: false };
        const created = check(await supabase.from("exams").insert({ active: false, data: newData }).select("id").single());
        if (contentRow) {
            check(await supabase.from("exam_content").upsert({
                exam_id: created.id, html_content: contentRow.html_content, state: contentRow.state
            }));
        }
        cacheInvalidate("allExams", "activeExams");
        return created.id;
    },

    // ---- תלמידים ----
    async saveStudents(studentList) {
        const rows = studentList.map(s => ({ id: String(s.id), data: s }));
        cacheInvalidate("students");
        if (rows.length === 0) return;
        check(await supabase.from("students").upsert(rows));
    },
    async getStudents() {
        const cached = cacheGet("students");
        if (cached) return cached;
        const result = await fetchStudents();
        cacheSet("students", result);
        return result;
    },
    async deleteStudent(studentID) {
        cacheInvalidate("students");
        check(await supabase.from("students").delete().eq("id", String(studentID)));
    },
    async verifyStudent(studentID) {
        const row = check(await supabase.from("students").select("data").eq("id", String(studentID)).maybeSingle());
        return row ? row.data : null;
    },

    // ---- קריאת מבחנים ----
    async getActiveExams() {
        const cached = cacheGet("activeExams");
        if (cached) return cached;
        const result = await fetchActiveExams();
        cacheSet("activeExams", result);
        return result;
    },
    async getAllExams() {
        const cached = cacheGet("allExams");
        if (cached) return cached;
        const result = await fetchAllExams();
        cacheSet("allExams", result);
        return result;
    },
    async toggleExamActive(examID, currentActive) {
        cacheInvalidate("allExams", "activeExams");
        check(await supabase.from("exams").update({ active: !currentActive }).eq("id", examID));
    },
    async getExam(examID) {
        // שתי הקריאות במקביל
        const [contentRes, metaRes] = await Promise.all([
            supabase.from("exam_content").select("html_content, state").eq("exam_id", examID).maybeSingle(),
            supabase.from("exams").select("id, active, data").eq("id", examID).maybeSingle()
        ]);
        const content = check(contentRes);
        if (content) return { htmlContent: content.html_content, state: content.state };
        const meta = check(metaRes);
        return meta ? { ...meta.data, active: meta.active } : null;
    },
    async getExamHtml(examID) {
        const content = check(await supabase.from("exam_content").select("html_content").eq("exam_id", examID).maybeSingle());
        if (content) return content.html_content || null;
        const meta = check(await supabase.from("exams").select("data").eq("id", examID).maybeSingle());
        return meta ? (meta.data.htmlContent || null) : null;
    },

    // ---- הגשות ----
    async saveSubmission(submissionData) {
        const id = `${submissionData.studentID}_${submissionData.examID}`;
        cacheInvalidate("submissions");
        // מיזוג בצד השרת (כמו merge:true ב-Firestore)
        check(await supabase.rpc("merge_submission", { p_id: id, p_data: submissionData }));
    },
    async getSubmissions() {
        const cached = cacheGet("submissions");
        if (cached) return cached;
        const result = await fetchSubmissions();
        cacheSet("submissions", result);
        return result;
    },
    async getSubmission(subID) {
        const row = check(await supabase.from("submissions").select("data").eq("id", subID).maybeSingle());
        return row ? row.data : null;
    },
    async deleteSubmission(subID) {
        cacheInvalidate("submissions");
        check(await supabase.from("submissions").delete().eq("id", subID));
    },

    // ---- שמירת snapshot כל 10 דקות ----
    async saveSnapshot(studentID, examID, answers) {
        const ts = Date.now();
        check(await supabase.from("snapshots").upsert({
            submission_id: `${studentID}_${examID}`, saved_at: ts, answers
        }));
        return ts;
    },
    async getSnapshots(studentID, examID) {
        const rows = check(await supabase
            .from("snapshots")
            .select("saved_at, answers")
            .eq("submission_id", `${studentID}_${examID}`)
            .order("saved_at", { ascending: false }));
        return rows.map(r => ({ id: String(r.saved_at), answers: r.answers, savedAt: Number(r.saved_at) }));
    },

    // ---- טעינה מקבילית של כל נתוני הדשבורד ----
    async getDashboardData() {
        const [students, exams, submissions] = await Promise.all([
            this.getStudents(),
            this.getAllExams(),
            this.getSubmissions()
        ]);
        return { students, exams, submissions };
    }
};

// ---- האזנה בזמן אמת (Supabase Realtime) ----
// כל פונקציה מחזירה פונקציה לביטול ההאזנה. המטמון מתעדכן יחד עם כל עדכון.
// שים לב: Realtime צריך להיות מופעל לטבלאות (supabase_schema.sql עושה זאת).
function watchTable(table, fetcher, cacheKey, onData, onError) {
    let closed = false;
    let timer = null;
    const run = async () => {
        try {
            const result = await fetcher();
            if (closed) return;
            cacheSet(cacheKey, result);
            onData(result);
        } catch (e) {
            if (!closed && onError) onError(e);
        }
    };
    run(); // כמו onSnapshot: קריאה ראשונה מיד
    const channel = supabase
        .channel(`watch_${table}_${cacheKey}_${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
            clearTimeout(timer);
            timer = setTimeout(run, 250); // איחוד אירועים צפופים לרענון אחד
        })
        .subscribe();
    return () => {
        closed = true;
        clearTimeout(timer);
        supabase.removeChannel(channel);
    };
}

export const LiveService = {
    watchStudents(onData, onError) {
        return watchTable("students", fetchStudents, "students", onData, onError);
    },
    // מבחנים פעילים בלבד (לתלמידים)
    watchExams(onData, onError) {
        return watchTable("exams", fetchActiveExams, "activeExams", onData, onError);
    },
    // כל המבחנים (למורה)
    watchAllExams(onData, onError) {
        return watchTable("exams", fetchAllExams, "allExams", onData, onError);
    },
    watchSubmissions(onData, onError) {
        return watchTable("submissions", fetchSubmissions, "submissions", onData, onError);
    }
};

// ---- ארכיון מבחנים (archive.html) ----
export const ArchiveService = {
    async list() {
        const rows = check(await supabase.from("archive_exams").select("id, data"));
        return rows.map(r => ({ id: r.id, ...r.data }));
    },
    async add(exam) {
        check(await supabase.from("archive_exams").insert({ data: exam }));
    },
    async remove(id) {
        check(await supabase.from("archive_exams").delete().eq("id", id));
    },
    async clear() {
        check(await supabase.from("archive_exams").delete().not("id", "is", null));
    }
};

// ---- מערכת ישנה: מבחנים שפורסמו עם קוד פתיחה (exam.html / student-login.js) ----
export const PublishedService = {
    async get(id) {
        const row = check(await supabase.from("published_exams").select("id, data").eq("id", id).maybeSingle());
        return row ? { id: row.id, ...row.data } : null;
    },
    async findByUnlockCode(code) {
        const rows = check(await supabase.from("published_exams").select("id, data").eq("data->meta->>unlockCode", code).limit(1));
        return rows.length ? { id: rows[0].id, ...rows[0].data } : null;
    }
};
