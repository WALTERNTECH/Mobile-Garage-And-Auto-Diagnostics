import { icon, whatsappIcon } from './icons.js';

const ASSET_V = '1';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const img = (id) => `/img/${encodeURIComponent(id)}`;

function links(b) {
  const tel = `tel:${b.phoneIntl || ''}`;
  const wa = (text) => `https://wa.me/${b.whatsapp || ''}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  const cta = (href) => {
    const h = String(href || '').trim();
    if (h === 'tel') return tel;
    if (h === 'maps') return b.mapsUrl || '#visit';
    if (h === 'whatsapp') return wa(`Hello ${b.shortName || ''}, I need help with my car.`);
    if (/^(#|\/(?!\/)|https:\/\/|tel:|mailto:)/.test(h)) return h;
    return '#book';
  };
  return { tel, wa, cta };
}

function fmtTime(t) {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')} ${ap}` : `${hh} ${ap}`;
}

// "Mon–Sat 7:30 am – 6:30 pm · Sun 10:30 am – 6 pm" from the hours table, grouping equal consecutive days.
function hoursSummary(hours = []) {
  const groups = [];
  for (const h of hours) {
    const label = h.closed ? 'Closed' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.to = h.day; else groups.push({ from: h.day, to: h.day, label });
  }
  return groups.map((g) => `${g.from.slice(0, 3)}${g.to !== g.from ? `–${g.to.slice(0, 3)}` : ''} ${g.label}`).join(' · ');
}
const openDays = (hours = []) => hours.filter((h) => !h.closed).length;

const DEFAULT_STEPS = [
  { title: 'Call or WhatsApp', body: 'Tell us the car, where it is and what it is doing, and we agree a time to come out.' },
  { title: 'We come and scan', body: 'We arrive with the scan tool and kit, read the fault codes and check the car properly.' },
  { title: 'Explain, then fix', body: 'We walk you through what we found and the options. Then we fix it, often right there.' },
];
const steps = (b) => (Array.isArray(b.steps) && b.steps.length ? b.steps : DEFAULT_STEPS);

function stars(n = 5) {
  return `<span class="stars" aria-hidden="true">${icon('star', 'i').repeat(n)}</span>`;
}

function logo(b) {
  return `<a class="brand" href="/" aria-label="${esc(b.name)} home">
    <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#0E1013"/><path d="M7 22h6l3-8 5 14 3-9 2 3h7" fill="none" stroke="#FF5A1F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="brand-text"><strong>Mobile Garage</strong><small>&amp; Auto Diagnostics</small></span>
  </a>`;
}

