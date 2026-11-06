(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: border on scroll, mobile sheet */
  const nav = $('[data-nav]');
  const onScroll = () => nav && nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const burger = $('[data-burger]');
  const sheet = $('[data-sheet]');
  if (burger && sheet) {
    const set = (open) => {
      sheet.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    burger.addEventListener('click', () => set(sheet.hidden));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* Open / closed, computed in Nairobi time so cached pages stay correct */
  let hours = [];
  try { hours = JSON.parse(document.body.dataset.hours || '[]'); } catch { hours = []; }
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).reduce((a, p) => ((a[p.type] = p.value), a), {});
  const today = parts.weekday;
  const nowMin = Number(parts.hour) * 60 + Number(parts.minute);
  const toMin = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const fmt = (t) => { const [h, m] = String(t).split(':').map(Number); const hh = h % 12 || 12; return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''} ${h >= 12 ? 'pm' : 'am'}`; };
  const row = hours.find((h) => h.day === today);
  let label = '', open = false;
  if (hours.length) {
    if (row && !row.closed && nowMin >= toMin(row.open) && nowMin < toMin(row.close)) {
      open = true;
      label = `Open · closes ${fmt(row.close)}`;
    } else {
      let next = null;
      for (let i = 0; i < 8 && !next; i++) {
        const d = days[(days.indexOf(today) + i) % 7];
        const r = hours.find((h) => h.day === d);
        if (r && !r.closed && (i > 0 || nowMin < toMin(r.open))) next = { r, i };
      }
      label = next ? `Closed · opens ${next.i === 0 ? '' : next.i === 1 ? 'tomorrow ' : next.r.day.slice(0, 3) + ' '}${fmt(next.r.open)}` : 'Closed';
    }
    $$('[data-status]').forEach((el) => {
      el.hidden = false;
      el.classList.add(open ? 'open' : 'closed');
      $('span', el).textContent = label;
    });
    $$('.hours li').forEach((li) => li.classList.toggle('today', li.dataset.day === today));
  }

  /* Hero carousel */
  const stage = $('[data-carousel]');
  if (stage) {
    const slides = $$('.stage-slide', stage);
    const bars = $$('.stage-bars button', stage);
    const DUR = 6000;
    let i = 0, timer = null, started = 0, remaining = DUR, paused = false;
    stage.style.setProperty('--dur', DUR / 1000 + 's');
    const show = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
      bars.forEach((b, k) => {
        b.classList.remove('on', 'done');
        void b.offsetWidth; // restart the fill animation
        if (k < i) b.classList.add('done');
        if (k === i) b.classList.add('on');
      });
      const img = $('img', slides[i]);
      if (img && img.loading === 'lazy') img.loading = 'eager';
      const nextImg = $('img', slides[(i + 1) % slides.length]);
      if (nextImg) nextImg.loading = 'eager';
      schedule(DUR);
    };
    const schedule = (ms) => {
      clearTimeout(timer);
      if (slides.length < 2 || reduce) return;
      remaining = ms; started = Date.now();
      if (!paused) timer = setTimeout(() => show(i + 1), ms);
    };
    const pause = () => { if (paused) return; paused = true; stage.classList.add('paused'); clearTimeout(timer); remaining -= Date.now() - started; };
    const resume = () => { if (!paused) return; paused = false; stage.classList.remove('paused'); schedule(Math.max(remaining, 400)); };
    $('[data-next]', stage)?.addEventListener('click', () => show(i + 1));
    $('[data-prev]', stage)?.addEventListener('click', () => show(i - 1));
    bars.forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.go))));
    stage.addEventListener('mouseenter', pause);
    stage.addEventListener('mouseleave', resume);
    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
    let x0 = null, y0 = null;
    stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; pause(); }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (x0 !== null) {
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { paused = false; stage.classList.remove('paused'); show(i + (dx < 0 ? 1 : -1)); }
        else resume();
      }
      x0 = null;
    });
    stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); });
    if (reduce) bars.forEach((b, k) => b.classList.toggle('done', k <= i));
    schedule(DUR);
  }

  /* Service photo sliders */
  $$('[data-slider]').forEach((sl) => {
    const track = $('[data-track]', sl);
    const dots = $$('.media-dots i', sl);
    const count = $('[data-count]', sl);
    const prev = $('[data-prev]', sl), next = $('[data-next]', sl);
    const n = $$('.media-slide', sl).length;
    if (!track || n < 2) return;
    const idx = () => Math.round(track.scrollLeft / track.clientWidth);
    const update = () => {
      const k = idx();
      dots.forEach((d, j) => d.classList.toggle('on', j === k));
      if (count) count.textContent = `${k + 1} / ${n}`;
      if (prev) prev.disabled = k === 0;
      if (next) next.disabled = k === n - 1;
    };
    const go = (d) => track.scrollTo({ left: (idx() + d) * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    prev?.addEventListener('click', (e) => { e.preventDefault(); go(-1); });
    next?.addEventListener('click', (e) => { e.preventDefault(); go(1); });
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
    // drag with a mouse on desktop
    let down = false, sx = 0, sl0 = 0, moved = false;
    track.addEventListener('mousedown', (e) => { down = true; moved = false; sx = e.clientX; sl0 = track.scrollLeft; track.style.scrollSnapType = 'none'; e.preventDefault(); });
    addEventListener('mousemove', (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; track.scrollLeft = sl0 - dx; });
    addEventListener('mouseup', () => {
      if (!down) return; down = false; track.style.scrollSnapType = '';
      const k = Math.round(track.scrollLeft / track.clientWidth);
      track.scrollTo({ left: k * track.clientWidth, behavior: 'smooth' });
    });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    update();
  });

  /* Reviews rail arrows */
  const rail = $('[data-rail]');
  if (rail) {
    const card = () => ($('.rev', rail)?.getBoundingClientRect().width || 400) + 20;
    const pv = $('[data-rail-prev]'), nx = $('[data-rail-next]');
    const upd = () => {
      if (pv) pv.disabled = rail.scrollLeft < 8;
      if (nx) nx.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
    };
    pv?.addEventListener('click', () => rail.scrollBy({ left: -card(), behavior: 'smooth' }));
    nx?.addEventListener('click', () => rail.scrollBy({ left: card(), behavior: 'smooth' }));
    rail.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    addEventListener('resize', upd);
    upd();
  }

  /* Service filters */
  const grid = $('[data-svc-grid]');
  $$('[data-filter]').forEach((chip) => chip.addEventListener('click', () => {
    $$('[data-filter]').forEach((c) => c.classList.toggle('on', c === chip));
    const f = chip.dataset.filter;
    $$('.svc', grid).forEach((card) => card.classList.toggle('hide', !!f && card.dataset.cat !== f));
  }));

  /* Reveal on scroll */
  if (!reduce && 'IntersectionObserver' in window) {
    const els = $$('.sec-head, .svc, .steps li, .rev, .about-media, .about-copy, .stat, .book-card, .book-copy, .faq-list, .cta-card, .map-card');
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach((el, k) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('reveal');
      el.style.transitionDelay = `${(k % 3) * 70}ms`;
      io.observe(el);
    });
  }

  /* Mobile dock: step aside while the booking form is on screen */
  const dock = $('[data-dock]');
  const book = $('#book .book-card');
  if (dock && book && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => dock.classList.toggle('away', en.isIntersecting), { threshold: 0.15 }).observe(book);
  }

  /* Booking form */
  $$('[data-book]').forEach((form) => {
    const msg = $('[data-msg]', form);
    const btn = $('button[type=submit]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.className = 'form-msg';
      msg.textContent = '';
      const data = Object.fromEntries(new FormData(form));
      data.phone = String(data.phone || '').replace(/[^\d+ ]/g, '').trim();
      const bad = [];
      if (String(data.name || '').trim().length < 2) bad.push('name');
      if (!/^\+?[0-9 ]{9,16}$/.test(data.phone)) bad.push('phone');
      $$('input', form).forEach((inp) => inp.classList.toggle('bad', bad.includes(inp.name)));
      if (bad.length) {
        msg.className = 'form-msg err';
        msg.textContent = bad.includes('name') ? 'Please enter your name.' : 'Please enter a phone number we can reach you on.';
        $(`[name=${bad[0]}]`, form).focus();
        return;
      }
      btn.setAttribute('aria-busy', 'true');
      $('span', btn).textContent = 'Sending…';
      try {
        const r = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const out = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(out.error || 'Something went wrong. Please call or WhatsApp us.');
        const cfg = window.__MG__ || {};
        const lines = [
          `Hello ${cfg.name || ''}, I just sent a booking request (${out.ref}).`,
          `Name: ${data.name}`, `Phone: ${data.phone}`,
          data.vehicle && `Car: ${data.vehicle}`, data.service && `Service: ${data.service}`,
          data.location && `Location: ${data.location}`, data.date && `Date: ${data.date}`,
          data.message && `Issue: ${data.message}`,
        ].filter(Boolean).join('\n');
        msg.className = 'form-msg ok';
        msg.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = `Request received · ${out.ref}`;
        const p = document.createElement('p');
        p.textContent = 'Thank you. We will call or WhatsApp you shortly to confirm the time and price. Want a faster reply? Send it on WhatsApp too.';
        const a = document.createElement('a');
        a.className = 'btn btn-wa';
        a.href = `https://wa.me/${cfg.wa || ''}?text=${encodeURIComponent(lines)}`;
        a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Send on WhatsApp';
        msg.append(strong, p, a);
        form.reset();
      } catch (err) {
        msg.className = 'form-msg err';
        msg.textContent = err.message;
      } finally {
        btn.removeAttribute('aria-busy');
        $('span', btn).textContent = 'Send booking request';
      }
    });
  });
})();
