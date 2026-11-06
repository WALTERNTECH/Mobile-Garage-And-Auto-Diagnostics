import { useEffect, useState } from 'react';
import { get, setUnauthorizedHandler } from './api.js';
import { usePath } from './router.jsx';
import { Shell } from './Shell.jsx';
import { Login, Setup } from './Auth.jsx';
import { ToastProvider, ConfirmProvider, Empty } from './ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Bookings from './pages/Bookings.jsx';
import Slides from './pages/Slides.jsx';
import { ServiceList, ServiceEditor } from './pages/Services.jsx';
import Simple from './pages/Simple.jsx';
import Photos from './pages/Photos.jsx';
import Settings from './pages/Settings.jsx';
import { Account, Admins } from './pages/Account.jsx';

function Page({ path, admin }) {
  if (path === '/') return <Dashboard admin={admin} />;
  if (path === '/bookings') return <Bookings />;
  if (path === '/slides') return <Slides />;
  if (path === '/services') return <ServiceList />;
  const svc = path.match(/^\/services\/([0-9a-f-]{36})$/);
  if (svc) return <ServiceEditor key={svc[1]} id={svc[1]} />;
  if (path === '/reviews') return <Simple key="reviews" kind="reviews" />;
  if (path === '/faqs') return <Simple key="faqs" kind="faqs" />;
  if (path === '/photos') return <Photos />;
  const st = path.match(/^\/settings\/(contact|hours|homepage|announcement|seo)$/);
  if (st) return <Settings key={st[1]} section={st[1]} />;
  if (path === '/account') return <Account admin={admin} />;
  if (path === '/admins') return <Admins admin={admin} />;
  return <div className="card"><Empty icon="search" title="Page not found">Use the menu to find your way.</Empty></div>;
}

export default function App() {
  const path = usePath();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    setUnauthorizedHandler(() => setState({ admin: null, needsSetup: false }));
    get('session').then((r) => setState({ admin: r.admin, needsSetup: r.needsSetup })).catch(() => setState({ admin: null, needsSetup: false, error: true }));
  }, []);

  let body;
  if (state.loading) body = <div className="boot"><span className="spin lg" /></div>;
  else if (!state.admin && state.needsSetup) body = <Setup onDone={(admin) => setState({ admin })} />;
  else if (!state.admin) body = <Login onDone={(admin) => setState({ admin })} />;
  else body = (
    <Shell admin={state.admin} path={path} onSignOut={() => setState({ admin: null })}>
      <Page path={path} admin={state.admin} />
    </Shell>
  );

  return <ToastProvider><ConfirmProvider>{body}</ConfirmProvider></ToastProvider>;
}
