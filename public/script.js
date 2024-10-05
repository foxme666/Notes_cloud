let notes = [];
let editingNoteId = null;
let currentPage = 1;
const pageSize = 10;
let paginationContainer;
let notesList;
let noteEditorOverlay;
let notesListEventListener;

document.addEventListener('DOMContentLoaded', () => {
    noteEditorOverlay = document.getElementById('noteEditorOverlay');
    const newNoteBtn = document.getElementById('newNote');
    const saveNoteBtn = document.getElementById('saveNote');
    const cancelEditBtn = document.getElementById('cancelEdit');
    notesList = document.getElementById('notesList');

    // 初始化 paginationContainer
    paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination';
        document.querySelector('.container').appendChild(paginationContainer);
    }

    newNoteBtn.addEventListener('click', () => showNoteEditor());
    saveNoteBtn.addEventListener('click', saveNote);
    cancelEditBtn.addEventListener('click', hideNoteEditor);

    // 确保编辑框初始状态为隐藏
    if (noteEditorOverlay) {
        noteEditorOverlay.style.display = 'none';
    }

    loadNotes();
});

function showNoteEditor(note = null) {
    if (noteEditorOverlay) {
        document.getElementById('noteTitle').value = note ? note.title : '';
        document.getElementById('noteContent').value = note ? note.content : '';
        editingNoteId = note ? note.id : null;
        noteEditorOverlay.style.display = 'flex';
        noteEditorOverlay.style.opacity = '1';
        noteEditorOverlay.style.visibility = 'visible';
    } else {
        console.error('Note editor overlay not found');
    }
}

function hideNoteEditor() {
    if (noteEditorOverlay) {
        noteEditorOverlay.style.display = 'none';
        noteEditorOverlay.style.opacity = '0';
        noteEditorOverlay.style.visibility = 'hidden';
        setTimeout(() => {
            editingNoteId = null;
        }, 300);
    }
}

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
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
    if (notesList) {
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

        // 确保元素可见
        notesList.style.opacity = '1';

        // 移除旧的事件监听器
        if (notesListEventListener) {
            notesList.removeEventListener('click', notesListEventListener);
        }

        // 添加新的事件监听器
        notesListEventListener = (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const noteId = parseInt(e.target.getAttribute('data-id'));
                const noteToEdit = notes.find(note => note.id === noteId);
                if (noteToEdit) showNoteEditor(noteToEdit);
            } else if (e.target.classList.contains('delete-btn')) {
                const noteId = parseInt(e.target.getAttribute('data-id'));
                deleteNote(noteId);
            }
        };
        notesList.addEventListener('click', notesListEventListener);
    }
}

async function deleteNote(id) {
    try {
        console.log(`Attempting to delete note with id: ${id}`);
        const response = await fetch('/api/notes', {
            method: 'POST', // 继续使用 POST 方法
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id })
        });
        console.log('Delete response:', response);
        if (response.ok) {
            showNotification('笔记删除成功', 'success');
            loadNotes(currentPage);
        } else {
            const errorData = await response.json();
            console.error('Delete error:', errorData);
            throw new Error(errorData.error || 'Failed to delete note');
        }
    } catch (error) {
        console.error('Failed to delete note:', error);
        showNotification('删除笔记失败，请稍后再试。', 'error');
    }
}

function renderPagination(totalPages, currentPage) {
    if (!paginationContainer) {
        console.error('Pagination container not found');
        return;
    }

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let paginationHTML = '';

    if (currentPage > 1) {
        paginationHTML += `<button class="page-btn" data-page="${currentPage - 1}">上一页</button>`;
    }

    if (startPage > 1) {
        paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHTML += '<span class="page-ellipsis">...</span>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += '<span class="page-ellipsis">...</span>';
        }
        paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHTML += `<button class="page-btn" data-page="${currentPage + 1}">下一页</button>`;
    }

    paginationContainer.innerHTML = paginationHTML;

    paginationContainer.removeEventListener('click', handlePaginationClick);
    paginationContainer.addEventListener('click', handlePaginationClick);
}

function handlePaginationClick(e) {
    if (e.target.classList.contains('page-btn')) {
        const newPage = parseInt(e.target.dataset.page);
        if (newPage !== currentPage) {
            currentPage = newPage;
            loadNotes(currentPage);
        }
    }
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

async function loadNotes(page = 1) {
    try {
        console.log(`Loading notes for page ${page}`);
        
        const response = await fetch(`/api/notes?page=${page}&pageSize=${pageSize}`);
        if (response.ok) {
            const data = await response.json();
            notes = data.notes;
            
            renderNotes();
            renderPagination(data.totalPages, page);
            
            // 确保元素可见
            if (notesList) {
                notesList.style.opacity = '1';
            }
            if (paginationContainer) {
                paginationContainer.style.opacity = '1';
            }
        } else {
            const errorText = await response.text();
            throw new Error('Failed to load notes: ' + response.statusText);
        }
    } catch (error) {
        console.error('Failed to load notes:', error);
        showNotification('加载笔记失败，请稍后再试。', 'error');
    }
}