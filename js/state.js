const ExamState = {
    questions: [],
    parts: [
        { id: 'A', name: 'חלק ראשון' }
    ],
    currentTab: 'A',
    studentName: '',
    examTitle: 'מבחן בגרות', 
    logoData: null,
    solutionDataUrl: null,
    instructions: {
        general: '',
        parts: {} 
    },
    theme: {
        background: '#f4f6f8',
        header: '#2c3e50'
    },
    partNamesList: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שביעי", "שמיני", "תשיעי", "עשירי"],
    subLabels: ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"],
    tempSubQuestions: [],
    
    addQuestion: function(q) { 
        this.questions.push(q); 
    },
    
    removeQuestion: function(id) { 
        this.questions = this.questions.filter(q => q.id !== id); 
    },
    
    addPart: function(part) { 
        this.parts.push(part); 
    },
    
    removePart: function(id) {
        this.questions = this.questions.filter(q => q.part !== id);
        this.parts = this.parts.filter(p => p.id !== id);
        delete this.instructions.parts[id];
    },
    
    updatePartName: function(id, name) {
        const p = this.parts.find(p => p.id === id);
        if (p) p.name = name;
    },
    
    getNextPartId: function() {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = 0; i < letters.length; i++) {
            if (!this.parts.find(p => p.id === letters[i])) return letters[i];
        }
        return 'P' + Date.now();
    }
};
