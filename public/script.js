let notes = [];
let editingNoteId = null;
let currentPage = 1;
const pageSize = 10;
let paginationContainer;
let notesList;
let noteEditorOverlay;

document.addEventListener('DOMContentLoaded', () => {
    noteEditorOverlay = document.getElementById('noteEditorOverlay');
    const newNoteBtn = document.getElementById('newNote');
    const saveNoteBtn = document.getElementById('saveNote');
    const cancelEditBtn = document.getElementById('cancelEdit');
    notesList = document.getElementById('notesList');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');

    paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination';
    document.querySelector('.container').appendChild(paginationContainer);

    newNoteBtn.addEventListener('click', () => showNoteEditor());
    saveNoteBtn.addEventListener('click', saveNote);
    cancelEditBtn.addEventListener('click', hideNoteEditor);

    // 确保编辑框初始状态为隐藏
    if (noteEditorOverlay) {
        noteEditorOverlay.classList.add('hidden');
    }

    if (notesList) {
        notesList.style.opacity = '0';  // 初始化为透明
    }

    loadNotes();
});

function showNoteEditor(note = null) {
    const noteEditorOverlay = document.getElementById('noteEditorOverlay');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');

    noteTitleInput.value = note ? note.title : '';
    noteContentInput.value = note ? note.content : '';
    editingNoteId = note ? note.id : null;

    noteEditorOverlay.classList.add('show');
}

function hideNoteEditor() {
    const noteEditorOverlay = document.getElementById('noteEditorOverlay');
    noteEditorOverlay.classList.remove('show');
    setTimeout(() => {
        editingNoteId = null;
    }, 300); // 等待动画完成
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
        console.log(`Attempting to delete note with id: ${id}`);
        const response = await fetch('/api/notes', {
            method: 'POST',
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
        
        // 添加淡出效果
        if (notesList) {
            notesList.classList.add('fade-out');
        }
        if (paginationContainer) {
            paginationContainer.classList.add('fade-out');
        }
        
        const response = await fetch(`/api/notes?page=${page}&pageSize=${pageSize}`);
        console.log('Response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Received data:', data);
            notes = data.notes;
            
            // 使用 setTimeout 来确保淡出动画完成后再更新内容
            setTimeout(() => {
                renderNotes();
                renderPagination(data.totalPages, page);
                
                // 添加淡入效果
                if (notesList) {
                    notesList.classList.remove('fade-out');
                    notesList.classList.add('fade-in');
                }
                if (paginationContainer) {
                    paginationContainer.classList.remove('fade-out');
                    paginationContainer.classList.add('fade-in');
                }
                
                // 移除 fade-in 类，为下一次动画做准备
                setTimeout(() => {
                    if (notesList) {
                        notesList.classList.remove('fade-in');
                    }
                    if (paginationContainer) {
                        paginationContainer.classList.remove('fade-in');
                    }
                }, 300);
            }, 300);
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error('Failed to load notes: ' + response.statusText);
        }
    } catch (error) {
        console.error('Failed to load notes:', error);
        showNotification('加载笔记失败，请稍后再试。', 'error');
        
        // 出错时也需要移除 fade-out 类
        if (notesList) {
            notesList.classList.remove('fade-out');
        }
        if (paginationContainer) {
            paginationContainer.classList.remove('fade-out');
        }
    }
}

loadNotes();