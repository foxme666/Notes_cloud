export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/notes') {
    if (request.method === 'GET') {
      try {
        const notes = await env.NOTES_KV.get('notes');
        return new Response(notes || '[]', { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        });
      } catch (error) {
        console.error('Error getting notes:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    } else if (request.method === 'POST') {
      try {
        const notes = await request.json();
        await env.NOTES_KV.put('notes', JSON.stringify(notes));
        return new Response('OK', { 
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      } catch (error) {
        console.error('Error saving notes:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    } else if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } else {
      return new Response('Method Not Allowed', { status: 405 });
    }
  }

  return new Response('Not Found', { status: 404 });
}