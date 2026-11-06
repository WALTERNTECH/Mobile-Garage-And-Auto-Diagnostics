-- Mobile Garage & Auto Diagnostics: content + bookings.
-- Runs as role mgarage_api (owner of schema mgarage). The public website connects as
-- mgarage_web, which can only read published content and file a booking through
-- mgarage.submit_booking(). Everything else is admin-only.

set search_path = mgarage;

create table settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table images (
  id         uuid primary key default gen_random_uuid(),
  mime       text not null check (mime in ('image/webp','image/jpeg','image/png','image/avif')),
  bytes      bytea not null,
  width      int,
  height     int,
  size       int not null,
  alt        text not null default '',
  created_at timestamptz not null default now()
);

create table slides (
  id         uuid primary key default gen_random_uuid(),
  image_id   uuid not null references images(id),
  eyebrow    text not null default '',
  title      text not null default '',
  subtitle   text not null default '',
  cta_label  text not null default '',
  cta_href   text not null default '',
  sort       int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table services (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  category    text not null default '',
  summary     text not null default '',
  description text not null default '',
  highlights  jsonb not null default '[]'::jsonb,
  price_from  text not null default '',
  duration    text not null default '',
  icon        text not null default 'wrench',
  featured    boolean not null default false,
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table service_images (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete cascade,
  image_id   uuid not null references images(id),
  caption    text not null default '',
  sort       int  not null default 0
);
create index service_images_service on service_images(service_id, sort);

create table testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  body       text not null,
  rating     int  not null default 5 check (rating between 1 and 5),
  source     text not null default 'Google',
  when_label text not null default '',
  sort       int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table faqs (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text not null,
  sort       int  not null default 0,
  active     boolean not null default true
);

create table bookings (
  id             uuid primary key default gen_random_uuid(),
  ref            text not null unique,
  name           text not null,
  phone          text not null,
  vehicle        text not null default '',
  service        text not null default '',
  location       text not null default '',
  preferred_date date,
  message        text not null default '',
  status         text not null default 'new'
                 check (status in ('new','contacted','scheduled','done','cancelled')),
  notes          text not null default '',
  ip_hash        text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index bookings_created on bookings(created_at desc);
create index bookings_ip on bookings(ip_hash, created_at);

create table admins (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique check (username = lower(username)),
  name          text not null default '',
  pass_hash     text not null,
  session_epoch int  not null default 1,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table login_attempts (
  id  bigserial primary key,
  key text not null,
  ok  boolean not null,
  at  timestamptz not null default now()
);
create index login_attempts_key on login_attempts(key, at);

-- Booking intake for the public site: validates, rate-limits per IP hash, returns a reference.
create function submit_booking(
  p_name text, p_phone text, p_vehicle text, p_service text, p_location text,
  p_date date, p_message text, p_ip_hash text
) returns text
language plpgsql security definer set search_path = mgarage, pg_temp as $$
declare v_ref text; v_recent int;
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 80 then raise exception 'bad_name'; end if;
  if coalesce(p_phone,'') !~ '^\+?[0-9 ]{9,16}$' then raise exception 'bad_phone'; end if;
  if length(coalesce(p_vehicle,'')) > 80 or length(coalesce(p_service,'')) > 80
     or length(coalesce(p_location,'')) > 120 or length(coalesce(p_message,'')) > 1000 then
    raise exception 'too_long';
  end if;
  select count(*) into v_recent from bookings
   where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if v_recent >= 5 then raise exception 'rate_limited'; end if;
  v_ref := 'MG-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into bookings(ref, name, phone, vehicle, service, location, preferred_date, message, ip_hash)
  values (v_ref, trim(p_name), trim(p_phone), trim(coalesce(p_vehicle,'')), trim(coalesce(p_service,'')),
          trim(coalesce(p_location,'')), p_date, trim(coalesce(p_message,'')), coalesce(p_ip_hash,''));
  return v_ref;
end $$;
revoke all on function submit_booking(text,text,text,text,text,date,text,text) from public;

-- Row level security everywhere; the owner (mgarage_api) bypasses it, the web role gets read policies.
alter table settings       enable row level security;
alter table images         enable row level security;
alter table slides         enable row level security;
alter table services       enable row level security;
alter table service_images enable row level security;
alter table testimonials   enable row level security;
alter table faqs           enable row level security;
alter table bookings       enable row level security;
alter table admins         enable row level security;
alter table login_attempts enable row level security;
