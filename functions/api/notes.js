export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  console.log(`Received ${request.method} request for path: ${path}`);

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
    if (request.method === 'GET') {
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
        }), { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        });
      } catch (error) {
        console.error('Error getting notes:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } else if (request.method === 'POST') {
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
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' 
          }
        });
      } catch (error) {
        console.error('Error saving note:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
  } else if (path.match(/^\/api\/notes\/\d+$/)) {  // 使用正则表达式匹配 /api/notes/{id}
    console.log('Matched /api/notes/{id} path');
    if (request.method === 'DELETE') {
      console.log('Processing DELETE request');
      try {
        const noteId = parseInt(path.split('/').pop());
        console.log(`Attempting to delete note with id: ${noteId}`);
        const notesString = await env.NOTES_KV.get('notes');
        let notes = JSON.parse(notesString || '[]');
        notes = notes.filter(note => note.id !== noteId);
        await env.NOTES_KV.put('notes', JSON.stringify(notes));
        console.log('Note deleted successfully');
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
    } else {
      // 处理其他方法的请求
      console.log(`Received unsupported method: ${request.method} for /api/notes/{id}`);
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Allow': 'DELETE'
        }
      });
    }
  }

  // 如果没有匹配的路由，返回 404
  console.log('No matching route found, returning 404');
  return new Response(JSON.stringify({ error: 'Not Found' }), { 
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}