let notes = [];
let editingNoteId = null;

document.addEventListener('DOMContentLoaded', () => {
    const newNoteBtn = document.getElementById('newNote');
    const saveNoteBtn = document.getElementById('saveNote');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const notesList = document.getElementById('notesList');
    const noteEditor = document.getElementById('noteEditor');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');

    // 从API加载笔记
    async function loadNotes() {
        try {
            const response = await fetch('/api/notes');
            if (response.ok) {
                notes = await response.json();
                renderNotes();
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
        }
    }

    // ... 其他函数保持不变 ...

    function saveNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        if (title && content) {
            if (editingNoteId) {
                // 编辑现有笔记
                const index = notes.findIndex(note => note.id === editingNoteId);
                if (index !== -1) {
                    notes[index] = {
                        ...notes[index],
                        title,
                        content,
                        date: new Date().toLocaleString('zh-CN')
                    };
                }
            } else {
                // 创建新笔记
                const note = {
                    id: Date.now(),
                    title,
                    content,
                    date: new Date().toLocaleString('zh-CN')
                };
                notes.push(note);
            }
            saveNotes();
            renderNotes();
            hideNoteEditor();
        }
    }

    async function saveNotes() {
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notes),
            });
            if (!response.ok) {
                throw new Error('Failed to save notes');
            }
        } catch (error) {
            console.error('Failed to save notes:', error);
        }
    }

    // 初始渲染笔记列表
    loadNotes();
});