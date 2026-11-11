/**
 * DocxBuilder
 */
const DocxBuilder = {
    build: function(examTitle, instructions, parts, questions, studentName, logoData) {
        let content = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset="utf-8">
            <title>${examTitle}</title>
            <style>
                body { font-family: Arial, sans-serif; direction: rtl; }
                .question-box { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
                .sub-q { margin-right: 20px; margin-top: 10px; }
                .answer-space { margin-top: 10px; color: #999; }
                img { max-width: 400px; height: auto; display: block; margin: 10px auto; }
                h1, h2 { text-align: center; }
            </style>
        </head>
        <body>`;
        if (logoData) {
            content += `<div style="text-align:center"><img src="${logoData}" alt="Logo"></div>`;
        }
        content += `<h1 style="text-align:center;">${examTitle}</h1>`;
        if (instructions.general) {
            content += `<div style="background:#f0f0f0; padding:10px; margin-bottom:20px;"><strong>הנחיות:</strong><br>${instructions.general.replace(/\n/g, '<br>')}</div>`;
        }
        parts.forEach(part => {
            content += `<h2>${part.name}</h2>`;
            if (instructions.parts[part.id]) {
                content += `<p><em>${instructions.parts[part.id].replace(/\n/g, '<br>')}</em></p>`;
            }
            const partQuestions = questions.filter(q => q.part === part.id);
            if (partQuestions.length === 0) {
                content += `<p>(אין שאלות בחלק זה)</p>`;
            } else {
                partQuestions.forEach((q, idx) => {
                    content += `<div class="question-box">`;
                    content += `<p><strong>שאלה ${idx + 1}</strong> (${q.points} נקודות)</p>`;
                    content += `<p>${q.text.replace(/\n/g, '<br>')}</p>`;
                    if (q.imageUrl) {
                        content += `<img src="${q.imageUrl}" />`;
                    }
                    if (q.subQuestions && q.subQuestions.length > 0) {
                        q.subQuestions.forEach((sq, si) => {
                            const label = ExamState.subLabels[si] || (si + 1);
                            content += `<div class="sub-q">
                                <p><strong>סעיף ${label}'</strong> (${sq.points} נק'): ${sq.text}</p>`;
                            
                            if (sq.imageUrl) {
                                content += `<img src="${sq.imageUrl}" style="max-height:150px;" />`;
                            }

                            content += `<p class="answer-space">_________________________________________________<br>_________________________________________________</p>
                            </div>`;
                        });
                    } else {
                        content += `<p class="answer-space"><br>_________________________________________________<br>_________________________________________________<br>_________________________________________________</p>`;
                    }
                    content += `</div>`;
                });
            }
        });
        content += `</body></html>`;
        return content;
    }
};