function head({ b, title, description, canonical, ogImage, jsonLd }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(b.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Geist:wght@400..600&family=Instrument+Serif:ital@1&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=${ASSET_V}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>`;
}

function header(b, L, onHome) {
  const pre = onHome ? '' : '/';
  const ann = b.announcement?.enabled && b.announcement?.text
    ? `<div class="announce">${b.announcement.link ? `<a href="${esc(L.cta(b.announcement.link))}">${esc(b.announcement.text)} ${icon('arrow')}</a>` : `<span>${esc(b.announcement.text)}</span>`}</div>` : '';
  return `${ann}
<header class="nav" data-nav>
  <div class="wrap nav-row">
    ${logo(b)}
    <nav class="nav-links" aria-label="Main">
      <a href="${pre}#services">Services</a>
      <a href="${pre}#how">How it works</a>
      <a href="${pre}#reviews">Reviews</a>
      <a href="${pre}#visit">Visit</a>
      <a href="${pre}#faq">FAQ</a>
    </nav>
    <div class="nav-cta">
      <span class="status" data-status hidden><i></i><span></span></span>
      <a class="btn btn-ghost btn-sm hide-sm" href="${L.tel}">${icon('phone')}<span>${esc(b.phone)}</span></a>
      <a class="btn btn-accent btn-sm" href="${pre}#book">Book a mechanic</a>
      <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" data-burger>${icon('menu')}</button>
    </div>
  </div>
  <div class="sheet" data-sheet hidden>
    <nav aria-label="Mobile">
      <a href="${pre}#services">Services</a>
      <a href="${pre}#how">How it works</a>
      <a href="${pre}#reviews">Reviews</a>
      <a href="${pre}#visit">Visit &amp; hours</a>
      <a href="${pre}#faq">FAQ</a>
    </nav>
    <div class="sheet-cta">
      <a class="btn btn-dark" href="${L.tel}">${icon('phone')}Call ${esc(b.phone)}</a>
      <a class="btn btn-wa" href="${esc(L.wa(`Hello ${b.shortName}, I need help with my car.`))}" target="_blank" rel="noopener">${whatsappIcon()}WhatsApp us</a>
    </div>
  </div>
</header>`;
}

function footer(b, L, services) {
  const year = new Date().getFullYear();
  return `<footer class="foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">
      ${logo(b)}
      <p>${esc(b.tagline)}. We come to you, or visit the workshop on ${esc(b.address)}.</p>
      <div class="foot-rating">${stars(5)}<span><strong>${esc(b.rating)}</strong> from ${esc(b.reviewCount)} Google reviews</span></div>
    </div>
    <div>
      <h4>Services</h4>
      <ul>${services.slice(0, 8).map((s) => `<li><a href="/services/${esc(s.slug)}">${esc(s.title)}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h4>Hours</h4>
      <ul class="foot-hours">${(b.hours || []).map((h) => `<li><span>${esc(h.day.slice(0, 3))}</span><span>${h.closed ? 'Closed' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span></li>`).join('')}</ul>
    </div>
    <div>
      <h4>Contact</h4>
      <ul>
        <li><a href="${L.tel}">${esc(b.phone)}</a></li>
        <li><a href="${esc(L.wa(''))}" target="_blank" rel="noopener">WhatsApp</a></li>
        ${b.email ? `<li><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></li>` : ''}
        <li><a href="${esc(b.mapsUrl)}" target="_blank" rel="noopener">${esc(b.address)}</a></li>
        ${['facebook', 'instagram', 'tiktok'].filter((k) => b.social?.[k]).map((k) => `<li><a href="${esc(b.social[k])}" target="_blank" rel="noopener">${k[0].toUpperCase() + k.slice(1)}</a></li>`).join('')}
      </ul>
    </div>
  </div>
  <div class="wrap foot-base">
    <span>© ${year} ${esc(b.name)}</span>
    <span class="mono">${esc(b.plusCode || '')}</span>
  </div>
</footer>
<div class="dock" data-dock>
  <a href="${L.tel}">${icon('phone')}<span>Call</span></a>
  <a href="${esc(L.wa(`Hello ${b.shortName}, I need help with my car.`))}" target="_blank" rel="noopener" class="dock-wa">${whatsappIcon()}<span>WhatsApp</span></a>
  <a href="/#book" class="dock-book">${icon('calendar')}<span>Book</span></a>
</div>`;
}

function serviceMedia(s, { eager = false, large = false } = {}) {
  const imgs = s.images || [];
  if (!imgs.length) {
    return `<div class="media media-empty">${icon(s.icon, 'i media-empty-i')}</div>`;
  }
  const sizes = large ? '(max-width: 900px) 100vw, 60vw' : '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw';
  return `<div class="media" data-slider>
    <div class="media-track" data-track tabindex="0" aria-label="${esc(s.title)} photos">
      ${imgs.map((im, i) => `<figure class="media-slide"><img src="${img(im.id)}" alt="${esc(im.alt || im.caption || s.title)}" ${im.w ? `width="${im.w}" height="${im.h}"` : ''} loading="${eager && i === 0 ? 'eager' : 'lazy'}" decoding="async" sizes="${sizes}">${im.caption ? `<figcaption>${esc(im.caption)}</figcaption>` : ''}</figure>`).join('')}
    </div>
    ${imgs.length > 1 ? `
    <button class="media-nav prev" type="button" aria-label="Previous photo" data-prev>${icon('arrowLeft')}</button>
    <button class="media-nav next" type="button" aria-label="Next photo" data-next>${icon('arrow')}</button>
    <div class="media-dots" aria-hidden="true">${imgs.map((_, i) => `<i${i === 0 ? ' class="on"' : ''}></i>`).join('')}</div>
    <span class="media-count mono" data-count>1 / ${imgs.length}</span>` : ''}
  </div>`;
}

function priceLabel(s) {
  return s.price_from ? `From ${esc(s.price_from)}` : 'Quote on inspection';
}

function serviceCard(s) {
  const hl = Array.isArray(s.highlights) ? s.highlights.slice(0, 3) : [];
  return `<article class="svc" data-cat="${esc(s.category)}">
    <div class="svc-media">
      ${serviceMedia(s)}
      ${s.featured ? '<span class="tag">Popular</span>' : ''}
    </div>
    <div class="svc-body">
      <div class="svc-meta"><span class="svc-icon">${icon(s.icon)}</span><span class="mono">${esc(s.category)}</span></div>
      <h3><a href="/services/${esc(s.slug)}">${esc(s.title)}</a></h3>
      <p>${esc(s.summary)}</p>
      ${hl.length ? `<ul class="ticks">${hl.map((h) => `<li>${icon('check')}${esc(h)}</li>`).join('')}</ul>` : ''}
      <div class="svc-foot">
        <span class="price">${priceLabel(s)}${s.duration ? `<small>${esc(s.duration)}</small>` : ''}</span>
        <a class="svc-more" href="/services/${esc(s.slug)}" aria-label="${esc(s.title)} details">Details ${icon('arrow')}</a>
      </div>
    </div>
  </article>`;
}

function bookingForm(services, b, selected = '') {
  return `<form class="book-form" data-book novalidate>
    <div class="field-row">
      <label class="field"><span>Your name</span><input name="name" autocomplete="name" required maxlength="80" placeholder="Jane Wanjiru"></label>
      <label class="field"><span>Phone</span><input name="phone" type="tel" autocomplete="tel" required maxlength="16" placeholder="07xx xxx xxx"></label>
    </div>
    <div class="field-row">
      <label class="field"><span>Car (make, model, year)</span><input name="vehicle" maxlength="80" placeholder="Toyota Fielder 2012"></label>
      <label class="field"><span>Service</span>
        <select name="service">
          <option value="">Not sure yet</option>
          ${services.map((s) => `<option${s.slug === selected ? ' selected' : ''}>${esc(s.title)}</option>`).join('')}
          <option>Something else</option>
        </select>
      </label>
    </div>
    <div class="field-row">
      <label class="field"><span>Where is the car?</span><input name="location" maxlength="120" placeholder="e.g. Westlands, office parking"></label>
      <label class="field"><span>Preferred date</span><input name="date" type="date"></label>
    </div>
    <label class="field"><span>What is the car doing?</span><textarea name="message" rows="3" maxlength="1000" placeholder="Check-engine light on, losing power uphill…"></textarea></label>
    <label class="hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <div class="form-foot">
      <button class="btn btn-accent btn-lg" type="submit"><span>Send booking request</span>${icon('arrow')}</button>
      <p class="form-note">We reply by call or WhatsApp. Urgent? <a href="tel:${esc(b.phoneIntl)}">Call ${esc(b.phone)}</a>.</p>
    </div>
    <div class="form-msg" data-msg role="status" aria-live="polite"></div>
  </form>`;
}

function jsonLd(b, origin, services) {
  const dayMap = { Monday: 'Mo', Tuesday: 'Tu', Wednesday: 'We', Thursday: 'Th', Friday: 'Fr', Saturday: 'Sa', Sunday: 'Su' };
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: b.name,
    url: origin + '/',
    telephone: b.phoneIntl,
    image: services.find((s) => s.images?.length) ? origin + img(services.find((s) => s.images?.length).images[0].id) : undefined,
    address: { '@type': 'PostalAddress', streetAddress: b.address, addressLocality: 'Nairobi', addressCountry: 'KE' },
    geo: b.lat ? { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng } : undefined,
    hasMap: b.mapsUrl,
    openingHoursSpecification: (b.hours || []).filter((h) => !h.closed).map((h) => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${h.day}`, opens: h.open, closes: h.close,
    })),
    openingHours: (b.hours || []).filter((h) => !h.closed).map((h) => `${dayMap[h.day]} ${h.open}-${h.close}`),
    aggregateRating: b.rating ? { '@type': 'AggregateRating', ratingValue: b.rating, reviewCount: b.reviewCount } : undefined,
    makesOffer: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.summary } })),
  };
}

function hoursBlock(b) {
  return `<ul class="hours" data-hours='${esc(JSON.stringify(b.hours || []))}'>
    ${(b.hours || []).map((h, i) => `<li data-day="${esc(h.day)}"><span>${esc(h.day)}</span><span>${h.closed ? 'Closed' : `${fmtTime(h.open)} – ${fmtTime(h.close)}`}</span></li>`).join('')}
  </ul>`;
}

function scripts() {
  return `<script src="/assets/site.js?v=${ASSET_V}" defer></script>`;
}

export function renderHome(c, origin) {
  const b = c.business;
  const L = links(b);
  const slides = c.slides || [];
  const services = c.services || [];
  const cats = [...new Set(services.map((s) => s.category).filter(Boolean))];
  const reviews = c.testimonials || [];
  const faqs = c.faqs || [];
  const firstImg = slides[0]?.image_id;
  const aboutImg = b.about?.image_id || firstImg;

  return `${head({ b, title: b.seo?.title || b.name, description: b.seo?.description || b.tagline, canonical: origin + '/', ogImage: firstImg ? origin + img(firstImg) : '', jsonLd: jsonLd(b, origin, services) })}
<body data-hours='${esc(JSON.stringify(b.hours || []))}'>
<a class="skip" href="#main">Skip to content</a>
${header(b, L, true)}
<main id="main">

<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow mono"><span class="pulse"></span>${esc(b.hero?.eyebrow)}</p>
      <h1>${esc(b.hero?.title)}</h1>
      <p class="lede">${esc(b.hero?.subtitle)}</p>
      <div class="hero-cta">
        <a class="btn btn-accent btn-lg" href="#book">Book a mechanic ${icon('arrow')}</a>
        <a class="btn btn-wa btn-lg" href="${esc(L.wa(`Hello ${b.shortName}, I need help with my car.`))}" target="_blank" rel="noopener">${whatsappIcon()}WhatsApp</a>
      </div>
      <div class="hero-proof">
        <a class="proof-rating" href="${esc(b.mapsUrl)}" target="_blank" rel="noopener">
          <strong>${esc(b.rating)}</strong>
          <span>${stars(5)}<small>${esc(b.reviewCount)} Google reviews</small></span>
        </a>
        <div class="proof-call">
          <small>Call or WhatsApp</small>
          <a href="${L.tel}">${esc(b.phone)}</a>
        </div>
      </div>
    </div>

    <div class="stage" data-carousel aria-roledescription="carousel" aria-label="Highlights">
      <div class="stage-slides">
        ${slides.map((s, i) => `<figure class="stage-slide${i === 0 ? ' on' : ''}" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}" ${i ? 'aria-hidden="true"' : ''}>
          <img src="${img(s.image_id)}" alt="${esc(s.alt || s.title)}" ${i === 0 ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'} decoding="async">
          <figcaption>
            ${s.eyebrow ? `<span class="mono">${esc(s.eyebrow)}</span>` : ''}
            ${s.title ? `<strong>${esc(s.title)}</strong>` : ''}
            ${s.subtitle ? `<p>${esc(s.subtitle)}</p>` : ''}
            ${s.cta_label ? `<a class="btn btn-white btn-sm" href="${esc(L.cta(s.cta_href))}"${/^https:/.test(L.cta(s.cta_href)) ? ' target="_blank" rel="noopener"' : ''}>${esc(s.cta_label)} ${icon('arrow')}</a>` : ''}
          </figcaption>
        </figure>`).join('')}
      </div>
      ${slides.length > 1 ? `<div class="stage-bars">${slides.map((_, i) => `<button type="button" aria-label="Show slide ${i + 1}" data-go="${i}"${i === 0 ? ' class="on"' : ''}><i></i></button>`).join('')}</div>
      <div class="stage-ctrl">
        <button type="button" aria-label="Previous slide" data-prev>${icon('arrowLeft')}</button>
        <button type="button" aria-label="Next slide" data-next>${icon('arrow')}</button>
      </div>` : ''}
      <div class="stage-readout mono" aria-hidden="true"><span>SCAN</span><i></i><span>DIAGNOSE</span><i></i><span>FIX</span></div>
    </div>
  </div>
</section>

<section class="ticker" aria-hidden="true">
  <div class="ticker-track">
    ${[0, 1].map(() => `<div>${services.map((s) => `<span>${icon(s.icon)}${esc(s.title)}</span>`).join('')}</div>`).join('')}
  </div>
</section>

<section class="stats wrap" aria-label="At a glance">
  <div class="stat"><strong>${esc(b.rating)}<em>/5</em></strong><span>Average Google rating</span></div>
  <div class="stat"><strong>${esc(b.reviewCount)}</strong><span>Customer reviews</span></div>
  <div class="stat"><strong>${openDays(b.hours)}<em> days</em></strong><span>${openDays(b.hours) === 7 ? 'Open every day of the week' : 'Open each week'}</span></div>
  <div class="stat"><strong>On-site</strong><span>We come to your car</span></div>
</section>

<section class="section" id="services">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="eyebrow mono">Services</p>
        <h2>Everything your car needs, <span class="serif">brought to you.</span></h2>
      </div>
      <p class="sec-sub">Each job starts with a proper diagnosis, so you pay for the fix, not for guesses.</p>
    </div>
    ${cats.length > 1 ? `<div class="chips" role="tablist" aria-label="Filter services">
      <button class="chip on" type="button" data-filter="">All</button>
      ${cats.map((c2) => `<button class="chip" type="button" data-filter="${esc(c2)}">${esc(c2)}</button>`).join('')}
    </div>` : ''}
    <div class="svc-grid" data-svc-grid>
      ${services.map(serviceCard).join('')}
    </div>
  </div>
</section>

<section class="section how" id="how">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="eyebrow mono">How it works</p>
        <h2>From breakdown to <span class="serif">back on the road.</span></h2>
      </div>
    </div>
    <ol class="steps">
      ${steps(b).map((s, i) => `<li><span class="mono">${String(i + 1).padStart(2, '0')}</span><div class="step-i">${i === 0 ? whatsappIcon() : icon(['scan', 'wrench', 'check', 'car'][(i - 1) % 4])}</div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section about">
  <div class="wrap about-grid">
    <div class="about-media">
      ${aboutImg ? `<img src="${img(aboutImg)}" alt="${esc(b.name)} at work" loading="lazy" decoding="async">` : ''}
      <div class="about-badge"><span class="mono">OPEN</span><strong>${openDays(b.hours)} days a week</strong><small>${esc(hoursSummary(b.hours))}</small></div>
    </div>
    <div class="about-copy">
      <p class="eyebrow mono">Why drivers call us</p>
      <h2>${esc(b.about?.title)}</h2>
      <p class="lede">${esc(b.about?.body)}</p>
      <ul class="about-points">${(b.about?.points || []).map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('')}</ul>
      <a class="btn btn-dark" href="#book">Book a visit ${icon('arrow')}</a>
    </div>
  </div>
</section>

${reviews.length ? `<section class="section reviews" id="reviews">
  <div class="wrap">
    <div class="sec-head">
      <div>
        <p class="eyebrow mono">Reviews</p>
        <h2>Rated <span class="serif">${esc(b.rating)} out of 5</span> on Google.</h2>
      </div>
      <div class="rev-head-cta">
        <a class="btn btn-ghost" href="${esc(b.mapsUrl)}" target="_blank" rel="noopener">Read all ${esc(b.reviewCount)} reviews ${icon('arrow')}</a>
        <button class="round" type="button" aria-label="Previous review" data-rail-prev>${icon('arrowLeft')}</button>
        <button class="round" type="button" aria-label="Next review" data-rail-next>${icon('arrow')}</button>
      </div>
    </div>
  </div>
  <div class="rev-rail" data-rail>
    <div class="rev-track">
      ${reviews.map((r) => `<figure class="rev">
        ${icon('quote', 'i rev-q')}
        <blockquote>${esc(r.body)}</blockquote>
        <figcaption><span class="avatar" aria-hidden="true">${esc((r.name || '?').trim()[0])}</span><span><strong>${esc(r.name)}</strong><small>${esc(r.when_label || r.source)}</small></span></figcaption>
      </figure>`).join('')}
    </div>
  </div>
</section>` : ''}

<section class="section book" id="book">
  <div class="wrap book-grid">
    <div class="book-copy" id="visit">
      <p class="eyebrow mono">Book &amp; visit</p>
      <h2>Tell us what the car is doing.</h2>
      <p class="lede">Send the form and we will call or WhatsApp you back to confirm a time and price. For anything urgent, just call.</p>
      <div class="contact-cards">
        <a class="contact" href="${L.tel}"><span class="contact-i">${icon('phone')}</span><span><small>Call</small><strong>${esc(b.phone)}</strong></span></a>
        <a class="contact" href="${esc(L.wa(`Hello ${b.shortName}, I need help with my car.`))}" target="_blank" rel="noopener"><span class="contact-i wa">${whatsappIcon()}</span><span><small>WhatsApp</small><strong>${esc(b.phone)}</strong></span></a>
        <a class="contact" href="${esc(b.mapsUrl)}" target="_blank" rel="noopener"><span class="contact-i">${icon('pin')}</span><span><small>Workshop</small><strong>${esc(b.address)}</strong></span></a>
      </div>
      <div class="hours-card">
        <div class="hours-head"><span>${icon('clock')} Opening hours</span><span class="status" data-status hidden><i></i><span></span></span></div>
        ${hoursBlock(b)}
      </div>
    </div>
    <div class="book-card">
      ${bookingForm(services, b)}
    </div>
  </div>
</section>

<section class="section map-sec">
  <div class="wrap">
    <div class="map-card">
      <iframe title="Map to ${esc(b.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${encodeURIComponent(`${b.lat},${b.lng}`)}&z=16&output=embed"></iframe>
      <div class="map-info">
        <p class="mono">${esc(b.plusCode)}</p>
        <strong>${esc(b.address)}</strong>
        <a class="btn btn-dark btn-sm" href="${esc(b.mapsUrl)}" target="_blank" rel="noopener">${icon('map')}Get directions</a>
      </div>
    </div>
  </div>
</section>

${faqs.length ? `<section class="section faq" id="faq">
  <div class="wrap faq-grid">
    <div>
      <p class="eyebrow mono">FAQ</p>
      <h2>Good to know.</h2>
      <p class="lede">Anything else? Call or WhatsApp ${esc(b.phone)}.</p>
    </div>
    <div class="faq-list">
      ${faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.question)}<span>${icon('plus')}</span></summary><p>${esc(f.answer)}</p></details>`).join('')}
    </div>
  </div>
</section>` : ''}

<section class="section cta-sec">
  <div class="wrap">
    <div class="cta-card">
      <div>
        <p class="eyebrow mono"><span class="pulse"></span>Ready when you are</p>
        <h2>Car acting up? We will come and look.</h2>
      </div>
      <div class="cta-actions">
        <a class="btn btn-accent btn-lg" href="${L.tel}">${icon('phone')}Call ${esc(b.phone)}</a>
        <a class="btn btn-white btn-lg" href="${esc(L.wa(`Hello ${b.shortName}, I need help with my car.`))}" target="_blank" rel="noopener">${whatsappIcon()}WhatsApp</a>
      </div>
    </div>
  </div>
</section>

</main>
${footer(b, L, services)}
<script>window.__MG__=${JSON.stringify({ wa: b.whatsapp, name: b.shortName }).replace(/</g, '\\u003c')}</script>
${scripts()}
</body></html>`;
}

export function renderService(c, slug, origin) {
  const b = c.business;
  const L = links(b);
  const services = c.services || [];
  const s = services.find((x) => x.slug === slug);
  if (!s) return null;
  const others = services.filter((x) => x.slug !== slug).slice(0, 3);
  const hl = Array.isArray(s.highlights) ? s.highlights : [];
  const ld = {
    '@context': 'https://schema.org', '@type': 'Service', name: s.title, description: s.summary,
    provider: { '@type': 'AutoRepair', name: b.name, telephone: b.phoneIntl, address: { '@type': 'PostalAddress', streetAddress: b.address, addressLocality: 'Nairobi', addressCountry: 'KE' } },
    areaServed: 'Nairobi',
  };
  return `${head({ b, title: `${s.title} in Nairobi | ${b.name}`, description: s.summary, canonical: `${origin}/services/${s.slug}`, ogImage: s.images?.[0] ? origin + img(s.images[0].id) : '', jsonLd: ld })}
<body data-hours='${esc(JSON.stringify(b.hours || []))}'>
<a class="skip" href="#main">Skip to content</a>
${header(b, L, false)}
<main id="main">
<section class="svc-page">
  <div class="wrap">
    <nav class="crumbs mono" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#services">Services</a><span>/</span><span>${esc(s.title)}</span></nav>
    <div class="svc-page-grid">
      <div class="svc-page-media">${serviceMedia(s, { eager: true, large: true })}</div>
      <div class="svc-page-copy">
        <div class="svc-meta"><span class="svc-icon">${icon(s.icon)}</span><span class="mono">${esc(s.category)}</span></div>
        <h1>${esc(s.title)}</h1>
        <p class="lede">${esc(s.summary)}</p>
        <div class="svc-facts">
          <div><small>Price</small><strong>${priceLabel(s)}</strong></div>
          ${s.duration ? `<div><small>Typical time</small><strong>${esc(s.duration)}</strong></div>` : ''}
          <div><small>Where</small><strong>At your location</strong></div>
        </div>
        <p>${esc(s.description)}</p>
        ${hl.length ? `<ul class="ticks ticks-lg">${hl.map((h) => `<li>${icon('check')}${esc(h)}</li>`).join('')}</ul>` : ''}
        <div class="hero-cta">
          <a class="btn btn-accent btn-lg" href="#book">Book this service ${icon('arrow')}</a>
          <a class="btn btn-wa btn-lg" href="${esc(L.wa(`Hello ${b.shortName}, I would like to book: ${s.title}.`))}" target="_blank" rel="noopener">${whatsappIcon()}WhatsApp</a>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section book" id="book">
  <div class="wrap book-grid">
    <div class="book-copy">
      <p class="eyebrow mono">Book</p>
      <h2>Book ${esc(s.title.toLowerCase())}.</h2>
      <p class="lede">We will call or WhatsApp you back to confirm the time and price.</p>
      <div class="contact-cards">
        <a class="contact" href="${L.tel}"><span class="contact-i">${icon('phone')}</span><span><small>Call</small><strong>${esc(b.phone)}</strong></span></a>
        <a class="contact" href="${esc(b.mapsUrl)}" target="_blank" rel="noopener"><span class="contact-i">${icon('pin')}</span><span><small>Workshop</small><strong>${esc(b.address)}</strong></span></a>
      </div>
    </div>
    <div class="book-card">${bookingForm(services, b, s.slug)}</div>
  </div>
</section>

${others.length ? `<section class="section">
  <div class="wrap">
    <div class="sec-head"><div><p class="eyebrow mono">More services</p><h2>Also handled on-site.</h2></div><a class="btn btn-ghost" href="/#services">All services ${icon('arrow')}</a></div>
    <div class="svc-grid">${others.map(serviceCard).join('')}</div>
  </div>
</section>` : ''}
</main>
${footer(b, L, services)}
<script>window.__MG__=${JSON.stringify({ wa: b.whatsapp, name: b.shortName }).replace(/</g, '\\u003c')}</script>
${scripts()}
</body></html>`;
}

export function renderNotFound(c, origin) {
  const b = c.business;
  const L = links(b);
  return `${head({ b, title: `Page not found | ${b.name}`, description: b.tagline, canonical: origin + '/' })}
<body>
${header(b, L, false)}
<main id="main" class="nf wrap">
  <p class="mono eyebrow">Error 404 · page not found</p>
  <h1>This page took a wrong turn.</h1>
  <p class="lede">The page you were looking for is not here. Head home, or call us if your car needs help.</p>
  <div class="hero-cta"><a class="btn btn-accent btn-lg" href="/">Back to home ${icon('arrow')}</a><a class="btn btn-ghost btn-lg" href="${L.tel}">${icon('phone')}${esc(b.phone)}</a></div>
</main>
${footer(b, L, c.services || [])}
${scripts()}
</body></html>`;
}
