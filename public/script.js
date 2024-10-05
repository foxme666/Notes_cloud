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

    // 其他函数保持不变

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