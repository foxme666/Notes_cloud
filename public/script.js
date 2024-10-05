let notes = [];
let editingNoteId = null;
let currentPage = 1;
const pageSize = 10;

document.addEventListener('DOMContentLoaded', () => {
    const noteEditorOverlay = document.getElementById('noteEditorOverlay');
    const newNoteBtn = document.getElementById('newNote');
    const saveNoteBtn = document.getElementById('saveNote');
    const cancelEditBtn = document.getElementById('cancelEdit');
    const notesList = document.getElementById('notesList');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination';
    document.querySelector('.container').appendChild(paginationContainer);

    newNoteBtn.addEventListener('click', () => showNoteEditor());
    saveNoteBtn.addEventListener('click', saveNote);
    cancelEditBtn.addEventListener('click', hideNoteEditor);

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
        noteEditorOverlay.style.display = 'flex';
        noteTitleInput.value = note ? note.title : '';
        noteContentInput.value = note ? note.content : '';
        editingNoteId = note ? note.id : null;
    }

    function hideNoteEditor() {
        noteEditorOverlay.style.display = 'none';
        editingNoteId = null;
    }

    async function saveNote() {
        const title = noteTitleInput.value.trim();
        const content = noteContentInput.value.trim();
        if (!title || !content) {
            showNotification(title ? '内容不能为空' : '标题不能为空', 'error');
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note),
            });
            if (response.ok) {
                showNotification(editingNoteId ? '笔记更新成功' : '笔记保存成功', 'success');
                hideNoteEditor();
                loadNotes(currentPage);
            } else {
                throw new Error('Failed to save note');
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            showNotification('保存笔记失败，请稍后再试。', 'error');
        }
    }

    function renderNotes() {
        notesList.innerHTML = notes.map(note => `
            <div class="note-card">
                <div class="note-info">
                    <div class="note-title">${note.title}</div>
                    <div class="note-date">${note.date}</div>
                </div>
                <div class="note-actions">
                    <button class="edit-btn" data-id="${note.id}">编辑</button>
                    <button class="delete-btn" data-id="${note.id}">删除</button>
                </div>
            </div>
        `).join('');

        notesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const noteId = parseInt(e.target.getAttribute('data-id'));
                const noteToEdit = notes.find(note => note.id === noteId);
                if (noteToEdit) showNoteEditor(noteToEdit);
            } else if (e.target.classList.contains('delete-btn')) {
                const noteId = parseInt(e.target.getAttribute('data-id'));
                deleteNote(noteId);
            }
        });
    }

    async function deleteNote(id) {
        try {
            const response = await fetch(`/api/notes/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                showNotification('笔记删除成功', 'success');
                loadNotes(currentPage);
            } else {
                console.log(response);
                throw new Error('Failed to delete note');
            }
        } catch (error) {
            console.error('Failed to delete note:', error);
            showNotification('删除笔记失败，请稍后再试。', 'error');
        }
    }

    function renderPagination(totalPages, currentPage) {
        paginationContainer.innerHTML = Array.from({length: totalPages}, (_, i) => i + 1)
            .map(i => `<button class="page-btn ${i === currentPage ? 'active' : ''}">${i}</button>`)
            .join('');
        paginationContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-btn')) {
                loadNotes(parseInt(e.target.textContent));
            }
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    loadNotes();
});