export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 添加 OPTIONS 请求的处理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  if (path === '/api/notes') {
    // GET 和 POST 处理保持不变
  } else if (path.startsWith('/api/notes/')) {
    if (request.method === 'DELETE') {
      try {
        const noteId = parseInt(path.split('/').pop());
        const notesString = await env.NOTES_KV.get('notes');
        let notes = JSON.parse(notesString || '[]');
        notes = notes.filter(note => note.id !== noteId);
        await env.NOTES_KV.put('notes', JSON.stringify(notes));
        return new Response(JSON.stringify({ message: 'Note deleted successfully' }), { 
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
          }
        });
      } catch (error) {
        console.error('Error deleting note:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
  }

  // 如果没有匹配的路由，返回 404
  return new Response(JSON.stringify({ error: 'Not Found' }), { 
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}