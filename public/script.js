const noteEditorOverlay = document.getElementById('noteEditorOverlay');

let notes = [];
let editingNoteId = null;
let currentPage = 1;
const pageSize = 10; // 更新为10

document.addEventListener('DOMContentLoaded', () => {
    noteEditorOverlay = document.getElementById('noteEditorOverlay');
    const newNoteBtn = document.getElementById('newNote');
    const saveNoteBtn = document.getElementById('saveNote');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const notesList = document.getElementById('notesList');
    const noteEditor = document.getElementById('noteEditor');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination';
    document.querySelector('.container').appendChild(paginationContainer);

    newNoteBtn.addEventListener('click', () => {
        showNoteEditor();
    });

    saveNoteBtn.addEventListener('click', () => {
        saveNote();
    });

    cancelEditBtn.addEventListener('click', () => {
        hideNoteEditor();
    });

    async function loadNotes(page = 1) {
        try {
            const response = await fetch(`/api/notes?page=${page}&pageSize=${pageSize}`);
            if (response.ok) {
                const data = await response.json();
                notes = data.notes;
                renderNotes();
                renderPagination(data.totalPages, page);
            } else {
                throw new Error('Failed to load notes: ' + response.statusText);
            }
        } catch (error) {
            console.error('Failed to load notes:', error);
            showNotification('加载笔记失败，请稍后再试。', 'error');
        }
    }

    function showNoteEditor(note = null) {
        noteEditorOverlay.classList.remove('hidden');
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
        noteEditorOverlay.classList.add('hidden');
        editingNoteId = null;
    }

    async function saveNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        if (!title) {
            showNotification('标题不能为空', 'error');
            return;
        }
        if (!content) {
            showNotification('内容不能为空', 'error');
            return;
        }
        try {
            const note = {
                id: editingNoteId || Date.now(),
                title,
                content,
                date: new Date().toLocaleString('zh-CN')
            };
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(note),
            });
            if (response.ok) {
                showNotification(editingNoteId ? '笔记更新成功' : '笔记保存成功', 'success');
                hideNoteEditor();
                loadNotes(currentPage);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save note');
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            showNotification('保存笔记失败，请稍后再试。', 'error');
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

    async function deleteNote(id) {
        try {
            const response = await fetch(`/api/notes/${id}`, { 
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                showNotification('笔记删除成功', 'success');
                loadNotes(currentPage);
            } else {
                throw new Error('Failed to delete note');
            }
        } catch (error) {
            console.error('Failed to delete note:', error);
            showNotification('删除笔记失败，请稍后再试。', 'error');
        }
    }

    function renderPagination(totalPages, currentPage) {
        paginationContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.add('page-btn');
            if (i === currentPage) {
                pageBtn.classList.add('active');
            }
            pageBtn.addEventListener('click', () => loadNotes(i));
            paginationContainer.appendChild(pageBtn);
        }
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.classList.add('notification', type);
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }, 100);
    }

    loadNotes();
});