const UI = {
    elements: {},
    
    initElements: function() {
        const idList = [
            'questionsList', 'previewQuestionsContainer', 'statsContainer', 'totalPoints', 
            'studentNameInput', 'filenamePreview', 'previewTabs', 
            'examInstructions', 'examTitleInput', 'previewExamTitle', 'previewLogo', 
            'examDurationInput', 'unlockCodeInput', 'teacherEmailInput', 'driveFolderInput', 
            'toastContainer', 'confirmModal', 'previewPartInstructions',
            'partNameEditor', 'logoStatus', 'currentPartEditor',
            'bgColorInput', 'headerColorInput'
        ];
        idList.forEach(id => {
            const el = document.getElementById(id);
            if(el) this.elements[id] = el;
        });
    },

    showToast: function(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if(!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        void toast.offsetWidth; // כפיית רענון (Reflow) לאנימציה
        toast.classList.add('visible');
        
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showConfirm: function(title, text, callback) {
        if(confirm(`${title}\n\n${text}`)) {
            callback();
        }
    },

    renderTabs: function() {
        const container = this.elements.previewTabs;
        if (!container) return;
        container.innerHTML = '';
        ExamState.parts.forEach(p => {
            const div = document.createElement('div');
            div.className = `tab ${p.id === ExamState.currentTab ? 'active' : ''}`;
            div.textContent = p.name;
            div.onclick = () => App.setTab(p.id);
            container.appendChild(div);
        });
    },

    updateStats: function() {
        const container = this.elements.statsContainer;
        if(!container) return;
        container.innerHTML = '';
        let total = 0;
        ExamState.parts.forEach(p => {
            const partQs = ExamState.questions.filter(q => q.part === p.id);
            let partPoints = 0;
            partQs.forEach(q => partPoints += (parseInt(q.points)||0));
            const div = document.createElement('div');
            div.className = 'stat-row';
            div.innerHTML = `<span>${p.name}:</span> <span>${partPoints} נק'</span>`;
            container.appendChild(div);
            total += partPoints;
        });
        if(this.elements.totalPoints) this.elements.totalPoints.textContent = total;
    },

    applyTheme: function() {
        const root = document.documentElement;
        if (ExamState.theme.background) {
            root.style.setProperty('--exam-bg', ExamState.theme.background);
        }
        if (ExamState.theme.header) {
            root.style.setProperty('--header-color', ExamState.theme.header);
        }
    },

    renderPreview: function() {
        const container = this.elements.previewQuestionsContainer;
        if (!container) return;
        
        const currentPartId = ExamState.currentTab;
        const filtered = ExamState.questions.filter(q => q.part === currentPartId);

        // עדכון כותרות הפרק
        const currentPart = ExamState.parts.find(p => p.id === currentPartId);
        if(currentPart) {
            if(this.elements.partNameEditor) this.elements.partNameEditor.value = currentPart.name;
            if(this.elements.previewPartInstructions) {
                this.elements.previewPartInstructions.value = ExamState.instructions.parts[currentPartId] || '';
            }
        }

        if (filtered.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; color: #bdc3c7; padding: 30px; border: 2px dashed #eee; border-radius: 12px; margin-bottom: 20px;">
                <h3>עדיין אין שאלות בפרק זה</h3>
                <p>לחץ על הכפתור למטה כדי להוסיף שאלה חדשה.</p>
            </div>`;
            return;
        }

        const questionsHTML = filtered.map((q, idx) => {
            let mediaPreview = '';
            const imgSrc = Utils.getImageSrc(q.imageUrl);
            if (imgSrc) mediaPreview += `<div class="media-preview"><img src="${imgSrc}" alt="Question Image"></div>`;
            
            let subQuestionsHTML = '';
            if (q.subQuestions && q.subQuestions.length > 0) {
                subQuestionsHTML = q.subQuestions.map((sq, si) => {
                    const label = ExamState.subLabels[si] || (si + 1);
                    
                    let subMediaPreview = '';
                    const subImgSrc = Utils.getImageSrc(sq.imageUrl);
                    if (subImgSrc) subMediaPreview += `<div class="media-preview" style="margin-top:5px; text-align:right;"><img src="${subImgSrc}" alt="SubQ Image" style="max-height:100px;"></div>`;
                    
                    return `
                    <div class="sub-q-item">
                        <div class="sub-q-header">
                            <span>סעיף ${label}'</span>
                            <button onclick="App.deleteSubQuestion(${q.id}, ${sq.id})" style="color:var(--danger); background:none; border:none; padding:0; cursor:pointer;" title="מחק סעיף">🗑️ מחק</button>
                        </div>
                        <textarea class="sub-q-input" placeholder="תוכן הסעיף..." oninput="App.updateSubQuestionField(${q.id}, ${sq.id}, 'text', this.value)">${sq.text}</textarea>
                        
                        <div class="sub-q-media-inputs">
                            <input type="text" placeholder="🖼️ תמונה (URL)" value="${sq.imageUrl || ''}" onchange="App.updateSubQuestionField(${q.id}, ${sq.id}, 'imageUrl', this.value)" style="font-size:0.85rem;">
                            <input type="text" placeholder="🎥 וידאו (URL)" value="${sq.videoUrl || ''}" onchange="App.updateSubQuestionField(${q.id}, ${sq.id}, 'videoUrl', this.value)" style="font-size:0.85rem;">
                        </div>
                        ${subMediaPreview}

                        <div style="display:flex; justify-content:space-between; margin-top:10px; align-items:center; gap: 10px;">
                             <input type="number" class="points-input" value="${sq.points}" onchange="App.updateSubQuestionField(${q.id}, ${sq.id}, 'points', this.value)" placeholder="נקודות">
                             <input type="text" placeholder="מחוון לסעיף (אופציונלי: יוצג רק למורה)" value="${sq.modelAnswer || ''}" oninput="App.updateSubQuestionField(${q.id}, ${sq.id}, 'modelAnswer', this.value)" style="flex:1; font-size:0.9rem; background:#fffdf5; border: 1px solid #ffeeba; border-radius: 4px; padding: 8px;">
                        </div>
                    </div>`;
                }).join('');
            }

            const mainModelHTML = `
                <div class="model-answer-area">
                    <textarea placeholder="תשובה לדוגמא / מחוון למורה (לא יוצג לתלמיד במבחן)..." oninput="App.updateQuestionField(${q.id}, 'modelAnswer', this.value)">${q.modelAnswer || ''}</textarea>
                </div>
            `;

            return `
            <div class="question-card" id="q-card-${q.id}">
                <div class="card-toolbar">
                    <span class="q-number-badge">שאלה ${idx + 1}</span>
                    <div class="card-actions-top">
                        <button onclick="App.duplicateQuestion(${q.id})" title="שכפל שאלה"><i class="fas fa-copy"></i></button>
                        <button onclick="App.deleteQuestion(${q.id})" title="מחק שאלה"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                
                <textarea class="q-main-input" placeholder="הקלד את תוכן השאלה כאן..." oninput="App.updateQuestionField(${q.id}, 'text', this.value)">${q.text}</textarea>
                
                <div class="media-section">
                    <div class="media-inputs">
                        <input type="text" placeholder="קישור לתמונה (URL מ-Drive או אינטרנט)" value="${q.imageUrl || ''}" onchange="App.updateQuestionField(${q.id}, 'imageUrl', this.value)">
                        <input type="text" placeholder="קישור לוידאו (YouTube/Drive)" value="${q.videoUrl || ''}" onchange="App.updateQuestionField(${q.id}, 'videoUrl', this.value)">
                    </div>
                    ${mediaPreview}
                </div>

                <div class="sub-qs-container">
                    ${subQuestionsHTML}
                    <button class="btn-add-sub-inline" onclick="App.addSubQuestion(${q.id})"><i class="fas fa-plus"></i> הוסף סעיף לשאלה זו</button>
                </div>

                ${mainModelHTML}

                <div class="card-footer">
                    <div class="points-input-group">
                        <label style="margin:0;">ניקוד השאלה:</label>
                        <input type="number" class="points-input" value="${q.points}" onchange="App.updateQuestionField(${q.id}, 'points', parseInt(this.value)||0)">
                    </div>
                </div>
            </div>`;
        }).join('');
        container.innerHTML = questionsHTML;
    }
};
