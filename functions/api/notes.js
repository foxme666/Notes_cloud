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
    const page = parseInt(url.searchParams.get('page')) || 1;
    const pageSize = parseInt(url.searchParams.get('pageSize')) || 10;
    const notesIndex = JSON.parse(await env.NOTES_KV.get('notesIndex') || '[]');
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedNoteIds = notesIndex.slice(startIndex, endIndex);
    
    const paginatedNotes = await Promise.all(paginatedNoteIds.map(async (id) => {
      const noteString = await env.NOTES_KV.get(`note:${id}`);
      return JSON.parse(noteString);
    }));

    const totalPages = Math.ceil(notesIndex.length / pageSize);

    return new Response(JSON.stringify({
      notes: paginatedNotes,
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

    await env.NOTES_KV.put(`note:${noteId}`, JSON.stringify(newNote));

    let notesIndex = JSON.parse(await env.NOTES_KV.get('notesIndex') || '[]');
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
    await env.NOTES_KV.delete(`note:${noteId}`);
    let notesIndex = JSON.parse(await env.NOTES_KV.get('notesIndex') || '[]');
    notesIndex = notesIndex.filter(id => id !== noteId);
    await env.NOTES_KV.put('notesIndex', JSON.stringify(notesIndex));
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
    'Access-Control-Allow-Origin': '*'
  };
}