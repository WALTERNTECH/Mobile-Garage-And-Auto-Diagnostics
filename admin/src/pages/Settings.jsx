import { useEffect, useState } from 'react';
import { get, put, imgUrl } from '../api.js';
import { PageHead, Loading, Button, Card, Field, Toggle, ImagePicker, OrderButtons, moveItem, useToast, timeAgo } from '../ui.jsx';
import { Icon } from '../icons.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TITLES = {
  contact: ['Contact & location', 'Phone, WhatsApp, address and map pin used across the website.'],
  hours: ['Opening hours', 'Shown on the website, and used for the live "Open now" badge (Nairobi time).'],
  homepage: ['Homepage text', 'The headline, the "why us" section and the three steps.'],
  announcement: ['Announcement bar', 'A thin bar across the top of every page. Use it for offers, holidays or closures.'],
  seo: ['Search & social', 'How the website shows on Google and when shared, plus social links.'],
};

function Points({ items, onChange }) {
  return (
    <div className="list-ed">
      {items.map((v, i) => (
        <div key={i} className="list-ed-row">
          <Icon name="check" size={15} className="list-ed-i" />
          <input value={v} maxLength={120} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <OrderButtons index={i} count={items.length} onMove={(a, b) => onChange(moveItem(items, a, b))} />
          <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="close" size={15} /></button>
        </div>
      ))}
      {items.length < 8 && <Button kind="ghost" size="sm" icon="plus" onClick={() => onChange([...items, ''])}>Add a point</Button>}
    </div>
  );
}

