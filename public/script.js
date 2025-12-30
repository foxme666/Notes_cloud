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

// 全局状态
let noteStats = {
    allNotes: [],
    currentPage: 1,
    isLoading: false,
    hasMore: true,
    activeGroup: 'all',
    groups: new Set()
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

    // 监听滚动实现无限加载
    window.addEventListener('scroll', () => {
        if (noteStats.isLoading || !noteStats.hasMore) return;
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
            if (noteStats.activeGroup === 'all') {
                loadNotes(noteStats.currentPage + 1);
            }
        }
    });

    // Filter 点击
    document.getElementById('filterBar').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-chip')) {
            const group = e.target.getAttribute('data-group');
            setActiveGroup(group);
        }
    });

    loadNotes(1);

    if (elements.paginationContainer) elements.paginationContainer.style.display = 'none';
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
            timestamp: Date.now(), // For sorting
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

    // 按日期分组
    const groups = groupNotesByDate(notes);

    let html = '';

    for (const [groupName, groupNotes] of Object.entries(groups)) {
        html += `
            <div class="time-section">
                <h3 class="section-title">${groupName}</h3>
                <div class="section-grid">
                    ${groupNotes.map(note => createNoteCardHTML(note)).join('')}
                </div>
            </div>
        `;
    }

    elements.notesList.innerHTML = html;
}

function groupNotesByDate(notesList) {
    const groups = {}; // JS Object keys 按插入顺序

    // 统一时间参考
    const now = new Date();
    // 设为当天 0点，用于比较日期
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const currentYear = now.getFullYear();

    notesList.forEach(note => {
        const timestamp = getNoteTime(note);
        // 使用 timestamp 来创建一个 Date 对象
        const d = new Date(timestamp);

        let groupKey;
        const noteTime = d.getTime();

        // 比较
        if (noteTime >= todayStart.getTime()) {
            groupKey = '今天';
        } else if (noteTime >= yesterdayStart.getTime()) {
            groupKey = '昨天';
        } else if (d.getFullYear() === currentYear) {
            // 当年：按月分组 (e.g. "11月")
            groupKey = (d.getMonth() + 1) + '月';
        } else {
            // 往年：按年分组 (e.g. "2023年")
            groupKey = d.getFullYear() + '年';
        }

        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(note);
    });
    return groups;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function isSameWeek(d1, d2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((d1 - d2) / oneDay));
    return diffDays < 7;
}

function createNoteCardHTML(note) {
    return `
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
    `;
}

