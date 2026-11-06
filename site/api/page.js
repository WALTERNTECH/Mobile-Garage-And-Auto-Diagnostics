import { loadContent } from '../lib/db.js';
import { renderHome, renderService, renderNotFound } from '../lib/render.js';
import { fallback } from '../lib/defaults.js';
import { originOf } from '../lib/http.js';

// Every HTML page. Edge-cached for 20 s so admin edits show within about half a minute.
export default async function handler(req, res) {
  const origin = originOf(req);
  const path = String(req.query.path || '').replace(/^\/+|\/+$/g, '');
  const service = String(req.query.service || '');

  let content;
  let degraded = false;
  try {
    content = await loadContent();
    if (!content?.business) { content = fallback; degraded = true; }
  } catch (e) {
    console.error('content load failed', e.message);
    content = fallback;
    degraded = true;
  }

  let html;
  let status = 200;
  if (service) {
    html = renderService(content, service, origin);
    if (!html) { html = renderNotFound(content, origin); status = 404; }
  } else if (path === '' || path === 'index.html') {
    html = renderHome(content, origin);
  } else {
    html = renderNotFound(content, origin);
    status = 404;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', degraded || status !== 200
    ? 'public, max-age=0, s-maxage=10'
    : 'public, max-age=0, s-maxage=20, stale-while-revalidate=600');
  res.status(status).send(html);
}
