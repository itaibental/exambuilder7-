import { PublishedService } from './supabase-service.js';

const ExamRunner = {
    examId: null,
    examData: null,

    init: function() {
        const urlParams = new URLSearchParams(window.location.search);
        this.examId = urlParams.get('id');
        if (!this.examId) {
            document.getElementById('authTitle').innerText = 'שגיאה: לא צוין מבחן';
            return;
        }
        this.loadExamData();
    },

    loadExamData: async function() {
        try {
            const found = await PublishedService.get(this.examId);
            if (found) {
                this.examData = found;
                document.getElementById('authTitle').innerText = `ברוכים הבאים למבחן: ${this.examData.title}`;
            } else {
                document.getElementById('authTitle').innerText = 'שגיאה: המבחן לא נמצא';
            }
        } catch (error) {
            console.error("Error loading exam data: ", error);
            document.getElementById('authTitle').innerText = 'שגיאה בטעינת המבחן';
        }
    },

    startExam: function() {
        const studentId = document.getElementById('studentIdInput').value.trim();
        const errorEl = document.getElementById('authError');
        if (!studentId) {
            errorEl.innerText = 'יש להזין תעודת זהות.';
            return;
        }

        if (this.examData && this.examData.allowedIds.includes(studentId)) {
            document.getElementById('authScreen').style.display = 'none';
            document.getElementById('examScreen').style.display = 'block';
            this.renderExam();
        } else {
            errorEl.innerText = 'תעודת הזהות שהוזנה אינה מורשית לגשת למבחן זה.';
        }
    },

    renderExam: function() {
        // This is a placeholder for rendering the exam from the examData object.
        // We will implement this in the next steps.
        document.getElementById('examHeader').innerHTML = `<h1>${this.examData.title}</h1>`;
        console.log("Rendering exam...", this.examData);
        // In a real scenario, you would loop through parts and questions and render them.
    },
    
    submitExam: function() {
        alert("Exam submitted! (feature in development)");
    }
};

window.ExamRunner = ExamRunner; // נקרא מ-onclick ב-exam.html
ExamRunner.init();
