addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/' || path === '/index.html') {
    return new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html' } })
  } else if (path === '/styles.css') {
    return new Response(STYLES_CSS, { headers: { 'Content-Type': 'text/css' } })
  } else if (path === '/script.js') {
    return new Response(SCRIPT_JS, { headers: { 'Content-Type': 'application/javascript' } })
  } else if (path === '/api/notes') {
    if (request.method === 'GET') {
      const notes = await NOTES_KV.get('notes')
      return new Response(notes || '[]', { headers: { 'Content-Type': 'application/json' } })
    } else if (request.method === 'POST') {
      const notes = await request.json()
      await NOTES_KV.put('notes', JSON.stringify(notes))
      return new Response('OK', { status: 200 })
    } else {
      return new Response('Method Not Allowed', { status: 405 })
    }
  } else {
    return new Response('Not Found', { status: 404 })
  }
}

const INDEX_HTML = `...` // 粘贴index.html的内容
const STYLES_CSS = `...` // 粘贴styles.css的内容
const SCRIPT_JS = `...` // 粘贴script.js的内容