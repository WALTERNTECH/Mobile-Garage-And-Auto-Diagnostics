import { useEffect, useState } from 'react';
import { get, post, patch, del, imgUrl } from '../api.js';
import { PageHead, Loading, Empty, Button, Dialog, Field, Toggle, ImagePicker, OrderButtons, moveItem, useToast, useConfirm, Badge } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { useBadges } from '../Shell.jsx';

const LINKS = [
  { v: '#book', label: 'Booking form' },
  { v: '#services', label: 'Services section' },
  { v: 'tel', label: 'Call the garage' },
  { v: 'whatsapp', label: 'WhatsApp chat' },
  { v: 'maps', label: 'Directions (Google Maps)' },
  { v: '#reviews', label: 'Reviews section' },
  { v: 'custom', label: 'Another link…' },
];

function SlideEditor({ slide, onClose, onSaved }) {
  const [f, setF] = useState({ eyebrow: '', title: '', subtitle: '', cta_label: '', cta_href: '#book', active: true, ...slide });
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const preset = LINKS.find((l) => l.v === f.cta_href && l.v !== 'custom');
  const [custom, setCustom] = useState(!preset && !!f.cta_href);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.image_id) { toast('Choose a photo first', 'err'); return; }
    setBusy(true);
    try {
      const body = { image_id: f.image_id, eyebrow: f.eyebrow, title: f.title, subtitle: f.subtitle, cta_label: f.cta_label, cta_href: f.cta_label ? f.cta_href : '', active: f.active };
      const r = slide.id ? await patch(`slides/${slide.id}`, body) : await post('slides', body);
      onSaved(r);
      toast(slide.id ? 'Slide saved' : 'Slide added');
      onClose();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  return (
    <Dialog open onClose={onClose} title={slide.id ? 'Edit slide' : 'New slide'} size="lg"
      footer={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button busy={busy} onClick={save}>{slide.id ? 'Save slide' : 'Add slide'}</Button></>}>
      <div className="slide-edit">
        <div className="slide-prev">
          {f.image_id ? <img src={imgUrl(f.image_id)} alt="" /> : <div className="slide-prev-empty"><Icon name="image" size={28} /></div>}
          <div className="slide-prev-cap">
            {f.eyebrow && <span>{f.eyebrow}</span>}
            {f.title && <strong>{f.title}</strong>}
            {f.subtitle && <p>{f.subtitle}</p>}
            {f.cta_label && <i>{f.cta_label} →</i>}
          </div>
          <Button kind="white" size="sm" icon="image" className="slide-prev-btn" onClick={() => setPick(true)}>{f.image_id ? 'Change photo' : 'Choose photo'}</Button>
        </div>
        <div className="form-grid">
          <Field label="Small label" hint="Optional, above the title. e.g. Breakdown call-outs"><input value={f.eyebrow} onChange={set('eyebrow')} maxLength={60} /></Field>
          <Field label="Title"><input value={f.title} onChange={set('title')} maxLength={80} /></Field>
          <Field label="Text" wide><textarea rows={2} value={f.subtitle} onChange={set('subtitle')} maxLength={200} /></Field>
          <Field label="Button text" hint="Leave empty for no button."><input value={f.cta_label} onChange={set('cta_label')} maxLength={30} /></Field>
          <Field label="Button goes to">
            <select value={custom ? 'custom' : f.cta_href} onChange={(e) => { if (e.target.value === 'custom') { setCustom(true); setF({ ...f, cta_href: 'https://' }); } else { setCustom(false); setF({ ...f, cta_href: e.target.value }); } }}>
              {LINKS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}
            </select>
          </Field>
          {custom && <Field label="Link" wide hint="https://… or a page on the site like /services/computer-diagnostics"><input value={f.cta_href} onChange={set('cta_href')} maxLength={300} /></Field>}
          <div className="f-wide"><Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={f.active ? 'Showing on the website' : 'Hidden from the website'} /></div>
        </div>
      </div>
      <ImagePicker open={pick} onClose={() => setPick(false)} title="Slide photo" onPick={(imgs) => imgs[0] && setF((x) => ({ ...x, image_id: imgs[0].id }))} />
    </Dialog>
  );
}

