import { useCallback, useEffect, useState } from 'react';
import { get, patch, del } from '../api.js';
import { PageHead, Loading, Empty, Badge, Button, Dialog, Field, useToast, useConfirm, fmtDate, fmtDay, timeAgo } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { STATUS } from './Dashboard.jsx';
import { useBadges } from '../Shell.jsx';

const waNumber = (p) => { const d = String(p).replace(/\D/g, ''); return d.startsWith('0') ? `254${d.slice(1)}` : d; };

function Detail({ b, onClose, onSaved, onDeleted }) {
  const [status, setStatus] = useState(b.status);
  const [notes, setNotes] = useState(b.notes || '');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const save = async () => {
    setBusy(true);
    try { onSaved(await patch(`bookings/${b.id}`, { status, notes })); toast('Booking updated'); onClose(); }
    catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this request?', body: `${b.name} · ${b.ref}. This cannot be undone.`, ok: 'Delete', danger: true }))) return;
    try { await del(`bookings/${b.id}`); toast('Request deleted'); onDeleted(b.id); onClose(); } catch (e) { toast(e.message, 'err'); }
  };
  const wa = `https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(`Hello ${b.name.split(' ')[0]}, this is Mobile Garage & Auto Diagnostics about your booking request (${b.ref}).`)}`;
  return (
    <Dialog open onClose={onClose} title={`${b.name} · ${b.ref}`} size="md"
      footer={<><Button kind="danger-ghost" icon="trash" onClick={remove}>Delete</Button><span className="grow" /><Button kind="ghost" onClick={onClose}>Close</Button><Button busy={busy} onClick={save}>Save</Button></>}>
      <div className="contact-row">
        <a className="b b-dark" href={`tel:${b.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} />Call {b.phone}</a>
        <a className="b b-wa" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={16} />WhatsApp</a>
      </div>
      <dl className="dl">
        <div><dt>Service</dt><dd>{b.service || 'Not sure yet'}</dd></div>
        <div><dt>Car</dt><dd>{b.vehicle || '—'}</dd></div>
        <div><dt>Location</dt><dd>{b.location || '—'}</dd></div>
        <div><dt>Preferred date</dt><dd>{b.preferred_date ? fmtDay(b.preferred_date) : '—'}</dd></div>
        <div><dt>Received</dt><dd>{fmtDate(b.created_at)}</dd></div>
        <div className="dl-wide"><dt>What the car is doing</dt><dd>{b.message || '—'}</dd></div>
      </dl>
      <Field label="Status">
        <div className="seg seg-wrap">
          {Object.entries(STATUS).map(([k, v]) => <button key={k} type="button" className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>{v.label}</button>)}
        </div>
      </Field>
      <Field label="Private notes" hint="Only admins see these."><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Quoted price, parts needed, time agreed…" /></Field>
    </Dialog>
  );
}

export default function Bookings() {
  const [status, setStatus] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const toast = useToast();
  const { refresh } = useBadges();

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (term.trim()) qs.set('q', term.trim());
    try { setData(await get(`bookings?${qs}`)); } catch (e) { toast(e.message, 'err'); }
  }, [status, term, page, toast]);

  useEffect(() => { const t = setTimeout(load, term ? 250 : 0); return () => clearTimeout(t); }, [load, term]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('open');
    if (id && data && !open) {
      const b = data.rows.find((r) => r.id === id);
      if (b) setOpen(b);
      history.replaceState(null, '', '/bookings');
    }
  }, [data, open]);

  const total = data ? Object.values(data.counts).reduce((a, n) => a + n, 0) : 0;
  const quick = async (b, s) => {
    try { const r = await patch(`bookings/${b.id}`, { status: s }); setData((d) => ({ ...d, rows: d.rows.map((x) => (x.id === r.id ? r : x)) })); refresh(); toast(`Marked ${STATUS[s].label.toLowerCase()}`); }
    catch (e) { toast(e.message, 'err'); }
  };

  return (
    <>
      <PageHead title="Booking requests" sub="Sent from the website form. Call or WhatsApp the customer, then update the status." />
      <div className="toolbar">
        <div className="chips">
          <button type="button" className={!status ? 'on' : ''} onClick={() => { setStatus(''); setPage(1); }}>All <em>{total}</em></button>
          {Object.entries(STATUS).map(([k, v]) => (
            <button type="button" key={k} className={status === k ? 'on' : ''} onClick={() => { setStatus(k); setPage(1); }}>{v.label} <em>{data?.counts[k] || 0}</em></button>
          ))}
        </div>
        <div className="search"><Icon name="search" size={16} /><input value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} placeholder="Name, phone, ref, car…" /></div>
      </div>

      {!data ? <Loading rows={5} /> : !data.rows.length ? (
        <div className="card"><Empty icon="inbox" title={term || status ? 'Nothing matches' : 'No booking requests yet'}>{term || status ? 'Try another filter.' : 'When customers use the booking form on the website, their requests land here.'}</Empty></div>
      ) : (
        <div className="card">
          <table className="tbl">
            <thead><tr><th>Customer</th><th>Service</th><th>Car</th><th>Where / when</th><th>Received</th><th>Status</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {data.rows.map((b) => (
                <tr key={b.id} className={b.status === 'new' ? 'is-new' : ''} onClick={() => setOpen(b)}>
                  <td data-label="Customer"><strong>{b.name}</strong><small className="block">{b.phone} · {b.ref}</small></td>
                  <td data-label="Service">{b.service || <span className="muted">Not sure yet</span>}</td>
                  <td data-label="Car">{b.vehicle || <span className="muted">—</span>}</td>
                  <td data-label="Where / when">{b.location || <span className="muted">—</span>}{b.preferred_date && <small className="block">{fmtDay(b.preferred_date)}</small>}</td>
                  <td data-label="Received"><span title={fmtDate(b.created_at)}>{timeAgo(b.created_at)}</span></td>
                  <td data-label="Status"><Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge></td>
                  <td className="td-act" onClick={(e) => e.stopPropagation()}>
                    {b.status === 'new' && <Button kind="ghost" size="sm" onClick={() => quick(b, 'contacted')}>Mark contacted</Button>}
                    {b.status === 'scheduled' && <Button kind="ghost" size="sm" onClick={() => quick(b, 'done')}>Mark done</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.total > data.per && (
            <div className="pager">
              <Button kind="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span className="muted">Page {page} of {Math.ceil(data.total / data.per)}</span>
              <Button kind="ghost" size="sm" disabled={page * data.per >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
      {open && <Detail b={open} onClose={() => setOpen(null)}
        onSaved={(r) => { setData((d) => ({ ...d, rows: d.rows.map((x) => (x.id === r.id ? r : x)) })); refresh(); }}
        onDeleted={(id) => { setData((d) => ({ ...d, rows: d.rows.filter((x) => x.id !== id), total: d.total - 1 })); refresh(); load(); }} />}
    </>
  );
}
