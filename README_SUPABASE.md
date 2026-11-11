# הפעלת האפליקציה עם Supabase

1. פתח פרויקט ב-supabase.com.
2. SQL Editor -> הדבק את `supabase_schema.sql` והרץ.
3. Project Settings -> API: העתק Project URL ו-anon key אל `js/supabase-config.js`.
4. (אופציונלי) העברת מבחנים קיימים: `export_exams.html` -> `exams_export.zip`, ואז `migrate_exams.html`.
5. הרם את התיקייה בשרת סטטי (Live Server / Netlify / GitHub Pages). הדפים משתמשים ב-ES modules, לכן לא נפתחים מ-file://.

הערות:
- `js/firebase-service.js` הוא רק הפניה ל-`supabase-service.js`, כדי שמבחנים ישנים ששמורים בבסיס הנתונים ימשיכו לעבוד.
- ארכיון המבחנים (`archive.html`) עבר לטבלה נפרדת `archive_exams`, כי קודם הוא חלק את האוסף `exams` עם המבחנים החיים וכפתור "אפס רשימה" היה מוחק גם אותם.
- מדיניות ה-RLS בקובץ ה-SQL פתוחה (כמו מצב בדיקה ב-Firebase). הידוק מוסבר בסוף הקובץ.
