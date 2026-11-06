import crypto from 'node:crypto';
import { db } from '../lib/db.js';
import { originOf, clientIp } from '../lib/http.js';

const str = (v, max) => String(v ?? '').trim().slice(0, max);

// Booking request from the website form. Validation and per-IP rate limiting happen in
// mgarage.submit_booking() too, since this role cannot touch the bookings table directly.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin;
  if (origin && origin !== originOf(req)) return res.status(403).json({ error: 'Bad origin' });

  const body = typeof req.body === 'object' && req.body ? req.body : {};
  if (body.website) return res.status(200).json({ ref: 'MG-OK' }); // honeypot: pretend success

  const name = str(body.name, 80);
  const phone = str(body.phone, 20).replace(/[^\d+ ]/g, '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || '')) ? body.date : null;
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^\+?[0-9 ]{9,16}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number.' });

  const ipHash = crypto.createHash('sha256').update(clientIp(req) + (process.env.IP_SALT || '')).digest('hex').slice(0, 32);
  try {
    const { rows } = await db().query('select mgarage.submit_booking($1,$2,$3,$4,$5,$6,$7,$8) as ref', [
      name, phone, str(body.vehicle, 80), str(body.service, 80), str(body.location, 120), date, str(body.message, 1000), ipHash,
    ]);
    return res.status(200).json({ ref: rows[0].ref });
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.includes('rate_limited')) return res.status(429).json({ error: 'Too many requests from this connection. Please call or WhatsApp us instead.' });
    if (/bad_|too_long/.test(msg)) return res.status(400).json({ error: 'Please check the details and try again.' });
    console.error('booking failed', msg);
    return res.status(503).json({ error: 'We could not save that just now. Please call or WhatsApp us.' });
  }
}
