/**
 * Generator (Main Orchestrator)
 */
const Generator = {
    generateAndDownload: function() {
        const name = ExamState.studentName || 'תלמיד';
        const duration = UI.elements.examDurationInput.value || 90;
        const unlockCodePlain = UI.elements.unlockCodeInput.value || '1234';
        const unlockCodeHash = Utils.simpleHash(unlockCodePlain);
        const teacherEmail = UI.elements.teacherEmailInput.value.trim();
        const driveLink = UI.elements.driveFolderInput.value.trim();
        
        const projectData = {
            state: ExamState,
            meta: {
                duration: UI.elements.examDurationInput.value,
                unlockCode: UI.elements.unlockCodeInput.value,
                teacherEmail: UI.elements.teacherEmailInput.value,
                driveLink: UI.elements.driveFolderInput.value,
                examTitle: ExamState.examTitle,
                generalInstructions: ExamState.instructions.general
            },
            timestamp: Date.now()
        };

        const htmlContent = HTMLBuilder.build(
            name, 
            ExamState.questions, 
            ExamState.instructions, 
            ExamState.examTitle, 
            ExamState.logoData, 
            ExamState.solutionDataUrl, 
            duration, 
            unlockCodeHash, 
            ExamState.parts, 
            teacherEmail, 
            driveLink, 
            projectData,
            ExamState.theme // Pass theme to builder
        );
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name} - מבחן.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        UI.showToast('קובץ המבחן הורד בהצלחה!');
    },

    // New Preview Function
    previewExam: function() {
        const name = ExamState.studentName || 'תצוגה מקדימה';
        const duration = UI.elements.examDurationInput.value || 90;
        const unlockCodePlain = UI.elements.unlockCodeInput.value || '1234';
        const unlockCodeHash = Utils.simpleHash(unlockCodePlain);
        const teacherEmail = UI.elements.teacherEmailInput.value.trim();
        const driveLink = UI.elements.driveFolderInput.value.trim();
        
        const projectData = {
            state: ExamState,
            meta: {
                duration: duration,
                unlockCode: unlockCodePlain,
                teacherEmail: teacherEmail,
                driveLink: driveLink,
                examTitle: ExamState.examTitle,
                generalInstructions: ExamState.instructions.general
            },
            timestamp: Date.now()
        };

        const htmlContent = HTMLBuilder.build(
            name, 
            ExamState.questions, 
            ExamState.instructions, 
            ExamState.examTitle, 
            ExamState.logoData, 
            ExamState.solutionDataUrl, 
            duration, 
            unlockCodeHash, 
            ExamState.parts, 
            teacherEmail, 
            driveLink, 
            projectData,
            ExamState.theme // Pass theme
        );

        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.document.open();
            previewWindow.document.write(htmlContent);
            previewWindow.document.close();
            previewWindow.document.title = "תצוגה מקדימה - " + ExamState.examTitle;
        } else {
            alert('הדפדפן חסם את החלון הקופץ. אנא אשר חלונות קופצים כדי לראות את התצוגה המקדימה.');
        }
    },

    generateAndDownloadDocx: function() {
        const content = DocxBuilder.build(
            ExamState.examTitle,
            ExamState.instructions,
            ExamState.parts,
            ExamState.questions,
            ExamState.studentName,
            ExamState.logoData
        );
        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${ExamState.studentName || 'מבחן'}.doc`; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};