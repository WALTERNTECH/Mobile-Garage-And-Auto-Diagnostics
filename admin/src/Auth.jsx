import { useState } from 'react';
import { post } from './api.js';
import { Button, Field } from './ui.jsx';
import { Icon } from './icons.jsx';

function Frame({ title, sub, children }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-brand">
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#0E1013" /><path d="M7 22h6l3-8 5 14 3-9 2 3h7" fill="none" stroke="#FF5A1F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input type={show ? 'text' : 'password'} {...props} />
      <button type="button" className="icon-btn sm" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}><Icon name={show ? 'eyeOff' : 'eye'} size={16} /></button>
    </div>
  );
}

export function Login({ onDone }) {
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { const r = await post('login', f); onDone(r.admin); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Frame title="Sign in" sub="Mobile Garage & Auto Diagnostics console">
      <form onSubmit={submit} className="auth-form">
        <Field label="Username"><input autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoFocus /></Field>
        <Field label="Password"><PasswordInput autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>
        {err && <div className="alert err">{err}</div>}
        <Button type="submit" busy={busy} className="b-block">Sign in</Button>
      </form>
    </Frame>
  );
}

export function Setup({ onDone }) {
  const [f, setF] = useState({ token: '', name: '', username: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (f.password !== f.confirm) { setErr('The two passwords do not match.'); return; }
    setBusy(true);
    try { const r = await post('setup', f); onDone(r.admin); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Frame title="Create the owner account" sub="First-time setup. You need the setup code you were given.">
      <form onSubmit={submit} className="auth-form">
        <Field label="Setup code"><input value={f.token} onChange={set('token')} required autoComplete="off" autoFocus /></Field>
        <Field label="Your name"><input value={f.name} onChange={set('name')} autoComplete="name" /></Field>
        <Field label="Username" hint="Letters, numbers, dots or dashes."><input value={f.username} onChange={set('username')} required autoComplete="username" /></Field>
        <Field label="Password" hint="At least 10 characters, with letters and a number."><PasswordInput value={f.password} onChange={set('password')} required autoComplete="new-password" /></Field>
        <Field label="Confirm password"><PasswordInput value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" /></Field>
        {err && <div className="alert err">{err}</div>}
        <Button type="submit" busy={busy} className="b-block">Create account</Button>
      </form>
    </Frame>
  );
}

export { PasswordInput };