export default function Slides() {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [pickNew, setPickNew] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useBadges();

  useEffect(() => {
    get('slides').then(setRows).catch((e) => toast(e.message, 'err'));
    if (new URLSearchParams(location.search).get('add')) { setPickNew(true); history.replaceState(null, '', '/slides'); }
  }, [toast]);

  const move = async (from, to) => {
    const next = moveItem(rows, from, to);
    setRows(next);
    try { await post('slides/reorder', { ids: next.map((r) => r.id) }); } catch (e) { toast(e.message, 'err'); }
  };
  const toggle = async (s) => {
    try { const r = await patch(`slides/${s.id}`, { active: !s.active }); setRows((x) => x.map((y) => (y.id === r.id ? { ...y, ...r } : y))); refresh(); }
    catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (s) => {
    if (!(await confirm({ title: 'Delete this slide?', body: 'It disappears from the homepage carousel. Its photo is removed too unless a service uses it.', ok: 'Delete slide', danger: true }))) return;
    try { await del(`slides/${s.id}`); setRows((x) => x.filter((y) => y.id !== s.id)); refresh(); toast('Slide deleted'); } catch (e) { toast(e.message, 'err'); }
  };
  const saved = (r) => { setRows((x) => (x.find((y) => y.id === r.id) ? x.map((y) => (y.id === r.id ? { ...y, ...r } : y)) : [...x, r])); refresh(); };

  return (
    <>
      <PageHead title="Homepage slides" sub="The sliding photos at the top of the homepage. They change every 6 seconds, in this order."
        actions={<Button icon="plus" onClick={() => setPickNew(true)}>Add slide</Button>} />
      {!rows ? <Loading rows={4} /> : !rows.length ? (
        <div className="card"><Empty icon="slides" title="No slides yet" action={<Button icon="plus" onClick={() => setPickNew(true)}>Add the first slide</Button>}>Add a photo with a short title. Two to five slides work best.</Empty></div>
      ) : (
        <div className="slide-list">
          {rows.map((s, i) => (
            <article key={s.id} className={`slide-card${s.active ? '' : ' off'}`}>
              <div className="slide-thumb" onClick={() => setEdit(s)}>
                <img src={imgUrl(s.image_id)} alt={s.alt || ''} loading="lazy" />
                <span className="slide-num">{i + 1}</span>
                {!s.active && <span className="slide-hidden"><Icon name="eyeOff" size={14} />Hidden</span>}
              </div>
              <div className="slide-body">
                {s.eyebrow && <small className="mono">{s.eyebrow}</small>}
                <strong>{s.title || <span className="muted">No title</span>}</strong>
                <p className="muted">{s.subtitle}</p>
                {s.cta_label && <Badge tone="grey">{s.cta_label} → {LINKS.find((l) => l.v === s.cta_href)?.label || s.cta_href}</Badge>}
              </div>
              <div className="slide-actions">
                <OrderButtons index={i} count={rows.length} onMove={move} />
                <Toggle checked={s.active} onChange={() => toggle(s)} label={s.active ? 'Live' : 'Hidden'} />
                <span className="grow" />
                <Button kind="ghost" size="sm" icon="edit" onClick={() => setEdit(s)}>Edit</Button>
                <button type="button" className="icon-btn danger" onClick={() => remove(s)} aria-label="Delete slide"><Icon name="trash" size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      <ImagePicker open={pickNew} onClose={() => setPickNew(false)} title="Photo for the new slide" onPick={(imgs) => imgs[0] && setEdit({ image_id: imgs[0].id })} />
      {edit && <SlideEditor slide={edit} onClose={() => setEdit(null)} onSaved={saved} />}
    </>
  );
}
