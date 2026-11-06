import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { NAV, FLAT, findNav } from './nav.js';
import { Link, navigate } from './router.jsx';
import { get, post } from './api.js';

const BadgeCtx = createContext({ counts: {}, refresh: () => {} });
export const useBadges = () => useContext(BadgeCtx);

function Brand() {
  return (
    <Link to="/" className="brand">
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#0E1013" /><path d="M7 22h6l3-8 5 14 3-9 2 3h7" fill="none" stroke="#FF5A1F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <span><strong>Mobile Garage</strong><small>Console</small></span>
    </Link>
  );
}

function Sidebar({ path, counts, onNavigate }) {
  const current = findNav(path);
  const [open, setOpen] = useState(() => {
    const saved = (() => { try { return JSON.parse(localStorage.getItem('mg.nav') || 'null'); } catch { return null; } })();
    return saved || { Customers: true, Website: true };
  });
  useEffect(() => { if (current.group) setOpen((o) => (o[current.group] ? o : { ...o, [current.group]: true })); }, [current.group]);
  useEffect(() => { try { localStorage.setItem('mg.nav', JSON.stringify(open)); } catch { /* ignore */ } }, [open]);

  return (
    <nav className="side-nav" aria-label="Console">
      {NAV.map((n) => n.items ? (
        <div key={n.group} className={`grp${open[n.group] ? ' open' : ''}`}>
          <button type="button" className="grp-h" aria-expanded={!!open[n.group]} onClick={() => setOpen((o) => ({ ...o, [n.group]: !o[n.group] }))}>
            <span>{n.group}</span>
            {!open[n.group] && n.items.some((i) => i.tone === 'accent' && counts[i.badge] > 0) && <i className="dot" />}
            <Icon name="chevronDown" size={15} className="grp-chev" />
          </button>
          <div className="grp-b">
            <div>
              {n.items.map((i) => (
                <Link key={i.to} to={i.to} className={`nv${current.to === i.to ? ' on' : ''}`} aria-current={current.to === i.to ? 'page' : undefined} onClick={onNavigate}>
                  <Icon name={i.icon} size={17} /><span>{i.label}</span>
                  {i.badge && counts[i.badge] != null && <em className={i.tone === 'accent' && counts[i.badge] > 0 ? 'hot' : ''}>{counts[i.badge]}</em>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <Link key={n.to} to={n.to} className={`nv nv-top${current.to === n.to ? ' on' : ''}`} aria-current={current.to === n.to ? 'page' : undefined} onClick={onNavigate}>
          <Icon name={n.icon} size={17} /><span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Jump({ open, onClose }) {
  const [term, setTerm] = useState('');
  const [k, setK] = useState(0);
  const inp = useRef(null);
  const list = useMemo(() => {
    const t = term.toLowerCase().trim();
    return FLAT.filter((i) => !t || `${i.label} ${i.group}`.toLowerCase().includes(t));
  }, [term]);
  useEffect(() => { if (open) { setTerm(''); setK(0); setTimeout(() => inp.current?.focus(), 20); } }, [open]);
  if (!open) return null;
  const go = (i) => { onClose(); navigate(i.to); };
  return (
    <div className="dlg-wrap jump-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="jump" role="dialog" aria-label="Jump to">
        <div className="jump-in"><Icon name="search" /><input ref={inp} value={term} placeholder="Jump to a page…" onChange={(e) => { setTerm(e.target.value); setK(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') { e.preventDefault(); setK((x) => Math.min(x + 1, list.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setK((x) => Math.max(x - 1, 0)); }
            if (e.key === 'Enter' && list[k]) go(list[k]);
          }} /><kbd>Esc</kbd></div>
        <ul>
          {list.map((i, n) => (
            <li key={i.to}><button type="button" className={n === k ? 'on' : ''} onMouseEnter={() => setK(n)} onClick={() => go(i)}>
              <Icon name={i.icon} size={16} /><span>{i.label}</span><small>{i.group}</small>
            </button></li>
          ))}
          {!list.length && <li className="muted jump-none">No match</li>}
        </ul>
      </div>
    </div>
  );
}

function AccountMenu({ admin, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const initial = (admin.name || admin.username || '?').trim()[0].toUpperCase();
  return (
    <div className="acct" ref={ref}>
      <button type="button" className="acct-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu"><span>{initial}</span></button>
      {open && (
        <div className="menu">
          <div className="menu-h"><strong>{admin.name || admin.username}</strong><small>@{admin.username}</small></div>
          <Link to="/account" onClick={() => setOpen(false)}><Icon name="lock" size={16} />Password & account</Link>
          <Link to="/admins" onClick={() => setOpen(false)}><Icon name="users" size={16} />Admin users</Link>
          <button type="button" onClick={onSignOut}><Icon name="logout" size={16} />Sign out</button>
        </div>
      )}
    </div>
  );
}

export function Shell({ admin, path, onSignOut, children }) {
  const [counts, setCounts] = useState({});
  const [drawer, setDrawer] = useState(false);
  const [jump, setJump] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const current = findNav(path);

  const refresh = useCallback(() => { get('badges').then(setCounts).catch(() => {}); }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 60_000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => { refresh(); setDrawer(false); }, [path, refresh]);
  useEffect(() => { get('dashboard').then((d) => setSiteUrl(d.siteUrl || '')).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setJump(true); } };
    addEventListener('keydown', h);
    return () => removeEventListener('keydown', h);
  }, []);
  useEffect(() => { document.body.classList.toggle('locked', drawer); }, [drawer]);
  useEffect(() => { document.title = `${current.label} · Garage Console`; }, [current.label]);

  const signOut = async () => { try { await post('logout'); } finally { onSignOut(); } };

  return (
    <BadgeCtx.Provider value={{ counts, refresh }}>
      <div className="console">
        <aside className={`side${drawer ? ' open' : ''}`}>
          <div className="side-top"><Brand /><button type="button" className="icon-btn only-sm" onClick={() => setDrawer(false)} aria-label="Close menu"><Icon name="close" /></button></div>
          <Sidebar path={path} counts={counts} onNavigate={() => setDrawer(false)} />
          <div className="side-foot">
            {siteUrl && <a className="nv" href={siteUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={17} /><span>View website</span></a>}
            <button type="button" className="nv" onClick={signOut}><Icon name="logout" size={17} /><span>Sign out</span></button>
          </div>
        </aside>
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
        <div className="main">
          <header className="top">
            <button type="button" className="icon-btn only-sm" onClick={() => setDrawer(true)} aria-label="Open menu"><Icon name="menu" /></button>
            <div className="crumbs">{current.group && <><span>{current.group}</span><Icon name="chevron" size={14} /></>}<strong>{current.label}</strong></div>
            <button type="button" className="search-btn" onClick={() => setJump(true)}><Icon name="search" size={16} /><span>Jump to…</span><kbd>Ctrl K</kbd></button>
            <Link to="/bookings" className="icon-btn bell" aria-label={`${counts.new_bookings || 0} new booking requests`}>
              <Icon name="bell" />{counts.new_bookings > 0 && <em>{counts.new_bookings}</em>}
            </Link>
            <AccountMenu admin={admin} onSignOut={signOut} />
          </header>
          <main className="page">{children}</main>
        </div>
        <Jump open={jump} onClose={() => setJump(false)} />
      </div>
    </BadgeCtx.Provider>
  );
}
