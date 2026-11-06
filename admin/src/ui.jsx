import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { get, uploadImage, imgUrl } from './api.js';

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'err' ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast ${t.kind}`}><Icon name={t.kind === 'err' ? 'close' : 'check'} size={16} />{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- basics ---------- */
export function Button({ kind = 'primary', size, icon, busy, children, className = '', ...rest }) {
  return (
    <button type="button" className={`b b-${kind}${size ? ` b-${size}` : ''} ${className}`} disabled={busy || rest.disabled} aria-busy={busy || undefined} {...rest}>
      {busy ? <span className="spin" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, wide }) {
  return (
    <label className={`f${wide ? ' f-wide' : ''}`}>
      <span className="f-label">{label}</span>
      {children}
      {error ? <span className="f-err">{error}</span> : hint ? <span className="f-hint">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} className={`tg${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
      <i /><span>{label}</span>
    </button>
  );
}

export function Card({ title, sub, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-h">
          <div>{title && <h3>{title}</h3>}{sub && <p>{sub}</p>}</div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'card-b' : ''}>{children}</div>
    </section>
  );
}

export function PageHead({ title, sub, actions }) {
  return (
    <div className="ph">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

export function Empty({ icon = 'inbox', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-i"><Icon name={icon} size={22} /></span>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return <div className="skel">{Array.from({ length: rows }).map((_, i) => <i key={i} />)}</div>;
}

export function Badge({ tone = 'grey', children }) {
  return <span className={`bd bd-${tone}`}>{children}</span>;
}

/* ---------- dialog: centred on desktop, bottom sheet on phones ---------- */
export function Dialog({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('locked');
    setTimeout(() => ref.current?.querySelector('input, textarea, select, button.b-primary')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('locked'); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="dlg-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dlg dlg-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header className="dlg-h"><h3>{title}</h3><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className="dlg-b">{children}</div>
        {footer && <footer className="dlg-f">{footer}</footer>}
      </div>
    </div>
  );
}

const ConfirmCtx = createContext(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const ask = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const close = (v) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Dialog open={!!state} onClose={() => close(false)} title={state?.title || 'Are you sure?'} size="sm"
        footer={<><Button kind="ghost" onClick={() => close(false)}>Cancel</Button><Button kind={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{state?.ok || 'Confirm'}</Button></>}>
        <p className="muted">{state?.body}</p>
      </Dialog>
    </ConfirmCtx.Provider>
  );
}

/* ---------- image picker: upload new or choose from the library ---------- */
export function ImagePicker({ open, onClose, onPick, multiple = false, title = 'Add photos' }) {
  const [tab, setTab] = useState('upload');
  const [lib, setLib] = useState(null);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [drag, setDrag] = useState(false);
  const toast = useToast();
  const input = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSel([]); setProgress('');
    get('images').then(setLib).catch(() => setLib([]));
  }, [open]);

  const upload = async (files) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    if (!multiple) list.length = 1;
    setBusy(true);
    const done = [];
    try {
      for (const [i, f] of list.entries()) {
        setProgress(`Uploading ${i + 1} of ${list.length}…`);
        done.push(await uploadImage(f));
      }
      onPick(done);
      onClose();
    } catch (e) {
      toast(e.message, 'err');
      if (done.length) { onPick(done); onClose(); }
    } finally { setBusy(false); setProgress(''); }
  };

  const toggle = (img) => {
    if (!multiple) { setSel([img]); return; }
    setSel((s) => (s.find((x) => x.id === img.id) ? s.filter((x) => x.id !== img.id) : [...s, img]));
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} title={title} size="lg"
      footer={tab === 'library' ? <><Button kind="ghost" onClick={onClose}>Cancel</Button><Button disabled={!sel.length} onClick={() => { onPick(sel); onClose(); }}>Use {sel.length > 1 ? `${sel.length} photos` : 'photo'}</Button></> : null}>
      <div className="seg">
        <button type="button" className={tab === 'upload' ? 'on' : ''} onClick={() => setTab('upload')}>Upload new</button>
        <button type="button" className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>From library{lib ? ` (${lib.length})` : ''}</button>
      </div>
      {tab === 'upload' ? (
        <div className={`drop${drag ? ' over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}>
          {busy ? (<><span className="spin lg" /><strong>{progress}</strong><p className="muted">Photos are resized and compressed before upload.</p></>) : (
            <>
              <span className="drop-i"><Icon name="upload" size={24} /></span>
              <strong>Drop {multiple ? 'photos' : 'a photo'} here</strong>
              <p className="muted">or choose from your phone or computer. Large photos are resized and compressed automatically.</p>
              <Button kind="dark" icon="image" onClick={() => input.current?.click()}>Choose {multiple ? 'photos' : 'a photo'}</Button>
              <input ref={input} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => upload(e.target.files)} />
            </>
          )}
        </div>
      ) : lib === null ? <Loading /> : !lib.length ? <Empty icon="image" title="No photos yet">Upload your first photo.</Empty> : (
        <div className="lib">
          {lib.map((img) => {
            const on = sel.find((x) => x.id === img.id);
            return (
              <button type="button" key={img.id} className={`lib-i${on ? ' on' : ''}`} onClick={() => toggle(img)} aria-pressed={!!on}>
                <img src={imgUrl(img.id)} alt={img.alt} loading="lazy" />
                {on && <span className="lib-check"><Icon name="check" size={14} /></span>}
              </button>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

/* ---------- ordering ---------- */
export function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function OrderButtons({ index, count, onMove }) {
  return (
    <div className="order">
      <button type="button" className="icon-btn sm" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label="Move up"><Icon name="up" size={15} /></button>
      <button type="button" className="icon-btn sm" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label="Move down"><Icon name="down" size={15} /></button>
    </div>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }) : '');
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }) : '');
export const fmtBytes = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
export function timeAgo(d) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
