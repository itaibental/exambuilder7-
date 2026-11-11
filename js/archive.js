
import { ArchiveService } from './supabase-service.js';


let archiveList = [];

async function initArchive() {
    try {
        archiveList = await ArchiveService.list();
        renderArchive();
    } catch (error) {
        console.error("Error fetching exams: ", error);
    }
}

function renderArchive() {
    const grid = document.getElementById('examGrid');
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    grid.innerHTML = '';
    const filtered = archiveList.filter(exam => 
        exam.name.toLowerCase().includes(searchTerm) || 
        (exam.year && exam.year.toString().includes(searchTerm))
    );
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; color:#7f8c8d; margin-top:30px;">
            <h3>לא נמצאו מבחנים בארכיון</h3>
            <p>מורה? הכנס למצב ניהול כדי להוסיף מבחנים.</p>
        </div>`;
        return;
    }
    filtered.sort((a, b) => b.year - a.year);
    filtered.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'exam-card';
        card.innerHTML = `
            <div class="exam-year">${exam.year}</div>
            <div class="exam-icon">📄</div>
            <div class="exam-name">${exam.name}</div>
            <div class="exam-date">עודכן: ${new Date(exam.dateAdded).toLocaleDateString()}</div>
        `;
        card.onclick = () => {
            const path = 'exam/' + (exam.fileName || exam.filePath);
            window.open(path, '_blank');
        };
        if (document.getElementById('adminPanel').style.display !== 'none') {
            const delBtn = document.createElement('button');
            delBtn.innerText = '❌';
            delBtn.style.cssText = 'position:absolute; top:10px; left:10px; background:red; border:none; border-radius:50%; width:30px; height:30px; color:white; cursor:pointer; font-size:12px; padding:0;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteExam(exam.id);
            };
            card.appendChild(delBtn);
        }
        grid.appendChild(card);
    });
}

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    const isHidden = panel.style.display === 'none';
    if (isHidden) {
        const pass = prompt('הכנס סיסמת ניהול:');
        if (pass === '1234') { // You should use a more secure authentication method
            panel.style.display = 'block';
            renderArchive();
        } else {
            alert('סיסמה שגויה');
        }
    } else {
        panel.style.display = 'none';
        renderArchive();
    }
}

async function addExamToArchive() {
    const nameInput = document.getElementById('newExamName');
    const yearInput = document.getElementById('newExamYear');
    const fileNameInput = document.getElementById('newExamFileName');
    if (!nameInput.value || !yearInput.value || !fileNameInput.value) {
        alert('נא למלא את כל השדות');
        return;
    }
    const newExam = {
        name: nameInput.value,
        year: parseInt(yearInput.value),
        fileName: fileNameInput.value.trim(),
        filePath: fileNameInput.value.trim(),
        dateAdded: Date.now()
    };
    try {
        await ArchiveService.add(newExam);
        nameInput.value = '';
        yearInput.value = '';
        fileNameInput.value = '';
        document.getElementById('fileHelper').value = '';
        initArchive(); // Refresh the list from the server
        alert(`המבחן נוסף בהצלחה!`);
    } catch (error) {
        console.error("Error adding document: ", error);
        alert('הייתה שגיאה בהוספת המבחן.');
    }
}

async function deleteExam(id) {
    if(confirm('האם למחוק מבחן זה מהרשימה?')) {
        try {
            await ArchiveService.remove(id);
            initArchive(); // Refresh the list
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert('הייתה שגיאה במחיקת המבחן.');
        }
    }
}

async function clearArchive() {
    if(confirm('פעולה זו תמחק את כל הרשימה. האם להמשיך?')) {
        try {
            await ArchiveService.clear();
            initArchive(); // Refresh the list
        } catch (error) {
            console.error('Error clearing archive: ', error);
            alert('הייתה שגיאה בניקוי הארכיון.');
        }
    }
}

// הפונקציות נקראות מ-onclick בקובץ ה-HTML, ולכן חייבות להיות גלובליות (הקובץ הוא module)
Object.assign(window, { toggleAdminPanel, addExamToArchive, clearArchive, renderArchive, deleteExam });
initArchive();
