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

    // 从本地存储加载笔记
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

    newNoteBtn.addEventListener('click', () => {
        showNoteEditor();
    });

    saveNoteBtn.addEventListener('click', () => {
        saveNote();
    });

    cancelEditBtn.addEventListener('click', () => {
        hideNoteEditor();
    });

    function showNoteEditor(note = null) {
        noteEditor.classList.remove('hidden');
        if (note) {
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            editingNoteId = note.id;
        } else {
            noteTitleInput.value = '';
            noteContentInput.value = '';
            editingNoteId = null;
        }
    }

    function hideNoteEditor() {
        noteEditor.classList.add('hidden');
        editingNoteId = null;
    }

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

    function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.classList.add('note-card');
            noteCard.innerHTML = `
                <div class="note-info">
                    <div class="note-title">${note.title}</div>
                    <div class="note-date">${note.date}</div>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" data-id="${note.id}">编辑</button>
                    <button class="delete-btn" data-id="${note.id}">删除</button>
                </div>
            `;
            notesList.appendChild(noteCard);
        });

        // 添加编辑和删除按钮的事件监听器
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = parseInt(e.target.getAttribute('data-id'));
                const noteToEdit = notes.find(note => note.id === noteId);
                if (noteToEdit) {
                    showNoteEditor(noteToEdit);
                }
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = parseInt(e.target.getAttribute('data-id'));
                deleteNote(noteId);
            });
        });
    }

    function deleteNote(id) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();
        renderNotes();
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