export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  console.log(`Received ${request.method} request for path: ${path}`);

  // 处理 CORS
  if (request.method === 'OPTIONS') {
    return handleCORS();
  }

  // 处理 GET 请求
  if (request.method === 'GET' && path === '/api/notes') {
    return handleGetNotes(env, url);
  }

  // 处理 POST 请求
  if (request.method === 'POST' && path === '/api/notes') {
    return handlePostNote(request, env);
  }

  // 如果没有匹配的路由，返回 404
  return new Response(JSON.stringify({ error: 'Not Found' }), { 
    status: 404,
    headers: getResponseHeaders()
  });
}

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

async function handleGetNotes(env, url) {
  try {
    console.log('Handling GET request for notes');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
    console.log(`Page: ${page}, PageSize: ${pageSize}`);

    let notesIndexString = await env.NOTES_KV.get('notesIndex');
    console.log('Notes index string:', notesIndexString);
    let notesIndex = JSON.parse(notesIndexString || '[]');
    console.log('Parsed notes index:', notesIndex);
    
    // 同步 notesIndex 和实际笔记
    let syncedNotesIndex = [];
    for (const id of notesIndex) {
      const noteString = await env.NOTES_KV.get(`note:${id}`);
      if (noteString) {
        syncedNotesIndex.push(id);
      }
    }

    // 如果 notesIndex 发生了变化，更新它
    if (syncedNotesIndex.length !== notesIndex.length) {
      notesIndex = syncedNotesIndex;
      await env.NOTES_KV.put('notesIndex', JSON.stringify(notesIndex));
      console.log('Updated notes index:', notesIndex);
    }
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedNoteIds = notesIndex.slice(startIndex, endIndex);
    console.log('Paginated note IDs:', paginatedNoteIds);
    
    const paginatedNotes = await Promise.all(paginatedNoteIds.map(async (id) => {
      const noteString = await env.NOTES_KV.get(`note:${id}`);
      console.log(`Note ${id} string:`, noteString);
      return noteString ? JSON.parse(noteString) : null;
    }));
    console.log('Paginated notes:', paginatedNotes);

    // 过滤掉 null 笔记（这一步现在应该是多余的，但为了安全起见保留）
    const validNotes = paginatedNotes.filter(note => note !== null);

    const totalPages = Math.ceil(notesIndex.length / pageSize);

    return new Response(JSON.stringify({
      notes: validNotes,
      totalPages: totalPages,
      currentPage: page
    }), { headers: getResponseHeaders() });
  } catch (error) {
    console.error('Error getting notes:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

async function handlePostNote(request, env) {
  try {
    const data = await request.json();
    if (data.action === 'delete') {
      return handleDeleteNoteById(data.id, env);
    }

    const newNote = data;
    const noteId = newNote.id || Date.now().toString();
    newNote.id = noteId;

    // 保存笔记
    await env.NOTES_KV.put(`note:${noteId}`, JSON.stringify(newNote));

    // 更新索引
    let notesIndexString = await env.NOTES_KV.get('notesIndex');
    let notesIndex = JSON.parse(notesIndexString || '[]');
    if (!notesIndex.includes(noteId)) {
      notesIndex.push(noteId);
      await env.NOTES_KV.put('notesIndex', JSON.stringify(notesIndex));
    }

    return new Response(JSON.stringify({ message: 'Note saved successfully' }), { 
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    console.error('Error processing note:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

async function handleDeleteNoteById(noteId, env) {
  try {
    // 首先检查笔记是否存在
    const noteString = await env.NOTES_KV.get(`note:${noteId}`);
    if (!noteString) {
      return new Response(JSON.stringify({ error: 'Note not found' }), { 
        status: 404,
        headers: getResponseHeaders()
      });
    }

    // 删除笔记
    await env.NOTES_KV.delete(`note:${noteId}`);

    // 获取并更新索引
    let notesIndexString = await env.NOTES_KV.get('notesIndex');
    let notesIndex = JSON.parse(notesIndexString || '[]');
    
    // 同步 notesIndex 和实际笔记
    let syncedNotesIndex = [];
    for (const id of notesIndex) {
      if (id !== noteId) {  // 排除正在删除的笔记ID
        const noteString = await env.NOTES_KV.get(`note:${id}`);
        if (noteString) {
          syncedNotesIndex.push(id);
        }
      }
    }

    // 更新索引
    await env.NOTES_KV.put('notesIndex', JSON.stringify(syncedNotesIndex));

    return new Response(JSON.stringify({ message: 'Note deleted successfully' }), { 
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

function getResponseHeaders() {
  return { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}