import { useEffect, useState } from 'react';
import { get, post, patch, del, imgUrl } from '../api.js';
import { PageHead, Loading, Empty, Button, Dialog, Field, Toggle, ImagePicker, OrderButtons, moveItem, useToast, useConfirm, Card, Badge } from '../ui.jsx';
import { Icon, SERVICE_ICONS } from '../icons.jsx';
import { navigate } from '../router.jsx';
import { useBadges } from '../Shell.jsx';

function NewService({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try { const r = await post('services', { title, active: false }); onCreated(r); } catch (e) { toast(e.message, 'err'); setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="New service" size="sm"
      footer={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button busy={busy} onClick={create} disabled={!title.trim()}>Create and edit</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); create(); }}>
        <Field label="Service name" hint="It starts hidden, so you can add photos and details before it goes live."><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></Field>
      </form>
    </Dialog>
  );
}

export function ServiceList() {
  const [rows, setRows] = useState(null);
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const { refresh } = useBadges();
  useEffect(() => {
    get('services').then(setRows).catch((e) => toast(e.message, 'err'));
    if (new URLSearchParams(location.search).get('add')) { setAdding(true); history.replaceState(null, '', '/services'); }
  }, [toast]);
  const move = async (from, to) => {
    const next = moveItem(rows, from, to);
    setRows(next);
    try { await post('services/reorder', { ids: next.map((r) => r.id) }); } catch (e) { toast(e.message, 'err'); }
  };
  const flip = async (s, key) => {
    try { const r = await patch(`services/${s.id}`, { [key]: !s[key] }); setRows((x) => x.map((y) => (y.id === r.id ? { ...y, ...r } : y))); refresh(); }
    catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <PageHead title="Services" sub="The service cards on the website. Each one has its own photo slider and page."
        actions={<Button icon="plus" onClick={() => setAdding(true)}>Add service</Button>} />
      {!rows ? <Loading rows={5} /> : !rows.length ? (
        <div className="card"><Empty icon="grid" title="No services yet" action={<Button icon="plus" onClick={() => setAdding(true)}>Add a service</Button>} /></div>
      ) : (
        <div className="svc-list">
          {rows.map((s, i) => (
            <article key={s.id} className={`svc-row${s.active ? '' : ' off'}`}>
              <button type="button" className="svc-thumb" onClick={() => navigate(`/services/${s.id}`)} aria-label={`Edit ${s.title}`}>
                {s.images[0] ? <img src={imgUrl(s.images[0].image_id)} alt="" loading="lazy" /> : <Icon name={s.icon} size={22} />}
                <span>{s.images.length} <Icon name="image" size={12} /></span>
              </button>
              <div className="svc-main" onClick={() => navigate(`/services/${s.id}`)}>
                <div className="svc-title"><strong>{s.title}</strong>{s.featured && <Badge tone="accent">Popular</Badge>}{!s.active && <Badge tone="grey">Hidden</Badge>}{!s.images.length && <Badge tone="amber">No photos</Badge>}</div>
                <small className="muted">{[s.category, s.price_from ? `From ${s.price_from}` : 'Quote on inspection'].filter(Boolean).join(' · ')}</small>
                <p className="muted clamp">{s.summary}</p>
              </div>
              <div className="svc-side">
                <Toggle checked={s.active} onChange={() => flip(s, 'active')} label={s.active ? 'Live' : 'Hidden'} />
                <OrderButtons index={i} count={rows.length} onMove={move} />
                <Button kind="ghost" size="sm" icon="edit" onClick={() => navigate(`/services/${s.id}`)}>Edit</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {adding && <NewService onClose={() => setAdding(false)} onCreated={(r) => { refresh(); navigate(`/services/${r.id}`); }} />}
    </>
  );
}

function ListEditor({ items, onChange, max = 8, placeholder }) {
  return (
    <div className="list-ed">
      {items.map((v, i) => (
        <div key={i} className="list-ed-row">
          <Icon name="check" size={15} className="list-ed-i" />
          <input value={v} maxLength={90} placeholder={placeholder} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <OrderButtons index={i} count={items.length} onMove={(a, b) => onChange(moveItem(items, a, b))} />
          <button type="button" className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="close" size={15} /></button>
        </div>
      ))}
      {items.length < max && <Button kind="ghost" size="sm" icon="plus" onClick={() => onChange([...items, ''])}>Add a point</Button>}
    </div>
  );
}

export function ServiceEditor({ id }) {
  const [s, setS] = useState(null);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState(false);
  const [cats, setCats] = useState([]);
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useBadges();

  useEffect(() => {
    get('services').then((all) => {
      const x = all.find((r) => r.id === id);
      if (!x) { toast('That service no longer exists', 'err'); navigate('/services'); return; }
      setS(x);
      setF({ ...x, highlights: Array.isArray(x.highlights) ? x.highlights : [] });
      setCats([...new Set(all.map((r) => r.category).filter(Boolean))]);
    }).catch((e) => toast(e.message, 'err'));
  }, [id, toast]);

  if (!f) return <Loading rows={6} />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const dirty = JSON.stringify({ ...f, images: 0 }) !== JSON.stringify({ ...s, highlights: Array.isArray(s.highlights) ? s.highlights : [], images: 0 });

  const save = async () => {
    setBusy(true);
    try {
      const body = { title: f.title, slug: f.slug, category: f.category, summary: f.summary, description: f.description, highlights: f.highlights.filter((h) => h.trim()), price_from: f.price_from, duration: f.duration, icon: f.icon, featured: f.featured, active: f.active };
      const r = await patch(`services/${id}`, body);
      const next = { ...s, ...r };
      setS(next); setF({ ...next, highlights: r.highlights });
      refresh();
      toast('Service saved');
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const addImages = async (imgs) => {
    try {
      const added = [];
      for (const im of imgs) added.push({ ...(await post(`services/${id}/images`, { image_id: im.id })), width: im.width, height: im.height });
      setS((x) => ({ ...x, images: [...x.images, ...added] }));
      setF((x) => ({ ...x, images: [...x.images, ...added] }));
      toast(`${added.length} photo${added.length > 1 ? 's' : ''} added`);
    } catch (e) { toast(e.message, 'err'); }
  };
  const setImages = (images) => { setS((x) => ({ ...x, images })); setF((x) => ({ ...x, images })); };
  const moveImg = async (a, b) => {
    const next = moveItem(f.images, a, b);
    setImages(next);
    try { await post(`services/${id}/images/reorder`, { ids: next.map((r) => r.id) }); } catch (e) { toast(e.message, 'err'); }
  };
  const caption = async (im, text) => {
    try { await patch(`services/${id}/images/${im.id}`, { caption: text }); setImages(f.images.map((x) => (x.id === im.id ? { ...x, caption: text } : x))); toast('Caption saved'); }
    catch (e) { toast(e.message, 'err'); }
  };
  const removeImg = async (im) => {
    if (!(await confirm({ title: 'Remove this photo?', body: 'It is taken off this service. If nothing else uses it, it is deleted.', ok: 'Remove', danger: true }))) return;
    try { await del(`services/${id}/images/${im.id}`); setImages(f.images.filter((x) => x.id !== im.id)); refresh(); } catch (e) { toast(e.message, 'err'); }
  };
  const removeService = async () => {
    if (!(await confirm({ title: `Delete "${s.title}"?`, body: 'The service, its page and its photos (unless used elsewhere) are deleted. To take it off the website for now, switch it to Hidden instead.', ok: 'Delete service', danger: true }))) return;
    try { await del(`services/${id}`); refresh(); toast('Service deleted'); navigate('/services'); } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <PageHead title={s.title} sub={<><button type="button" className="linkish" onClick={() => navigate('/services')}>Services</button> · page address /services/{s.slug}</>}
        actions={<><Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={f.active ? 'Live' : 'Hidden'} /><Button busy={busy} disabled={!dirty} onClick={save}>{dirty ? 'Save changes' : 'Saved'}</Button></>} />

      <div className="ed-grid">
        <div className="ed-main">
          <Card title="Photos" sub="These slide inside the service card and on the service page. First photo shows first."
            actions={<Button kind="dark" size="sm" icon="plus" onClick={() => setPick(true)} disabled={f.images.length >= 12}>Add photos</Button>}>
            {!f.images.length ? <Empty icon="image" title="No photos yet" action={<Button kind="dark" icon="upload" onClick={() => setPick(true)}>Upload photos</Button>}>Add at least one. Several photos turn the card into a slider.</Empty> : (
              <div className="gal">
                {f.images.map((im, i) => (
                  <figure key={im.id} className="gal-i">
                    <img src={imgUrl(im.image_id)} alt="" loading="lazy" />
                    {i === 0 && <span className="gal-first">Cover</span>}
                    <figcaption>
                      <input defaultValue={im.caption} placeholder="Caption (optional)" maxLength={80} onBlur={(e) => e.target.value !== (im.caption || '') && caption(im, e.target.value)} />
                      <div className="gal-act">
                        <OrderButtons index={i} count={f.images.length} onMove={moveImg} />
                        <button type="button" className="icon-btn danger" onClick={() => removeImg(im)} aria-label="Remove photo"><Icon name="trash" size={15} /></button>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </Card>

          <Card title="Details">
            <div className="form-grid">
              <Field label="Name"><input value={f.title} onChange={set('title')} maxLength={80} /></Field>
              <Field label="Category" hint="Used for the filter buttons on the website.">
                <input value={f.category} onChange={set('category')} maxLength={40} list="cats" />
                <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="Short summary" wide hint="Shown on the card. One or two sentences."><textarea rows={2} value={f.summary} onChange={set('summary')} maxLength={240} /></Field>
              <Field label="Full description" wide hint="Shown on the service page."><textarea rows={5} value={f.description} onChange={set('description')} maxLength={2000} /></Field>
            </div>
          </Card>

          <Card title="What is included" sub="Short points with ticks. The first three show on the card.">
            <ListEditor items={f.highlights} onChange={(h) => setF({ ...f, highlights: h })} placeholder="e.g. Fault codes read and explained" />
          </Card>
        </div>

        <div className="ed-side">
          <Card title="Price & time">
            <Field label="Price from" hint='Leave empty to show "Quote on inspection".'><input value={f.price_from} onChange={set('price_from')} maxLength={40} placeholder="KES 2,500" /></Field>
            <Field label="Typical time"><input value={f.duration} onChange={set('duration')} maxLength={40} placeholder="45–60 minutes" /></Field>
          </Card>
          <Card title="Display">
            <Toggle checked={f.featured} onChange={(v) => setF({ ...f, featured: v })} label='Show "Popular" tag' />
            <div className="f"><span className="f-label">Icon</span>
              <div className="icons">{SERVICE_ICONS.map((n) => <button type="button" key={n} className={f.icon === n ? 'on' : ''} onClick={() => setF({ ...f, icon: n })} aria-label={n}><Icon name={n} size={18} /></button>)}</div>
            </div>
            <Field label="Page address" hint="Lowercase words with dashes."><input value={f.slug} onChange={set('slug')} maxLength={60} /></Field>
          </Card>
          <Card title="Danger zone">
            <Button kind="danger-ghost" icon="trash" onClick={removeService}>Delete this service</Button>
          </Card>
        </div>
      </div>
      {dirty && <div className="savebar"><span>You have unsaved changes</span><Button kind="ghost" size="sm" onClick={() => setF({ ...s, highlights: Array.isArray(s.highlights) ? s.highlights : [] })}>Discard</Button><Button size="sm" busy={busy} onClick={save}>Save</Button></div>}
      <ImagePicker open={pick} multiple onClose={() => setPick(false)} title={`Photos for ${s.title}`} onPick={addImages} />
    </>
  );
}
