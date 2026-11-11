import { PublishedService } from './supabase-service.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('student-login-form');
    if (!loginForm) return;

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const feedbackElement = document.getElementById('login-feedback');

    const showFeedback = (message, type) => {
        feedbackElement.textContent = message;
        feedbackElement.className = `login-feedback-message ${type}`;
        feedbackElement.style.display = 'block';
    };

    const hideFeedback = () => {
        feedbackElement.style.display = 'none';
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideFeedback();

        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = 'מתחבר... <span class="spinner"></span>';
        submitButton.disabled = true;

        const examCode = document.getElementById('exam-code-input').value.trim();
        const studentId = document.getElementById('student-id-input').value.trim();

        if (!examCode || !studentId) {
            showFeedback('יש למלא קוד מבחן ותעודת זהות.', 'error');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        if (!/^[0-9]{9}$/.test(studentId)) {
            showFeedback('תעודת הזהות חייבת להכיל 9 ספרות בדיוק.', 'error');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
            return;
        }

        try {
            const examData = await PublishedService.findByUnlockCode(examCode);

            if (!examData) {
                showFeedback('קוד המבחן שהוזן שגוי או שהמבחן אינו זמין.', 'error');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
                return;
            }

            const examId = examData.id;

            const allowedIds = examData.allowedIds || [];
            if (allowedIds.length > 0 && !allowedIds.map(String).includes(studentId)) {
                showFeedback('מספר תעודת הזהות אינו מורשה לגשת למבחן זה.', 'error');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
                return;
            }

            showFeedback('ההתחברות הצליחה! מועבר למבחן...', 'success');
            sessionStorage.setItem('studentIdForExam', studentId);
            
            setTimeout(() => {
                window.location.href = `exam.html?id=${examId}`;
            }, 1500); // Wait a moment to show success message

        } catch (error) {
            console.error("Login Error:", error);
            showFeedback('אירעה שגיאה בעת ההתחברות. אנא נסה שוב או פנה לאחראי המבחן.', 'error');
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
});
