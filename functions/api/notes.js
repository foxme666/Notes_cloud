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

  // 处理 DELETE 请求
  if (request.method === 'DELETE' && path.startsWith('/api/notes/')) {
    return handleDeleteNote(path, env);
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
    const notesString = await env.NOTES_KV.get('notes');
    const allNotes = JSON.parse(notesString || '[]');
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedNotes = allNotes.slice(startIndex, endIndex);
    
    const totalPages = Math.ceil(allNotes.length / pageSize);

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
    const newNote = await request.json();
    const notesString = await env.NOTES_KV.get('notes');
    const notes = JSON.parse(notesString || '[]');
    
    const existingIndex = notes.findIndex(note => note.id === newNote.id);
    if (existingIndex !== -1) {
      notes[existingIndex] = newNote;
    } else {
      notes.push(newNote);
    }
    
    await env.NOTES_KV.put('notes', JSON.stringify(notes));
    return new Response(JSON.stringify({ message: 'Note saved successfully' }), { 
      status: 200,
      headers: getResponseHeaders()
    });
  } catch (error) {
    console.error('Error saving note:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: getResponseHeaders()
    });
  }
}

async function handleDeleteNote(path, env) {
  try {
    const noteId = parseInt(path.split('/').pop());
    const notesString = await env.NOTES_KV.get('notes');
    let notes = JSON.parse(notesString || '[]');
    notes = notes.filter(note => note.id !== noteId);
    await env.NOTES_KV.put('notes', JSON.stringify(notes));
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