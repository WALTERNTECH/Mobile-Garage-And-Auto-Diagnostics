// Loads the first-run content into the database, once. Run: npm run seed
// Refuses to run if content already exists, so it can never overwrite the owner's edits.
import pg from 'pg';
import sharp from 'sharp';
import fs from 'node:fs';
import { business, slides, services, testimonials, faqs } from './content.mjs';

const root = new URL('../', import.meta.url);
const s = JSON.parse(fs.readFileSync(new URL('.local/secrets.json', root)));
const host = fs.readFileSync(new URL('.local/pooler-host.txt', root), 'utf8').trim();
const db = new pg.Client({ host, port: 6543, user: 'mgarage_api.mrsxvdxaoogamhkdqejp', password: s.API_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } });
await db.connect();

const { rows: [{ n }] } = await db.query('select count(*)::int n from settings');
if (n > 0) { console.log('Content already present; nothing done.'); await db.end(); process.exit(0); }

const alts = {
  p1: 'Mobile Garage workshop with jacks, stands and tools on Limuru Road',
  p2: 'Mechanic working on a BMW engine under the bonnet',
  p3: 'Close-up of engine repair work on the cylinder head',
  p5: 'Car in the Mobile Garage workshop',
  p7: 'Night-time breakdown call-out, mechanic diagnosing under the bonnet',
};
const imageIds = {};
async function image(key) {
  if (imageIds[key]) return imageIds[key];
  const input = fs.readFileSync(new URL(`.local/maps-photos/${key}.jpg`, root));
  const { data, info } = await sharp(input).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const { rows } = await db.query(
    'insert into images(mime, bytes, width, height, size, alt) values ($1,$2,$3,$4,$5,$6) returning id',
    ['image/webp', data, info.width, info.height, data.length, alts[key] || '']);
  console.log('image', key, info.width + 'x' + info.height, Math.round(data.length / 1024) + ' KB');
  return (imageIds[key] = rows[0].id);
}

await db.query('begin');
try {
  await db.query("insert into settings(key, value) values ('public.business', $1)", [business]);
  for (const [i, sl] of slides.entries()) {
    await db.query('insert into slides(image_id, eyebrow, title, subtitle, cta_label, cta_href, sort) values ($1,$2,$3,$4,$5,$6,$7)',
      [await image(sl.photo), sl.eyebrow, sl.title, sl.subtitle, sl.cta_label, sl.cta_href, i]);
  }
  for (const [i, sv] of services.entries()) {
    const { rows } = await db.query(
      'insert into services(slug, title, category, summary, description, highlights, icon, featured, sort) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id',
      [sv.slug, sv.title, sv.category, sv.summary, sv.description, JSON.stringify(sv.highlights), sv.icon, sv.featured, i]);
    for (const [j, p] of sv.photos.entries()) {
      await db.query('insert into service_images(service_id, image_id, sort) values ($1,$2,$3)', [rows[0].id, await image(p), j]);
    }
  }
  for (const [i, t] of testimonials.entries()) {
    await db.query('insert into testimonials(name, body, when_label, sort) values ($1,$2,$3,$4)', [t.name, t.body, t.when_label, i]);
  }
  for (const [i, f] of faqs.entries()) {
    await db.query('insert into faqs(question, answer, sort) values ($1,$2,$3)', [f.question, f.answer, i]);
  }
  await db.query('commit');
  console.log('Seeded.');
} catch (e) {
  await db.query('rollback');
  throw e;
} finally {
  await db.end();
}
