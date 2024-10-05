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
    if (request.method === 'GET') {
      try {
        const page = parseInt(url.searchParams.get('page')) || 1;
        const pageSize = parseInt(url.searchParams.get('pageSize')) || 10; // 更新为10
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
    } else if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
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

  return new Response(JSON.stringify({ error: 'Not Found' }), { 
    status: 404,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}