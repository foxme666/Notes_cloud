let notes = [];
let editingNoteId = null;
let currentPage = 1;
const pageSize = 9; // 改为 9，适合 3x3 网格布局
let deleteTargetId = null;

// DOM 元素
const elements = {
    notesList: null,
    paginationContainer: null,
    noteEditorOverlay: null,
    confirmModalOverlay: null,
    noteTitle: null,
    noteContent: null,
    editorTitle: null
};

document.addEventListener('DOMContentLoaded', () => {
    // 初始化元素引用
    elements.notesList = document.getElementById('notesList');
    elements.paginationContainer = document.getElementById('pagination');
    elements.noteEditorOverlay = document.getElementById('noteEditorOverlay');
    elements.confirmModalOverlay = document.getElementById('confirmModalOverlay');
    elements.noteTitle = document.getElementById('noteTitle');
    elements.noteContent = document.getElementById('noteContent');
    elements.editorTitle = document.getElementById('editorTitle');

    // 绑定事件
    document.getElementById('newNote').addEventListener('click', () => showNoteEditor());
    document.getElementById('mobileFab').addEventListener('click', () => showNoteEditor());
    document.getElementById('saveNote').addEventListener('click', saveNote);
    document.getElementById('cancelEdit').addEventListener('click', hideNoteEditor);
    document.getElementById('confirmDelete').addEventListener('click', () => {
        if (deleteTargetId) {
            executeDelete(deleteTargetId);
        }
    });
    document.getElementById('cancelDelete').addEventListener('click', hideConfirmModal);

    // 点击遮罩层关闭
    elements.noteEditorOverlay.addEventListener('click', (e) => {
        if (e.target === elements.noteEditorOverlay) hideNoteEditor();
    });
    elements.confirmModalOverlay.addEventListener('click', (e) => {
        if (e.target === elements.confirmModalOverlay) hideConfirmModal();
    });

    loadNotes(currentPage);
});

// 编辑器逻辑
function showNoteEditor(note = null) {
    editingNoteId = note ? note.id : null;
    elements.editorTitle.textContent = note ? '编辑笔记' : '新建笔记';
    elements.noteTitle.value = note ? note.title : '';
    elements.noteContent.value = note ? note.content : '';

    elements.noteEditorOverlay.style.display = 'flex';
    setTimeout(() => {
        elements.noteEditorOverlay.style.opacity = '1';
    }, 10);
    document.body.style.overflow = 'hidden';
    elements.noteTitle.focus();
}

function hideNoteEditor() {
    elements.noteEditorOverlay.style.opacity = '0';
    document.body.style.overflow = '';
    setTimeout(() => {
        elements.noteEditorOverlay.style.display = 'none';
        editingNoteId = null;
    }, 300);
}

// 确认删除逻辑
function showConfirmModal(id) {
    deleteTargetId = id;
    elements.confirmModalOverlay.style.display = 'flex';
    setTimeout(() => {
        elements.confirmModalOverlay.style.opacity = '1';
    }, 10);
}

function hideConfirmModal() {
    elements.confirmModalOverlay.style.opacity = '0';
    setTimeout(() => {
        elements.confirmModalOverlay.style.display = 'none';
        deleteTargetId = null;
    }, 200);
}

async function saveNote() {
    const title = elements.noteTitle.value.trim();
    const content = elements.noteContent.value.trim();

    if (!title) {
        showNotification('请输入标题', 'error');
        elements.noteTitle.focus();
        return;
    }

    const saveBtn = document.getElementById('saveNote');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
        const note = {
            id: editingNoteId || Date.now(),
            title,
            content,
            date: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(note),
        });

        if (response.ok) {
            showNotification(editingNoteId ? '更新成功' : '保存成功', 'success');
            hideNoteEditor();
            loadNotes(currentPage);
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('Save error:', error);
        showNotification('保存失败，请重试', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

async function executeDelete(id) {
    const confirmBtn = document.getElementById('confirmDelete');
    confirmBtn.disabled = true;
    confirmBtn.textContent = '删除中...';

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id: id })
        });

        if (response.ok) {
            showNotification('删除成功', 'success');
            hideConfirmModal();
            // 如果当前页删空了，回到上一页
            if (notes.length === 1 && currentPage > 1) {
                currentPage--;
            }
            loadNotes(currentPage);
        } else {
            throw new Error('删除失败');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('无法删除，请重试', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '允许删除';
    }
}

// 渲染逻辑
function renderNotes() {
    if (!notes || notes.length === 0) {
        elements.notesList.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
                暂无笔记，点击“新建笔记”开启记录之旅吧 ✨
            </div>
        `;
        return;
    }

    elements.notesList.innerHTML = notes.map(note => `
        <div class="note-card" style="animation-delay: ${Math.random() * 0.2}s">
            <div class="note-info">
                <div class="note-title" title="${note.title}">${note.title}</div>
                <div class="note-content-preview">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</div>
                <div class="note-date">${note.date}</div>
            </div>
            <div class="note-actions">
                <button class="secondary" onclick="editNote(${note.id})">编辑</button>
                <button class="danger" onclick="confirmDeleteNote(${note.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// 全局辅助函数（方便 HTML onclick 调用）
window.editNote = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) showNoteEditor(note);
};

window.confirmDeleteNote = (id) => {
    showConfirmModal(id);
};

async function loadNotes(page = 1) {
    try {
        elements.notesList.style.opacity = '0.5';
        const response = await fetch(`/api/notes?page=${page}&pageSize=${pageSize}`);

        if (response.ok) {
            const data = await response.json();
            notes = data.notes;
            currentPage = page;

            renderNotes();
            renderPagination(data.totalPages, page);
        } else {
            throw new Error('加载失败');
        }
    } catch (error) {
        console.error('Load error:', error);
        showNotification('无法加载笔记，请刷新页面', 'error');
    } finally {
        elements.notesList.style.opacity = '1';
    }
}

function renderPagination(totalPages, current) {
    if (totalPages <= 1) {
        elements.paginationContainer.innerHTML = '';
        return;
    }

    let html = '';

    if (current > 1) {
        html += `<button class="page-btn" onclick="loadNotes(${current - 1})">上一页</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
            html += `<button class="page-btn ${i === current ? 'active' : ''}" onclick="loadNotes(${i})">${i}</button>`;
        } else if (i === current - 2 || i === current + 2) {
            html += `<span style="padding: 0 5px">...</span>`;
        }
    }

    if (current < totalPages) {
        html += `<button class="page-btn" onclick="loadNotes(${current + 1})">下一页</button>`;
    }

    elements.paginationContainer.innerHTML = html;
}

function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 强制重绘
    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}