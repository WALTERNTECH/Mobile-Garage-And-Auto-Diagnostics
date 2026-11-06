import pg from 'pg';

// One small pool per warm function instance. DATABASE_URL is the Supabase transaction pooler (6543)
// logged in as mgarage_web, which can only read published content and call submit_booking().
let pool;
export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new pg.Pool({
      connectionString: url.replace(/[?&]sslmode=[^&]*/, ''),
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
    pool.on('error', () => {});
  }
  return pool;
}

const CONTENT_SQL = `
select
  (select value from settings where key = 'public.business') as business,
  (select coalesce(json_agg(s order by s.sort, s.created_at), '[]') from (
     select id, image_id, eyebrow, title, subtitle, cta_label, cta_href, sort, created_at,
            (select alt from images i where i.id = slides.image_id) as alt
       from slides) s) as slides,
  (select coalesce(json_agg(v order by v.sort, v.created_at), '[]') from (
     select sv.id, sv.slug, sv.title, sv.category, sv.summary, sv.description, sv.highlights,
            sv.price_from, sv.duration, sv.icon, sv.featured, sv.sort, sv.created_at,
            coalesce((select json_agg(json_build_object('id', si.image_id, 'caption', si.caption, 'alt', im.alt,
                                                        'w', im.width, 'h', im.height) order by si.sort)
                        from service_images si join images im on im.id = si.image_id
                       where si.service_id = sv.id), '[]') as images
       from services sv) v) as services,
  (select coalesce(json_agg(t order by t.sort, t.created_at), '[]') from (
     select id, name, body, source, when_label, sort, created_at from testimonials) t) as testimonials,
  (select coalesce(json_agg(f order by f.sort), '[]') from (
     select id, question, answer, sort from faqs) f) as faqs`;

export async function loadContent() {
  const { rows } = await db().query(CONTENT_SQL);
  return rows[0];
}
