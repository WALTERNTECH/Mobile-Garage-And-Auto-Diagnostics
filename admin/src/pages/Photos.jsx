import { useEffect, useState } from 'react';
import { get, patch, del, imgUrl } from '../api.js';
import { PageHead, Loading, Empty, Button, Dialog, Field, ImagePicker, useToast, useConfirm, Badge, fmtBytes, fmtDate } from '../ui.jsx';
import { useBadges } from '../Shell.jsx';

export default function Photos() {
  const [rows, setRows] = useState(null);
  const [up, setUp] = useState(false);
  const [open, setOpen] = useState(null);
  const [alt, setAlt] = useState('');
  const [filter, setFilter] = useState('all');
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useBadges();
  const load = () => get('images').then(setRows).catch((e) => toast(e.message, 'err'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const used = (r) => r.in_slides + r.in_services + (r.in_about ? 1 : 0);
  const shown = (rows || []).filter((r) => filter === 'all' || (filter === 'unused' ? !used(r) : used(r)));
  const saveAlt = async () => {
    try { await patch(`images/${open.id}`, { alt }); setRows((l) => l.map((r) => (r.id === open.id ? { ...r, alt } : r))); toast('Description saved'); setOpen(null); }
    catch (e) { toast(e.message, 'err'); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this photo?', body: 'It is removed for good.', ok: 'Delete', danger: true }))) return;
    try { await del(`images/${open.id}`); setRows((l) => l.filter((r) => r.id !== open.id)); setOpen(null); refresh(); toast('Photo deleted'); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <PageHead title="Photo library" sub="Every photo used on the website. Upload here, then pick them in slides and services."
        actions={<Button icon="upload" onClick={() => setUp(true)}>Upload photos</Button>} />
      {rows && rows.length > 0 && (
        <div className="toolbar"><div className="chips">
          {[['all', 'All', rows.length], ['used', 'In use', rows.filter(used).length], ['unused', 'Not used', rows.filter((r) => !used(r)).length]].map(([k, l, n]) => (
            <button type="button" key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l} <em>{n}</em></button>
          ))}
        </div></div>
      )}
      {!rows ? <Loading rows={4} /> : !shown.length ? (
        <div className="card"><Empty icon="image" title={rows.length ? 'Nothing here' : 'No photos yet'} action={!rows.length && <Button icon="upload" onClick={() => setUp(true)}>Upload photos</Button>} /></div>
      ) : (
        <div className="photos">
          {shown.map((r) => (
            <button type="button" key={r.id} className="photo" onClick={() => { setOpen(r); setAlt(r.alt || ''); }}>
              <img src={imgUrl(r.id)} alt={r.alt} loading="lazy" />
              <span className="photo-meta">
                {r.in_slides > 0 && <Badge tone="blue">Slide</Badge>}
                {r.in_services > 0 && <Badge tone="violet">Service ×{r.in_services}</Badge>}
                {r.in_about && <Badge tone="green">About</Badge>}
                {!used(r) && <Badge tone="grey">Not used</Badge>}
              </span>
            </button>
          ))}
        </div>
      )}
      <ImagePicker open={up} multiple onClose={() => setUp(false)} title="Upload photos" onPick={() => { load(); refresh(); toast('Uploaded'); }} />
      {open && (
        <Dialog open onClose={() => setOpen(null)} title="Photo" size="md"
          footer={<><Button kind="danger-ghost" icon="trash" disabled={used(open) > 0} onClick={remove}>Delete</Button><span className="grow" /><Button kind="ghost" onClick={() => setOpen(null)}>Close</Button><Button onClick={saveAlt}>Save</Button></>}>
          <img className="photo-big" src={imgUrl(open.id)} alt={open.alt} />
          <p className="muted small">{open.width}×{open.height} · {fmtBytes(open.size)} · added {fmtDate(open.created_at)}{used(open) > 0 ? ' · in use, so it cannot be deleted' : ''}</p>
          <Field label="Description" hint="Describes the photo for Google and screen readers."><input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} /></Field>
        </Dialog>
      )}
    </>
  );
}
