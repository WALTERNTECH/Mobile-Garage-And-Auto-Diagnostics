import { useEffect, useState } from 'react';
import { get, post, patch, del } from '../api.js';
import { PageHead, Loading, Empty, Button, Dialog, Field, Toggle, OrderButtons, moveItem, useToast, useConfirm } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { useBadges } from '../Shell.jsx';

// Reviews and FAQs: ordered lists of short text items with show/hide.
const KINDS = {
  reviews: {
    title: 'Reviews', sub: 'Customer reviews shown on the homepage. Copy them from Google with the customer\'s name.',
    one: 'review', icon: 'quote',
    fields: [
      { k: 'name', label: 'Customer name', max: 80 },
      { k: 'when_label', label: 'Label', max: 40, hint: 'Shown under the name, e.g. "Google review".' },
      { k: 'body', label: 'Review text', max: 1200, area: 6 },
    ],
    blank: { name: '', when_label: 'Google review', body: '', active: true },
    head: (r) => r.name, text: (r) => r.body,
  },
  faqs: {
    title: 'FAQ', sub: 'Questions and answers near the bottom of the homepage.',
    one: 'question', icon: 'help',
    fields: [
      { k: 'question', label: 'Question', max: 200 },
      { k: 'answer', label: 'Answer', max: 1200, area: 5 },
    ],
    blank: { question: '', answer: '', active: true },
    head: (r) => r.question, text: (r) => r.answer,
  },
};

function Editor({ kind, item, onClose, onSaved }) {
  const K = KINDS[kind];
  const [f, setF] = useState(item);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const save = async () => {
    setBusy(true);
    try {
      const body = Object.fromEntries(K.fields.map((x) => [x.k, f[x.k]]).concat([['active', f.active]]));
      const r = item.id ? await patch(`${kind}/${item.id}`, body) : await post(kind, body);
      onSaved(r); toast(item.id ? 'Saved' : 'Added'); onClose();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={item.id ? `Edit ${K.one}` : `New ${K.one}`}
      footer={<><Button kind="ghost" onClick={onClose}>Cancel</Button><Button busy={busy} onClick={save}>Save</Button></>}>
      {K.fields.map((x) => (
        <Field key={x.k} label={x.label} hint={x.hint}>
          {x.area ? <textarea rows={x.area} value={f[x.k]} maxLength={x.max} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />
            : <input value={f[x.k]} maxLength={x.max} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} />}
        </Field>
      ))}
      <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label={f.active ? 'Showing on the website' : 'Hidden from the website'} />
    </Dialog>
  );
}

export default function Simple({ kind }) {
  const K = KINDS[kind];
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh } = useBadges();
  useEffect(() => { setRows(null); get(kind).then(setRows).catch((e) => toast(e.message, 'err')); }, [kind, toast]);

  const move = async (a, b) => {
    const next = moveItem(rows, a, b); setRows(next);
    try { await post(`${kind}/reorder`, { ids: next.map((r) => r.id) }); } catch (e) { toast(e.message, 'err'); }
  };
  const flip = async (r) => {
    try { const x = await patch(`${kind}/${r.id}`, { active: !r.active }); setRows((l) => l.map((y) => (y.id === x.id ? x : y))); refresh(); } catch (e) { toast(e.message, 'err'); }
  };
  const remove = async (r) => {
    if (!(await confirm({ title: `Delete this ${K.one}?`, body: K.head(r), ok: 'Delete', danger: true }))) return;
    try { await del(`${kind}/${r.id}`); setRows((l) => l.filter((y) => y.id !== r.id)); refresh(); toast('Deleted'); } catch (e) { toast(e.message, 'err'); }
  };
  const saved = (x) => { setRows((l) => (l.find((y) => y.id === x.id) ? l.map((y) => (y.id === x.id ? x : y)) : [...l, x])); refresh(); };

  return (
    <>
      <PageHead title={K.title} sub={K.sub} actions={<Button icon="plus" onClick={() => setEdit({ ...K.blank })}>Add {K.one}</Button>} />
      {!rows ? <Loading rows={4} /> : !rows.length ? (
        <div className="card"><Empty icon={K.icon} title={`No ${K.title.toLowerCase()} yet`} action={<Button icon="plus" onClick={() => setEdit({ ...K.blank })}>Add {K.one}</Button>} /></div>
      ) : (
        <div className="stack">
          {rows.map((r, i) => (
            <article key={r.id} className={`item${r.active ? '' : ' off'}`}>
              <div className="item-main" onClick={() => setEdit(r)}>
                <strong>{K.head(r)}</strong>
                <p className="muted clamp">{K.text(r)}</p>
              </div>
              <div className="item-side">
                <Toggle checked={r.active} onChange={() => flip(r)} label={r.active ? 'Live' : 'Hidden'} />
                <OrderButtons index={i} count={rows.length} onMove={move} />
                <Button kind="ghost" size="sm" icon="edit" onClick={() => setEdit(r)}>Edit</Button>
                <button type="button" className="icon-btn danger" onClick={() => remove(r)} aria-label="Delete"><Icon name="trash" size={16} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && <Editor kind={kind} item={edit} onClose={() => setEdit(null)} onSaved={saved} />}
    </>
  );
}