export default function Settings({ section }) {
  const [orig, setOrig] = useState(null);
  const [v, setV] = useState(null);
  const [at, setAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);
  const toast = useToast();

  useEffect(() => {
    get('settings').then((r) => {
      const val = r.value || {};
      val.hours = DAYS.map((day) => ({ day, open: '07:30', close: '18:30', closed: false, ...(val.hours || []).find((h) => h.day === day) }));
      val.steps = val.steps?.length ? val.steps : [
        { title: 'Call or WhatsApp', body: 'Tell us the car, where it is and what it is doing, and we agree a time to come out.' },
        { title: 'We come and scan', body: 'We arrive with the scan tool and kit, read the fault codes and check the car properly.' },
        { title: 'Explain, then fix', body: 'We walk you through what we found and the options. Then we fix it, often right there.' },
      ];
      val.hero ||= {}; val.about ||= { points: [] }; val.about.points ||= []; val.announcement ||= {}; val.social ||= {}; val.seo ||= {};
      setOrig(JSON.stringify(val)); setV(val); setAt(r.updated_at);
    }).catch((e) => toast(e.message, 'err'));
  }, [toast]);

  if (!v) return <><PageHead title={TITLES[section]?.[0] || 'Settings'} /><Loading rows={5} /></>;
  const dirty = JSON.stringify(v) !== orig;
  const set = (path, val) => setV((o) => {
    const n = structuredClone(o);
    const keys = path.split('.');
    let t = n; keys.slice(0, -1).forEach((k) => { t = t[k] ||= {}; });
    t[keys.at(-1)] = val;
    return n;
  });
  const inp = (path, props = {}) => ({ value: path.split('.').reduce((o, k) => o?.[k], v) ?? '', onChange: (e) => set(path, e.target.value), ...props });

  const save = async () => {
    setBusy(true);
    try {
      const r = await put('settings', { value: v });
      const val = { ...v, ...r.value };
      setOrig(JSON.stringify(val)); setV(val); setAt(r.updated_at);
      toast('Saved. The website updates within a minute.');
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const [title, sub] = TITLES[section] || TITLES.contact;

  return (
    <>
      <PageHead title={title} sub={<>{sub}{at && <span className="muted"> · saved {timeAgo(at)}</span>}</>}
        actions={<Button busy={busy} disabled={!dirty} onClick={save}>{dirty ? 'Save changes' : 'Saved'}</Button>} />

      {section === 'contact' && (
        <div className="cols">
          <Card title="Business">
            <div className="form-grid">
              <Field label="Business name" wide><input {...inp('name')} maxLength={80} /></Field>
              <Field label="Short name" hint="Used in WhatsApp greetings."><input {...inp('shortName')} maxLength={40} /></Field>
              <Field label="Tagline"><input {...inp('tagline')} maxLength={140} /></Field>
            </div>
          </Card>
          <Card title="Phone & WhatsApp">
            <div className="form-grid">
              <Field label="Phone as shown" hint="e.g. 0723 595977"><input {...inp('phone')} maxLength={20} /></Field>
              <Field label="Phone for calling" hint="International format, e.g. +254723595977"><input {...inp('phoneIntl')} maxLength={16} /></Field>
              <Field label="WhatsApp number" hint="Digits only, with 254, e.g. 254723595977"><input {...inp('whatsapp')} maxLength={16} inputMode="numeric" /></Field>
              <Field label="Email" hint="Optional."><input {...inp('email')} type="email" maxLength={120} /></Field>
            </div>
          </Card>
          <Card title="Location">
            <div className="form-grid">
              <Field label="Address"><input {...inp('address')} maxLength={120} /></Field>
              <Field label="Plus code"><input {...inp('plusCode')} maxLength={40} /></Field>
              <Field label="Google Maps link" wide><input {...inp('mapsUrl')} maxLength={300} /></Field>
              <Field label="Map pin latitude"><input {...inp('lat')} inputMode="decimal" /></Field>
              <Field label="Map pin longitude"><input {...inp('lng')} inputMode="decimal" /></Field>
            </div>
          </Card>
          <Card title="Google rating" sub="Update these from your Google listing now and then.">
            <div className="form-grid">
              <Field label="Rating (out of 5)"><input {...inp('rating')} inputMode="decimal" /></Field>
              <Field label="Number of reviews"><input {...inp('reviewCount')} inputMode="numeric" /></Field>
            </div>
          </Card>
        </div>
      )}

      {section === 'hours' && (
        <Card pad={false}>
          <ul className="hours-ed">
            {v.hours.map((h, i) => (
              <li key={h.day}>
                <strong>{h.day}</strong>
                <Toggle checked={!h.closed} onChange={(on) => set(`hours.${i}.closed`, !on)} label={h.closed ? 'Closed' : 'Open'} />
                <div className={`hours-t${h.closed ? ' dim' : ''}`}>
                  <input type="time" value={h.open || ''} disabled={h.closed} onChange={(e) => set(`hours.${i}.open`, e.target.value)} aria-label={`${h.day} opens`} />
                  <span>to</span>
                  <input type="time" value={h.close || ''} disabled={h.closed} onChange={(e) => set(`hours.${i}.close`, e.target.value)} aria-label={`${h.day} closes`} />
                </div>
                {i > 0 && <button type="button" className="linkish" onClick={() => set(`hours.${i}`, { ...v.hours[i - 1], day: h.day })}>Same as {v.hours[i - 1].day.slice(0, 3)}</button>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {section === 'homepage' && (
        <div className="cols">
          <Card title="Top of the homepage">
            <div className="form-grid">
              <Field label="Small label" wide><input {...inp('hero.eyebrow')} maxLength={80} /></Field>
              <Field label="Headline" wide hint="Keep it short; it is the biggest text on the site."><input {...inp('hero.title')} maxLength={90} /></Field>
              <Field label="Text under the headline" wide><textarea rows={3} {...inp('hero.subtitle')} maxLength={260} /></Field>
            </div>
          </Card>
          <Card title="Why drivers call us" sub="The section with the photo and the ticked points.">
            <div className="about-ed">
              <button type="button" className="about-img" onClick={() => setPick(true)}>
                {v.about.image_id ? <img src={imgUrl(v.about.image_id)} alt="" /> : <span><Icon name="image" size={22} />Uses the first slide photo</span>}
                <em>{v.about.image_id ? 'Change photo' : 'Choose a photo'}</em>
              </button>
              {v.about.image_id && <button type="button" className="linkish" onClick={() => set('about.image_id', '')}>Use the first slide photo instead</button>}
            </div>
            <div className="form-grid">
              <Field label="Title" wide><input {...inp('about.title')} maxLength={90} /></Field>
              <Field label="Text" wide><textarea rows={4} {...inp('about.body')} maxLength={900} /></Field>
            </div>
            <span className="f-label">Points</span>
            <Points items={v.about.points} onChange={(p) => set('about.points', p)} />
          </Card>
          <Card title="How it works" sub="Three short steps.">
            {v.steps.map((s, i) => (
              <div key={i} className="step-ed">
                <span className="mono">0{i + 1}</span>
                <div className="form-grid">
                  <Field label="Step title"><input value={s.title} maxLength={60} onChange={(e) => set(`steps.${i}.title`, e.target.value)} /></Field>
                  <Field label="Step text" wide><textarea rows={2} value={s.body} maxLength={220} onChange={(e) => set(`steps.${i}.body`, e.target.value)} /></Field>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {section === 'announcement' && (
        <Card>
          <div className={`ann-prev${v.announcement.enabled && v.announcement.text ? '' : ' off'}`}>{v.announcement.text || 'Your announcement shows here'}{v.announcement.link && ' →'}</div>
          <Toggle checked={!!v.announcement.enabled} onChange={(on) => set('announcement.enabled', on)} label={v.announcement.enabled ? 'Showing on the website' : 'Off'} />
          <div className="form-grid">
            <Field label="Message" wide hint="One short line, e.g. Closed on 25 December. Breakdown call-outs still available."><input {...inp('announcement.text')} maxLength={140} /></Field>
            <Field label="Link (optional)" wide hint="#book, tel, whatsapp, maps, /services/… or https://…"><input {...inp('announcement.link')} maxLength={300} /></Field>
          </div>
        </Card>
      )}

      {section === 'seo' && (
        <div className="cols">
          <Card title="Google & sharing">
            <div className="serp">
              <small>Google preview</small>
              <strong>{v.seo.title || v.name}</strong>
              <p>{v.seo.description || v.tagline}</p>
            </div>
            <div className="form-grid">
              <Field label="Page title" wide hint={`${(v.seo.title || '').length}/60 characters is ideal.`}><input {...inp('seo.title')} maxLength={90} /></Field>
              <Field label="Description" wide hint={`${(v.seo.description || '').length}/160 characters is ideal.`}><textarea rows={3} {...inp('seo.description')} maxLength={200} /></Field>
            </div>
          </Card>
          <Card title="Social links" sub="Shown in the footer when filled in. Must start with https://">
            <div className="form-grid">
              <Field label="Facebook" wide><input {...inp('social.facebook')} maxLength={300} placeholder="https://facebook.com/…" /></Field>
              <Field label="Instagram" wide><input {...inp('social.instagram')} maxLength={300} placeholder="https://instagram.com/…" /></Field>
              <Field label="TikTok" wide><input {...inp('social.tiktok')} maxLength={300} placeholder="https://tiktok.com/@…" /></Field>
            </div>
          </Card>
        </div>
      )}

      {dirty && <div className="savebar"><span>You have unsaved changes</span><Button kind="ghost" size="sm" onClick={() => setV(JSON.parse(orig))}>Discard</Button><Button size="sm" busy={busy} onClick={save}>Save</Button></div>}
      <ImagePicker open={pick} onClose={() => setPick(false)} title="Photo for “Why drivers call us”" onPick={(imgs) => imgs[0] && set('about.image_id', imgs[0].id)} />
    </>
  );
}
