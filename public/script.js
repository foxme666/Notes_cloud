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

// 其他代码保持不变