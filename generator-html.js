/**
 * HTMLBuilder
 */
window.HTMLBuilder = {
    build: function(studentName, questions, instructions, examTitle, logoData, solutionDataUrl, duration, unlockCodeHash, parts, teacherEmail, driveLink, projectData, theme) {
        
        // --- מנגנוני הגנה למבחנים וטיוטות מגרסאות ישנות ---
        const safeInstructions = (typeof instructions === 'string') ? { general: instructions, parts: {} } : (instructions || { general: '', parts: {} });
        if (!safeInstructions.parts) safeInstructions.parts = {};
        const safeParts = parts || [{ id: 'A', name: 'חלק ראשון' }];
        const safeQuestions = questions || [];
        const safeTheme = theme || { background: '#f4f6f8', header: '#2c3e50' };

        // תיקון קריאת קבצי המולטימדיה (Utils)
        const myUtils = (typeof Utils !== 'undefined') ? Utils : (window.Utils || null);

        const tabsHTML = safeParts.map((p, idx) => `<button class="tab-btn ${idx===0?'active':''}" onclick="showPart('${p.id}')">${p.name}</button>`).join('');

        const sectionsHTML = safeParts.map((p, idx) => {
            const partQuestions = safeQuestions.filter(q => q.part === p.id || (!q.part && idx === 0));
            const partInstrHtml = safeInstructions.parts[p.id] ? `<div class="part-instructions">${safeInstructions.parts[p.id].replace(/\n/g, '<br>')}</div>` : '';
            
            let qHtml = '';
            if(partQuestions.length === 0) {
                qHtml = '<p style="text-align:center; color:#95a5a6; padding:20px;">אין שאלות בחלק זה</p>';
            } else {
                qHtml = partQuestions.map((q, qIdx) => {
                    // שליפת וידאו ותמונה - מתוקן
                    const embedSrc = (myUtils && q.videoUrl) ? myUtils.getVideoEmbedUrl(q.videoUrl, q.videoOptions) : '';
                    let vid = embedSrc ? `<div class="video-wrapper"><div class="video-shield"></div><iframe src="${embedSrc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '';
                    
                    const imgSrc = (myUtils && q.imageUrl) ? myUtils.getImageSrc(q.imageUrl) : (q.imageUrl || '');
                    let img = imgSrc ? `<div class="image-wrapper"><img src="${imgSrc}" alt="Question Image"></div>` : '';

                    let interactionHTML = '';
                    let gradingHTML = '';
                    let modelAnsHtml = '';

                    if (q.subQuestions && q.subQuestions.length > 0) {
                        interactionHTML = q.subQuestions.map((sq, si) => {
                            const label = (window.ExamState && window.ExamState.subLabels) ? window.ExamState.subLabels[si] : (si + 1);
                            const sqModelAns = sq.modelAnswer ? `<div class="model-answer-secret" style="display:none; margin-top:5px; background:#fff3cd; color:#856404; padding:5px; border-radius:4px; font-size:0.9em; border:1px solid #ffeeba;"><strong>מחוון (${label}'):</strong> <span class="model-ans-text-content">${sq.modelAnswer}</span></div>` : '';
                            
                            // שליפת וידאו ותמונה עבור תתי-שאלות - מתוקן
                            const sqEmbedSrc = (myUtils && sq.videoUrl) ? myUtils.getVideoEmbedUrl(sq.videoUrl, { showControls: true, modestBranding: true }) : '';
                            let sqVid = sqEmbedSrc ? `<div class="video-wrapper"><div class="video-shield"></div><iframe src="${sqEmbedSrc}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>` : '';
                            
                            const sqImgSrc = (myUtils && sq.imageUrl) ? myUtils.getImageSrc(sq.imageUrl) : (sq.imageUrl || '');
                            let sqImg = sqImgSrc ? `<div class="image-wrapper"><img src="${sqImgSrc}" alt="SubQ Image"></div>` : '';

                            return `
                            <div class="sub-question-block" data-points="${sq.points}" style="border-right:3px solid #eee; padding-right:15px;">
                                <div class="sub-q-title" style="font-weight:bold; color:#3498db; margin-bottom:5px;">סעיף ${label}' (${sq.points || 0} נק')</div>
                                <div class="sub-q-text" id="q-text-${q.id}-${si}">${sq.text || ''}</div>
                                ${sqImg}${sqVid}
                                <div class="answer-area" style="margin-top:10px;">
                                    <div class="textarea-wrapper">
                                        <textarea class="student-ans" id="student-ans-${q.id}-${si}" placeholder="תשובה לסעיף ${label}'..." style="height:10vh;"></textarea>
                                        <button type="button" class="mic-btn" onclick="toggleVoiceTyping('student-ans-${q.id}-${si}', this)" title="הקלדה קולית">🎤</button>
                                    </div>
                                </div>
                                <div class="grading-area">
                                    <div style="display:flex; align-items:center; gap:1vw;">
                                        <label>ניקוד:</label>
                                        <input type="number" class="grade-input" id="grade-input-${q.id}-${si}" min="0" max="${sq.points || 0}" oninput="calcTotal()" disabled>
                                        <span class="grade-max">מתוך ${sq.points || 0}</span>
                                    </div>
                                    <input type="text" class="teacher-comment" id="comment-input-${q.id}-${si}" placeholder="הערה מילולית..." disabled style="width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                                    ${sqModelAns}
                                </div>
                            </div>`;
                        }).join('');
                    } else {
                        modelAnsHtml = q.modelAnswer ? `<div class="model-answer-secret" style="display:none; margin-top:15px; background:#fff3cd; color:#856404; padding:10px; border-radius:5px; border:1px solid #ffeeba;"><strong>🔑 תשובה לדוגמא (למורה):</strong><br><div style="white-space:pre-wrap; margin-top:5px;" id="model-ans-text-${q.id}" class="model-ans-text-content">${q.modelAnswer}</div></div>` : '';
                        interactionHTML = `
                        <div class="answer-area">
                            <label>תשובה:</label>
                            <div class="textarea-wrapper">
                                <textarea class="student-ans" id="student-ans-${q.id}" placeholder="כתוב את תשובתך כאן..."></textarea>
                                <button type="button" class="mic-btn" onclick="toggleVoiceTyping('student-ans-${q.id}', this)" title="הקלדה קולית">🎤</button>
                            </div>
                        </div>`;
                        gradingHTML = `
                        <div class="grading-area">
                            <div style="display:flex; align-items:center; gap:1vw;">
                                <label>ניקוד:</label>
                                <input type="number" class="grade-input" id="grade-input-${q.id}" min="0" max="${q.points || 0}" oninput="calcTotal()" disabled>
                                <span class="grade-max">מתוך ${q.points || 0}</span>
                            </div>
                            <input type="text" class="teacher-comment" id="comment-input-${q.id}" placeholder="הערה מילולית למורה..." disabled style="width: 100%; margin-top: 5px; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
                            ${modelAnsHtml}
                        </div>`;
                    }

                    return `<div class="q-block" id="question-block-${q.id}">
                        <div class="q-header">
                            <span class="q-points">(${q.points || 0} נק' סה"כ)</span>
                            <strong id="q-label-${q.id}">שאלה ${qIdx+1}:</strong>
                        </div>
                        <div class="q-content" id="q-main-text-${q.id}">${q.text || ''}</div>
                        ${img}${vid}
                        ${interactionHTML}
                        ${gradingHTML}
                    </div>`;
                }).join('');
            }
            return `<div id="part-${p.id}" class="exam-section ${idx===0?'active':''}">
                <h2 style="color:${safeTheme.header}; border-bottom:0.3vh solid #3498db; font-weight: 700; padding-bottom:1vh; margin-bottom:3vh;">${p.name}</h2>
                ${partInstrHtml}${qHtml}</div>`;
        }).join('');

        const globalInstructionsHTML = safeInstructions.general ? `<div class="instructions-box global-instructions"><h3>הנחיות כלליות</h3><div class="instructions-text">${safeInstructions.general.replace(/\n/g, '<br>')}</div></div>` : '';
        const logoHTML = logoData ? `<img src="${logoData}" alt="Logo" class="school-logo">` : '';
        const embeddedProjectData = projectData ? `<script type="application/json" id="exam-engine-data">${JSON.stringify(projectData).replace(/<\/script>/g, '<\\/script>')}</script>` : '';

        const bgColor = safeTheme.background;
        const hdrColor = safeTheme.header;

        const cloudSaveArea = `
            <div style="text-align:center; margin: 30px 0; background: #ebf5fb; padding: 20px; border-radius: 12px; border: 1px dashed #3498db;">
                <p style="margin: 0 0 10px 0; font-size: 0.95rem; color: #2980b9; font-weight: bold;">☁️ המערכת מגבה את תשובותיך אוטומטית בכל 40 שניות.</p>
                <button type="button" onclick="saveProgressToCloud(false)" id="btnCloudSave" style="background: #3498db; color: white; padding: 12px 25px; border: none; border-radius: 30px; font-size: 1.1rem; cursor: pointer; transition: 0.2s;">
                    💾 שמירה יזומה לענן
                </button>
            </div>
        `;

        return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>מבחן - ${studentName}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap"><style>
        :root{--primary:#2c3e50;--accent:#3498db;--success:#27ae60;--danger:#e74c3c;}
        body{font-family:'Rubik',sans-serif;background:${bgColor};margin:0;padding:2%;color:#2c3e50;font-size:18px;line-height:1.5; user-select: text;} 
        .container{max-width:800px;margin:0 auto;background:white;padding:5%;border-radius:1em;box-shadow:0 1vh 3vh rgba(0,0,0,0.05);}
        textarea{width:100%;height:20vh;padding:2vh;border:1px solid #ccc;border-radius:0.8em;font-family:inherit;font-size:1rem; user-select: text;}
        button{cursor:pointer;}
        .tab-btn{padding:10px 20px;background:#eee;border:none;margin:5px;border-radius:20px;font-size:1rem;}
        .tab-btn.active{background:var(--accent);color:white;}
        .exam-section{display:none;}
        .exam-section.active{display:block;}
        .part-instructions { background: #e8f6f3; border-right: 4px solid #1abc9c; padding: 15px; margin-bottom: 20px; border-radius: 4px; color: #16a085; font-size: 1.05em; line-height: 1.5; display: block !important; width: 100%; box-sizing: border-box; }
        .school-logo { display: block; margin: 0 auto 20px auto; max-width: 200px; max-height: 150px; width: auto; height: auto; object-fit: contain; }
        .q-content, .sub-q-text, .instructions-text, .part-instructions { user-select: text !important; white-space: pre-wrap; }
        .video-wrapper { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; width: 100%; max-width: 100%; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .video-wrapper iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
        .video-shield { position: absolute; top: 0; left: 0; width: 100%; height: 15%; z-index: 10; background: transparent; }
        .image-wrapper { text-align: center; margin: 20px 0; width: 100%; }
        .image-wrapper img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); display: block; margin: 0 auto; }
        
        .textarea-wrapper { position: relative; width: 100%; margin-top: 5px; }
        .textarea-wrapper textarea { width: 100%; padding-left: 50px !important; box-sizing: border-box; }
        .mic-btn { position: absolute; top: 10px; left: 10px; background: #fff; border: 1px solid #ddd; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; transition: 0.2s; z-index: 5; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .mic-btn:hover { background: #f0f0f0; transform: scale(1.05); }
        .mic-btn.recording { background: #e74c3c; border-color: #c0392b; animation: pulse-mic 1s infinite; }
        @keyframes pulse-mic { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); } 70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); } }
        
        .teacher-controls { background: #fdf2e9; padding: 15px; border: 1px solid #f39c12; border-radius: 8px; margin-bottom: 20px; }
        .grading-area { display: none; margin-top: 15px; background: #fafafa; padding: 10px; border-top: 2px solid #bdc3c7; }
        .q-block { margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #eee; }
        .q-block:last-child { border-bottom: none; }
        .sub-question-block { margin-top: 30px !important; padding-top: 20px; border-top: 1px dashed #ddd; }
        .grade-input { width: 60px; padding: 5px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-weight: bold; }
        .teacher-comment { background: #fff; }
        .model-answer-secret { margin-top: 10px; border: 1px dashed #f39c12; padding: 10px; background: #fffdf5; border-radius: 4px; font-size: 0.9em; color: #555; }
        #startScreen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #2c3e50; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 9999; text-align: center; padding: 20px; box-sizing: border-box; }
        .sound-check-box { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); padding: 15px; border-radius: 8px; margin-bottom: 30px; max-width: 600px; text-align: center; width: 100%; }
        .sound-check-text { font-size: 0.95em; margin-bottom: 15px; color: #ecf0f1; line-height: 1.5; }
        .sound-btn { background: #3498db; border: none; padding: 10px 25px; border-radius: 5px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0 auto; font-size: 1.1em; transition: background 0.2s, transform 0.1s; width: auto; }
        .sound-btn:hover { background: #2980b9; }
        .sound-btn.playing { background: #e74c3c; animation: pulse 1s infinite; }
        #highlighterTool { position: fixed; top: 150px; right: 20px; width: 50px; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border-radius: 30px; padding: 15px 0; display: flex; flex-direction: column; align-items: center; gap: 12px; z-index: 10000; border: 1px solid #ddd; transition: opacity 0.3s; display: none; }
        .color-btn { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .color-btn.active { border-color: #333; transform: scale(1.2); box-shadow: 0 0 0 2px #333; }
        .drag-handle { cursor: move; color: #ccc; font-size: 20px; line-height: 10px; margin-bottom: 5px; user-select: none; }
        #timesUpModal, #securityModal, #successModal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #2c3e50; color: white; display: none; align-items: center; justify-content: center; flex-direction: column; z-index: 10000; text-align: center; }
        #timerBadge { position: fixed; top: 10px; left: 10px; background: white; color: black; padding: 10px; border-radius: 20px; border: 2px solid #2c3e50; font-weight: bold; z-index: 5000; display: none; }
        #securityModal h2, #timesUpModal h2 { font-size: 3rem; margin-bottom: 10px; color: #e74c3c; }
        .modal-action-btn { padding: 12px 25px; margin: 10px; font-size: 1.1rem; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-submit-exam { background: #27ae60; color: white; }
        .btn-extend-time { background: #3498db; color: white; }
        .btn-cancel { background: #95a5a6; color: white; }

        /* ========================================== */
        /* === רספונסיבי למובייל                  === */
        /* ========================================== */
        @media (max-width: 768px) {
            body { font-size: 16px; padding: 0; background: white; }
            .container { max-width: 100%; margin: 0; padding: 16px; border-radius: 0; box-shadow: none; }
            .container > div:first-child h1 { font-size: 1.4rem; line-height: 1.3; }
            .school-logo { max-width: 120px; max-height: 80px; }
            .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
            .tab-btn { padding: 8px 14px; font-size: 0.9rem; border-radius: 16px; flex: 1; min-width: 80px; text-align: center; }
            .q-block { margin-bottom: 32px; padding-bottom: 24px; }
            .q-header { font-size: 1rem; }
            .q-content, .sub-q-text { font-size: 1rem; line-height: 1.6; }
            .sub-question-block { padding-right: 10px !important; margin-top: 24px !important; }
            textarea { height: 25vh; font-size: 1rem; padding: 12px; border-radius: 10px; }
            .mic-btn { width: 40px; height: 40px; font-size: 1.3rem; }
            .part-instructions { font-size: 0.95rem; padding: 12px; }
            #btnCloudSave { width: 100%; padding: 14px; font-size: 1rem; }
            .student-submit-area button { width: 100%; padding: 16px; font-size: 1.1rem; border-radius: 12px; }
            .teacher-controls > div:nth-child(2) { flex-direction: column; }
            .teacher-controls button { width: 100%; margin: 4px 0 !important; }
            #timerBadge { top: 8px; left: 8px; font-size: 0.9rem; padding: 6px 12px; }
            #startScreen h1 { font-size: 1.8rem; }
            #startScreen > button { padding: 14px 30px !important; font-size: 1.2em !important; width: 90%; }
            .modal-action-btn { display: block; width: 80%; margin: 8px auto !important; }
            #highlighterTool { top: auto !important; bottom: 20px; right: 10px; flex-direction: row; width: auto; padding: 10px 12px; border-radius: 30px; gap: 10px; }
            #hlDragHandle { display: none; }
        }
        @media (max-width: 400px) {
            body { font-size: 15px; }
            .tab-btn { font-size: 0.82rem; padding: 6px 10px; }
            .q-block { margin-bottom: 24px; }
            textarea { height: 22vh; }
        }
        </style></head><body>
        ${embeddedProjectData}
        
        <div id="highlighterTool">
            <div class="drag-handle" id="hlDragHandle">:::</div>
            <div class="color-btn" style="background:#ffeb3b;" onclick="setMarker('#ffeb3b', this)"></div>
            <div class="color-btn" style="background:#a6ff00;" onclick="setMarker('#a6ff00', this)"></div>
            <div class="color-btn" style="background:#ff4081;" onclick="setMarker('#ff4081', this)"></div>
            <div class="color-btn" style="background:#00e5ff;" onclick="setMarker('#00e5ff', this)"></div>
            <div class="color-btn" style="background:#fff; border:1px solid #ccc; display:flex; justify-content:center; align-items:center; font-size:12px;" onclick="setMarker('transparent', this)">❌</div>
        </div>

        <div id="startScreen">
            <h1 style="font-size: 3rem; margin-bottom: 10px;">${examTitle}</h1>
            <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; max-width: 600px; margin-bottom: 30px; text-align: right;">
                <h3 style="margin-top:0; color: #f1c40f; text-align: center;">📜 הנחיות לנבחן</h3>
                <ul style="list-style-type: none; padding: 0; line-height: 1.8;">
                    <li>⏳ <strong>משך הבחינה:</strong> ${duration} דקות.</li>
                    <li>🖥️ <strong>מצב מסך:</strong> הבחינה מתבצעת במסך מלא בלבד.</li>
                    <li>🚫 <strong>אזהרה:</strong> יציאה ממסך מלא או מעבר לחלון אחר ינעלו את המבחן באופן מיידי!</li>
                    ${safeInstructions.general ? '<li style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.2);"><strong>הנחיות מיוחדות:</strong><br>' + safeInstructions.general.replace(/\n/g, '<br>') + '</li>' : ''}
                </ul>
            </div>
            
            <div class="sound-check-box">
                <p class="sound-check-text">🔊 <strong>בדיקת שמע:</strong> ודאו שאתם שומעים את הצליל באוזניות.</p>
                <button id="soundCheckBtn" class="sound-btn" onclick="toggleSoundCheck()"><span>▶️ נגן צליל בדיקה</span></button>
            </div>
            
            <button onclick="startExamTimer()" style="padding:15px 40px; font-size:1.5em; background:#27ae60; color:white; border:none; border-radius:50px; font-weight:bold; box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.2s;">התחל בחינה (מסך מלא)</button>
        </div>
        
        <div id="timerBadge">זמן: <span id="timerText">--:--</span></div>
        
        <div id="timesUpModal">
            <h2>🛑 הזמן נגמר!</h2>
            <div id="timesUpActions">
                <p>הזמן שהוקצב לבחינה הסתיים.</p>
                <button class="modal-action-btn btn-submit-exam" onclick="submitExam()">הגש מבחן</button>
                <button class="modal-action-btn btn-extend-time" onclick="showExtensionInput()">👩‍🏫 בקש הארכת זמן (מורה)</button>
            </div>
            <div id="extensionPanel" style="display:none;">
                <h3>תוספת זמן (למורה בלבד)</h3>
                <input type="password" id="extTeacherCode" placeholder="קוד מורה">
                <input type="number" id="extTimeAmount" placeholder="דקות להוספה" value="15" style="width: 100px;">
                <div style="margin-top: 10px;">
                    <button class="modal-action-btn btn-submit-exam" onclick="addTime()">אשר תוספת</button>
                    <button class="modal-action-btn btn-cancel" onclick="cancelExtension()">ביטול</button>
                </div>
            </div>
        </div>
        
        <div id="securityModal">
            <div style="font-size: 5rem;">🔒</div>
            <h2>המבחן ננעל!</h2>
            <p style="font-size: 1.5rem; max-width: 600px;">המערכת זיהתה יציאה ממסך מלא או מעבר לחלון אחר.<br>לשחרור המבחן יש לקרוא למורה.</p>
            <input type="password" id="teacherCodeInput" placeholder="קוד מורה לשחרור" style="padding: 10px; font-size: 1.2rem; margin: 20px; text-align: center;">
            <button onclick="unlockExam()" style="padding: 10px 30px; background: #e74c3c; color: white; border: none; font-size: 1.2rem; border-radius: 5px;">שחרר נעילה</button>
        </div>
        
        <div id="successModal">
            <div style="font-size: 5rem;">✅</div>
            <h1>המבחן הוגש בהצלחה!</h1>
            <p>הבחינה שלך נשמרה בענן בהצלחה.</p>
            <div id="submissionActions"></div>
            <div style="margin-top:30px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.3);">
                <button onclick="enableGradingFromModal()" style="background: transparent; border: 1px solid #fff; color: #fff; padding: 10px 20px; border-radius: 5px;">👨‍🏫 מורה? לחץ כאן לבדיקה</button>
            </div>
        </div>
        
        <div class="container" id="mainContainer" style="filter:blur(5px);">
            <div style="text-align:center;">${logoHTML}<h1 style="color:${hdrColor};">${examTitle}</h1></div>
            
            <div class="teacher-controls" style="display:none;">
                <h3 style="margin-top:0; color:#d35400;">👨‍🏫 אזור בדיקה וציינון</h3>
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div style="font-size: 1.2em; font-weight: bold;">ציון סופי מחושב: <span id="teacherCalculatedScore" style="color: var(--success); font-size:1.4em;">0</span></div>
                    <div>
                        <button onclick="exportToDoc()" style="background:#2980b9;color:white;padding:10px 20px;border:none;border-radius:5px; margin-left: 10px; font-weight:bold;">📄 הורד סיכום (DOCX)</button>
                        <button onclick="saveGradingToCloud()" style="background:#8e44ad;color:white;padding:10px 20px;border:none;border-radius:5px; font-weight:bold;">☁️ שמור ציון לענן</button>
                    </div>
                </div>
            </div>

            <div style="background:#fff;padding:20px;border:1px solid var(--accent);border-radius:10px;margin-bottom:20px;"><label>שם תלמיד:</label><input type="text" id="studentNameField" value="${studentName}" style="width:100%;padding:10px;" readonly></div>
            ${globalInstructionsHTML}
            
            ${cloudSaveArea}

            <div class="tabs">${tabsHTML}</div>
            <form id="examForm">${sectionsHTML}</form>
            
            <div style="text-align:center;margin-top:50px;border-top:1px solid #eee;padding-top:20px;">
                <div class="student-submit-area"><br><button onclick="submitExam()" style="background:#27ae60;color:white;padding:15px 30px;font-size:1.2em;border:none;border-radius:30px;font-weight:bold;">הגש בחינה סופית</button></div>
            </div>
        </div>
        <script>
        let totalTime=${duration}*60,timerInterval,examStarted=false;
        function simpleHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h<<5)-h+s.charCodeAt(i)|0;return h.toString();}
        window.onload = function() {
            if(document.body.dataset.status === 'submitted') {
                document.getElementById('startScreen').style.display='none';
                document.getElementById('mainContainer').style.filter='none';
                document.getElementById('timerBadge').style.display='none';
                document.getElementById('successModal').style.display='flex';
                document.querySelectorAll('input,textarea').forEach(e=>{
                    if(!e.classList.contains('grade-input') && !e.classList.contains('teacher-comment') && e.id !== 'teacherCodeInput') {
                        e.setAttribute('readonly','true'); e.disabled = true;
                    }
                });
                document.querySelector('.student-submit-area').style.display='none';
                document.querySelectorAll('.mic-btn').forEach(btn => btn.style.display='none');
            }
        };
        
        let recognition = null;
        let activeMicBtn = null;
        let activeTextareaId = null;

        function initSpeechRecognition() {
            window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!window.SpeechRecognition) {
                alert("הדפדפן שלך אינו תומך בהקלדה קולית. אנא השתמש בדפדפן Google Chrome.");
                return null;
            }
            const rec = new SpeechRecognition();
            rec.lang = 'he-IL';
            rec.continuous = true;
            rec.interimResults = false;
            
            rec.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                const textarea = document.getElementById(activeTextareaId);
                if (textarea && finalTranscript) {
                    const cursorPos = textarea.selectionStart;
                    const textBefore = textarea.value.substring(0, cursorPos);
                    const textAfter  = textarea.value.substring(cursorPos, textarea.value.length);
                    textarea.value = textBefore + finalTranscript + " " + textAfter;
                    textarea.selectionStart = textarea.selectionEnd = cursorPos + finalTranscript.length + 1;
                    
                    if(typeof saveProgressToCloud === 'function' && document.body.dataset.status !== 'grading') {
                        saveProgressToCloud(false, true);
                    }
                }
            };
            
            rec.onerror = (event) => { console.error("Speech error", event.error); stopVoiceTyping(); };
            rec.onend = () => { stopVoiceTyping(); };
            return rec;
        }

        function toggleVoiceTyping(textareaId, btnEl) {
            if(document.body.dataset.status === 'submitted' || document.body.dataset.status === 'grading') return;

            if (activeMicBtn === btnEl) {
                stopVoiceTyping();
                return;
            }
            if (recognition) {
                stopVoiceTyping();
            }
            
            activeTextareaId = textareaId;
            activeMicBtn = btnEl;
            btnEl.classList.add('recording');
            btnEl.innerText = "🔴";

            if (!recognition) recognition = initSpeechRecognition();
            if (recognition) {
                try { recognition.start(); } catch(e) { console.error(e); }
            } else {
                btnEl.classList.remove('recording');
                btnEl.innerText = "🎤";
            }
        }

        function stopVoiceTyping() {
            if (recognition) {
                try { recognition.stop(); } catch(e){}
            }
            if (activeMicBtn) {
                activeMicBtn.classList.remove('recording');
                activeMicBtn.innerText = "🎤";
            }
            activeMicBtn = null;
            activeTextareaId = null;
        }

        let audioCtx = null, isPlayingSound = false, soundLoopTimeout;
        function toggleSoundCheck() {
            const btn = document.getElementById('soundCheckBtn');
            if (isPlayingSound) {
                if(audioCtx) audioCtx.close().then(() => { audioCtx = null; });
                clearTimeout(soundLoopTimeout);
                btn.innerHTML = '<span>▶️ נגן צליל בדיקה</span>'; btn.classList.remove('playing');
            } else {
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const playNote = (freq, time, dur) => {
                    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
                    osc.frequency.value = freq; osc.type = 'sine'; osc.connect(gain); gain.connect(audioCtx.destination);
                    osc.start(time); gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.3, time + 0.05); gain.gain.exponentialRampToValueAtTime(0.001, time + dur); osc.stop(time + dur);
                };
                const loop = () => {
                    const now = audioCtx.currentTime;
                    playNote(440, now, 0.4); playNote(554.37, now + 0.2, 0.4); playNote(659.25, now + 0.4, 0.6); 
                    soundLoopTimeout = setTimeout(() => { if(isPlayingSound) loop(); }, 1200);
                };
                loop();
                btn.innerHTML = '<span>⏹️ עצור צליל</span>'; btn.classList.add('playing');
            }
            isPlayingSound = !isPlayingSound;
        }
        function startExamTimer(){
            if(isPlayingSound) toggleSoundCheck(); 
            document.documentElement.requestFullscreen().catch(e=>console.log(e));
            document.getElementById('startScreen').style.display='none';
            document.getElementById('mainContainer').style.filter='none';
            document.getElementById('timerBadge').style.display='block';
            document.getElementById('highlighterTool').style.display='flex';
            examStarted=true; runTimer(); updateTimer();
            
            setInterval(() => {
                if(examStarted && document.body.dataset.status !== 'submitted' && document.body.dataset.status !== 'grading') {
                    saveProgressToCloud(false, true);
                }
            }, 40000);
        }
        function runTimer(){clearInterval(timerInterval);timerInterval=setInterval(()=>{totalTime--;updateTimer();if(totalTime<=0){clearInterval(timerInterval);document.getElementById('timesUpModal').style.display='flex';}},1000);}
        function updateTimer(){let m=Math.floor(totalTime/60),s=totalTime%60;document.getElementById('timerText').innerText=(m<10?'0'+m:m)+':'+(s<10?'0'+s:s);}
        function showPart(id){document.querySelectorAll('.exam-section').forEach(e=>e.classList.remove('active'));document.getElementById('part-'+id).classList.add('active');document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');}
        function calcTotal(){ let t=0; document.querySelectorAll('.grade-input').forEach(i=>{ if(i.value) t += parseFloat(i.value); }); const display = document.getElementById('teacherCalculatedScore'); if(display) display.innerText = t; }
        
        async function saveProgressToCloud(isSubmit = false, isAutoSave = false) {
            const btn = document.getElementById('btnCloudSave');
            if(btn && !isSubmit) { 
                btn.innerText = isAutoSave ? "☁️ גיבוי אוטומטי..." : "⏳ שומר נתונים לענן..."; 
                btn.disabled = true; 
            }

            const answers = {};
            document.querySelectorAll('.student-ans').forEach(el => answers[el.id] = el.value);

            const studentID = localStorage.getItem('studentID') || document.getElementById('studentNameField').value || 'unknown_student';
            const examID = localStorage.getItem('activeExamID') || 'unknown_exam';
            const studentName = localStorage.getItem('studentName') || document.getElementById('studentNameField').value || 'תלמיד';

            const payload = {
                studentID: studentID,
                studentName: studentName,
                examID: examID,
                examTitle: "${examTitle}",
                answers: answers,
                status: isSubmit ? 'submitted' : 'in-progress',
                lastUpdate: Date.now()
            };

            try {
                const module = await import('./js/supabase-service.js');
                await module.CloudService.saveSubmission(payload);
                if(btn && !isSubmit) {
                    btn.innerText = "✅ נשמר בהצלחה";
                    btn.style.background = "#27ae60";
                    setTimeout(() => { btn.innerText = "💾 שמירה יזומה לענן"; btn.style.background = "#3498db"; btn.disabled = false; }, 2000);
                }
            } catch (err) {
                console.error(err);
                if(btn && !isSubmit) { btn.innerText = "❌ שגיאה בשמירה"; btn.disabled = false; }
            }
        }

        async function saveGradingToCloud() {
            const studentID = localStorage.getItem('grading_studentID') || document.getElementById('studentNameField').value;
            const examID = localStorage.getItem('grading_examID') || 'unknown_exam';
            const finalScore = document.getElementById('teacherCalculatedScore').innerText;
            
            const teacherGrades = {};
            document.querySelectorAll('.grade-input').forEach(el => teacherGrades[el.id] = el.value);
            const teacherComments = {};
            document.querySelectorAll('.teacher-comment').forEach(el => teacherComments[el.id] = el.value);

            try {
                const module = await import('./js/supabase-service.js');
                const subId = studentID + '_' + examID;
                const existing = await module.CloudService.getSubmission(subId) || {};
                await module.CloudService.saveSubmission({
                    ...existing,
                    studentID,
                    examID,
                    grade: finalScore,
                    teacherGrades,
                    teacherComments,
                    status: 'graded',
                    lastUpdate: Date.now()
                });
                alert('הציון וההערות נשמרו במאגר הענן בהצלחה!');
            } catch(e) {
                alert('שגיאה בשמירת הבדיקה: ' + e.message);
            }
        }

        async function submitExam() {
            document.body.dataset.status='submitted';
            if(document.fullscreenElement) document.exitFullscreen();
            clearInterval(timerInterval); document.getElementById('timerBadge').style.display='none';
            document.getElementById('highlighterTool').style.display='none';
            stopVoiceTyping();
            
            document.querySelectorAll('input,textarea').forEach(e=>{
                e.setAttribute('value',e.value); 
                if(!e.classList.contains('grade-input')&&!e.classList.contains('teacher-comment')) { 
                    e.setAttribute('readonly','true'); e.disabled=true; 
                } 
            });
            document.querySelectorAll('textarea').forEach(t=>t.innerHTML=t.value);
            document.querySelectorAll('.mic-btn').forEach(btn => btn.style.display='none');
            
            await saveProgressToCloud(true);
            document.getElementById('successModal').style.display='flex';
        }

        function enableGradingFromModal() { if(simpleHash(prompt('הכנס קוד מורה:'))==="${unlockCodeHash}") { document.getElementById('successModal').style.display='none'; enableGradingUI(); } else { alert('קוד שגוי'); } }
        function enableGrading() { 
             if(simpleHash(prompt('Code?'))==="${unlockCodeHash}") { enableGradingUI(); }
        }
        function enableGradingUI() {
            clearInterval(timerInterval);
            const badge = document.getElementById('timerBadge');
            if(badge) badge.style.display = 'none';
            
            const startScrn = document.getElementById('startScreen');
            if(startScrn) startScrn.style.display = 'none';
            
            const mainCont = document.getElementById('mainContainer');
            if(mainCont) mainCont.style.filter = 'none';
            
            stopVoiceTyping();
            document.querySelectorAll('.mic-btn').forEach(btn => btn.style.display='none');

            document.querySelector('.teacher-controls').style.display='block';
            document.querySelectorAll('.grading-area').forEach(e=>e.style.display='block');
            document.querySelectorAll('.grade-input, .teacher-comment').forEach(e=>e.disabled=false);
            document.querySelectorAll('.model-answer-secret').forEach(e=>e.style.display='block');
            document.querySelector('.student-submit-area').style.display='none';
            document.body.dataset.status = 'grading';
            document.querySelectorAll('.exam-section').forEach(e=>e.style.display='block');
            document.querySelector('.tabs').style.display='none';
        }
        function exportToDoc() {
            const studentName = document.getElementById('studentNameField').value || 'תלמיד';
            const finalScore = document.getElementById('teacherCalculatedScore').innerText || '0';
            let content = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
            content += '<head><meta charset="utf-8"><title>מבחן בדוק</title><style>body{font-family: Arial, sans-serif; direction: rtl;} table{width:100%; border-collapse: collapse;} td, th{border: 1px solid #999; padding: 10px;} .q-box{border: 1px solid #ccc; padding: 10px; margin-bottom: 20px;} .teacher-feedback{background: #f0f8ff; padding: 5px; margin-top: 5px; border: 1px solid #3498db;}</style></head><body>';
            content += '<h1 style="text-align:center;">' + document.querySelector('h1').innerText + '</h1>';
            content += '<h2>שם התלמיד: ' + studentName + '</h2>';
            content += '<h3>ציון סופי: <span style="color:red">' + finalScore + '</span></h3><hr>';
            document.querySelectorAll('.q-block, .sub-question-block').forEach((block, idx) => {
                const isSub = block.classList.contains('sub-question-block');
                const textDiv = block.querySelector('.q-content') || block.querySelector('.sub-q-text');
                const ansArea = block.querySelector('.student-ans');
                const gradeInp = block.querySelector('.grade-input');
                const commentInp = block.querySelector('.teacher-comment');
                content += '<div class="q-box"><p><strong>' + (isSub ? 'סעיף' : 'שאלה') + ':</strong> ' + (textDiv ? textDiv.innerText : 'שאלה '+(idx+1)) + '</p>';
                content += '<p><strong>תשובת התלמיד:</strong><br>' + (ansArea ? ansArea.value.replace(/\\n/g, '<br>') : '(אין תשובה)') + '</p>';
                if((gradeInp && gradeInp.value) || (commentInp && commentInp.value)) {
                    content += '<div class="teacher-feedback"><p><strong>ציון:</strong> ' + (gradeInp?gradeInp.value:'0') + '</p>';
                    if(commentInp && commentInp.value) content += '<p><strong>הערת המורה:</strong> ' + commentInp.value + '</p>';
                    content += '</div>';
                }
                content += '</div>';
            });
            content += '</body></html>';
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob(['\\ufeff', content], { type: 'application/msword' }));
            link.download = 'בדוק-' + studentName + '.doc'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        }
        
        let markerColor = null;
        function setMarker(color, btn) {
            markerColor = color;
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            if(color && color !== 'transparent') {
                const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="' + color + '" stroke="black" stroke-width="1" d="M28.06 6.94L25.06 3.94a2.003 2.003 0 0 0-2.83 0l-16.17 16.17a2.003 2.003 0 0 0-.58 1.41V26h4.48c.53 0 1.04-.21 1.41-.59l16.17-16.17c.79-.78.79-2.05.52-2.3zM8.5 24H7v-1.5l14.5-14.5 1.5 1.5L8.5 24z"/><path fill="' + color + '" d="M4 28l4-4H4z"/></svg>';
                document.body.style.cursor = "url('data:image/svg+xml;base64," + btoa(svg) + "') 0 32, auto";
            } else { document.body.style.cursor = color === 'transparent' ? 'crosshair' : 'default'; }
        }
        document.addEventListener('mouseup', () => {
            if (!markerColor) return;
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && !sel.isCollapsed) {
                const range = sel.getRangeAt(0), common = range.commonAncestorContainer;
                if(common.nodeType === 1 && (common.tagName === 'TEXTAREA' || common.tagName === 'INPUT')) return;
                if(common.nodeType === 3 && (common.parentNode.tagName === 'TEXTAREA' || common.parentNode.tagName === 'INPUT')) return;
                const savedRange = range.cloneRange();
                document.designMode = "on"; sel.removeAllRanges(); sel.addRange(savedRange);
                if(document.queryCommandEnabled("hiliteColor")) { document.execCommand("styleWithCSS", false, true); document.execCommand("hiliteColor", false, markerColor); }
                document.designMode = "off"; sel.removeAllRanges();
            }
        });
        const tool = document.getElementById('highlighterTool'), handle = document.getElementById('hlDragHandle');
        let isDragging = false, startX, startY, initialLeft, initialTop;
        handle.onmousedown = function(e) { e.preventDefault(); isDragging=true; startX=e.clientX; startY=e.clientY; initialLeft=tool.offsetLeft; initialTop=tool.offsetTop; document.onmouseup = function(){isDragging=false; document.onmouseup=null; document.onmousemove=null;}; document.onmousemove = function(e){if(!isDragging)return; tool.style.top=(initialTop+e.clientY-startY)+"px"; tool.style.left=(initialLeft+e.clientX-startX)+"px"; tool.style.right='auto';}; };
        function lockExam(){ clearInterval(timerInterval); stopVoiceTyping(); document.getElementById('securityModal').style.display='flex'; }
        function checkSec(){ if(!examStarted||document.body.dataset.status==='submitted'||document.body.dataset.status==='grading')return; if(document.hidden)lockExam(); }
        document.addEventListener('visibilitychange',checkSec);
        document.addEventListener('fullscreenchange', () => { if(!document.fullscreenElement && examStarted && document.body.dataset.status!=='submitted' && document.body.dataset.status!=='grading') lockExam(); });
        function unlockExam(){ if(simpleHash(document.getElementById('teacherCodeInput').value)==="${unlockCodeHash}"){ document.getElementById('securityModal').style.display='none'; document.documentElement.requestFullscreen().catch(e=>console.log(e)); runTimer(); } else { alert('קוד שגוי'); } }
        function showExtensionInput() { document.getElementById('timesUpActions').style.display = 'none'; document.getElementById('extensionPanel').style.display = 'block'; }
        function cancelExtension() { document.getElementById('timesUpActions').style.display = 'block'; document.getElementById('extensionPanel').style.display = 'none'; document.getElementById('extTeacherCode').value = ''; }
        function addTime() { if (simpleHash(document.getElementById('extTeacherCode').value) === "${unlockCodeHash}") { const m = parseInt(document.getElementById('extTimeAmount').value)||0; if (m > 0) { totalTime = m * 60; document.getElementById('timesUpModal').style.display = 'none'; document.getElementById('timesUpActions').style.display = 'block'; document.getElementById('extensionPanel').style.display = 'none'; document.getElementById('extTeacherCode').value = ''; runTimer(); } else alert('הזן דקות'); } else alert('קוד שגוי'); }
        <\/script></body></html>`;
    }
};
