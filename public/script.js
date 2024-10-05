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

    newNoteBtn.addEventListener('click', () => {
        showNoteEditor();
    });

    saveNoteBtn.addEventListener('click', () => {
        saveNote();
    });

    cancelEditBtn.addEventListener('click', () => {
        hideNoteEditor();
    });

    async function loadNotes() {
        try {
            const response = await fetch('/api/notes');
            if (response.ok) {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    notes = await response.json();
                    renderNotes();
                } else {
                    console.error('Received non-JSON response:', await response.text());
                    throw new Error('Received non-JSON response from server');
                }
            } else {
                console.error('Server responded with status:', response.status);
                throw new Error('Failed to load notes: ' + response.statusText);
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
            // 可以在这里添加用户友好的错误提示
            alert('加载笔记失败，请稍后再试。');
        }
    }

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

    loadNotes();
});