// 全局辅助函数（方便 HTML onclick 调用）
window.editNote = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) showNoteEditor(note);
};


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
            // 重新加载第一页，重置列表
            loadNotes(1);
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
// 渲染逻辑
async function loadNotes(page = 1) {
    if (noteStats.isLoading) return;

    // 如果是第一页，或者是新的过滤，重置状态
    if (page === 1) {
        noteStats.allNotes = [];
        noteStats.groups.clear();
        noteStats.hasMore = true;
        elements.notesList.innerHTML = '';
        renderFilterBar(); // 初始化 Filter Bar
    }

    noteStats.isLoading = true;
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('noMoreNotes').style.display = 'none';

    try {
        console.log(`Loading notes page ${page}`);
        const response = await fetch(`/api/notes?page=${page}&pageSize=${pageSize}`);

        if (response.ok) {
            const data = await response.json();
            const newNotes = data.notes;

            if (newNotes.length < pageSize) {
                noteStats.hasMore = false;
                document.getElementById('noMoreNotes').style.display = 'block';
            }

            noteStats.currentPage = page;
            noteStats.allNotes = [...noteStats.allNotes, ...newNotes];

            // 强制前端排序：最新修改（或创建）的在前
            noteStats.allNotes.sort((a, b) => {
                const timeA = getNoteTime(a);
                const timeB = getNoteTime(b);
                return timeB - timeA;
            });

            notes = noteStats.allNotes; // 保持兼容性

            // 重新从排序后的全集生成 Groups，确保 Chip 顺序正确
            rebuildFilterGroups();

            // 渲染
            renderNotes();
        } else {
            throw new Error('Load failed');
        }
    } catch (error) {
        console.error('Failed to load:', error);
        showNotification('加载失败', 'error');
    } finally {
        noteStats.isLoading = false;
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}

// 统一的时间获取逻辑
function getNoteTime(note) {
    if (note.timestamp) return note.timestamp;

    // 尝试解析 date 字符串 (e.g. "2024/12/30 11:34")
    if (note.date) {
        const d = new Date(note.date.replace(/-/g, '/'));
        if (!isNaN(d.getTime())) return d.getTime();
    }

    // 最后兜底使用 ID (创建时间戳)
    return Number(note.id);
}

function rebuildFilterGroups() {
    // 基于已排序的 noteStats.allNotes 重新构建 Set
    noteStats.groups.clear();
    const groups = groupNotesByDate(noteStats.allNotes);
    for (const group of Object.keys(groups)) {
        noteStats.groups.add(group);
    }
    renderFilterBar();
}

function updateFilterGroups(newNotes) {
    // 转发给重建函数
    rebuildFilterGroups();
}

function renderFilterBar() {
    const filterBar = document.getElementById('filterBar');
    if (!filterBar) return;

    // 记住当前选中状态
    filterBar.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `filter-chip ${noteStats.activeGroup === 'all' ? 'active' : ''}`;
    allBtn.setAttribute('data-group', 'all');
    allBtn.textContent = '全部';
    filterBar.appendChild(allBtn);

    // 按插入顺序渲染 (因为 allNotes 已经是有序的，所以 keys 自然也是有序的)
    [...noteStats.groups].forEach(group => {
        const btn = document.createElement('button');
        btn.className = `filter-chip ${noteStats.activeGroup === group ? 'active' : ''}`;
        btn.setAttribute('data-group', group);
        btn.textContent = group;
        filterBar.appendChild(btn);
    });
}

function setActiveGroup(group) {
    if (noteStats.activeGroup === group) return;
    noteStats.activeGroup = group;

    // 更新 UI 状态
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-group') === group);
    });

    renderNotes();

    if (group === 'all') {
        document.getElementById('noMoreNotes').style.display = noteStats.hasMore ? 'none' : 'block';
    } else {
        document.getElementById('noMoreNotes').style.display = 'none'; // 分组模式不显示底部提示
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function renderNotes() {
    const container = elements.notesList;
    if (noteStats.allNotes.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-secondary)">暂无内容</div>`;
        return;
    }

    // 过滤
    let displayNotes = noteStats.allNotes;
    if (noteStats.activeGroup !== 'all') {
        const groups = groupNotesByDate(noteStats.allNotes);
        displayNotes = groups[noteStats.activeGroup] || [];
    }

    if (noteStats.activeGroup === 'all') {
        const groups = groupNotesByDate(displayNotes);
        let html = '';
        for (const [groupName, groupNotes] of Object.entries(groups)) {
            html += `
                <div class="time-section">
                    <h3 class="section-title" onclick="setActiveGroup('${groupName}')" style="cursor:pointer" title="点击只看该组">${groupName} ></h3>
                    <div class="section-grid">
                        ${groupNotes.map(note => createNoteCardHTML(note)).join('')}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    } else {
        // 单一组展示，直接 Grid
        container.innerHTML = `
            <div class="section-grid">
                ${displayNotes.map(note => createNoteCardHTML(note)).join('')}
            </div>
        `;
    }
}

// function groupNotesByDate removed (duplicate)


function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function isSameWeek(d1, d2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((d1 - d2) / oneDay));
    return diffDays < 7;
}

function createNoteCardHTML(note) {
    return `
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
    `;
}

// Global helpers needed for inline HTML onclick. Attach to window.
window.setActiveGroup = setActiveGroup;
window.editNote = (id) => {
    // 查找时使用 allNotes，确保在任何视图下都能找到
    const note = noteStats.allNotes.find(n => n.id === id);
    if (note) showNoteEditor(note);
};

window.confirmDeleteNote = (id) => {
    showConfirmModal(id);
};

function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.className = `notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    toast.offsetHeight;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
