export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/notes') {
    if (request.method === 'GET') {
      const notes = await env.NOTES_KV.get('notes');
      return new Response(notes || '[]', { headers: { 'Content-Type': 'application/json' } });
    } else if (request.method === 'POST') {
      const notes = await request.json();
      await env.NOTES_KV.put('notes', JSON.stringify(notes));
      return new Response('OK', { status: 200 });
    } else {
      return new Response('Method Not Allowed', { status: 405 });
    }
  }

  return new Response('Not Found', { status: 404 });
}