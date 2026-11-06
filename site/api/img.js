import { db } from '../lib/db.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Image bytes by id. Ids never change content (a new upload gets a new id), so cache for a year.
export default async function handler(req, res) {
  const id = String(req.query.id || '');
  if (!UUID.test(id)) return res.status(404).send('Not found');
  try {
    const { rows } = await db().query('select mime, bytes from images where id = $1', [id]);
    if (!rows.length) {
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Type', rows[0].mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(rows[0].bytes);
  } catch (e) {
    console.error('image failed', e.message);
    return res.status(503).send('Unavailable');
  }
}
