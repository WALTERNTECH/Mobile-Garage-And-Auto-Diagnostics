import { db } from '../lib/db.js';
import { originOf } from '../lib/http.js';

export default async function handler(req, res) {
  const origin = originOf(req);
  let slugs = [];
  try {
    const { rows } = await db().query('select slug, updated_at from services order by sort');
    slugs = rows;
  } catch { /* still serve the home page entry */ }
  const urls = [`<url><loc>${origin}/</loc><priority>1.0</priority></url>`]
    .concat(slugs.map((s) => `<url><loc>${origin}/services/${s.slug}</loc><lastmod>${new Date(s.updated_at).toISOString().slice(0, 10)}</lastmod><priority>0.8</priority></url>`));
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
}
