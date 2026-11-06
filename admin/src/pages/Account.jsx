import { useEffect, useState } from 'react';
import { get, post, del } from '../api.js';
import { PageHead, Card, Field, Button, Loading, Dialog, useToast, useConfirm, fmtDate } from '../ui.jsx';
import { PasswordInput } from '../Auth.jsx';
import { Icon } from '../icons.jsx';

export function Account({ admin }) {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const save = async (e) => {
    e.preventDefault();
    if (f.next !== f.confirm) { toast('The new passwords do not match', 'err'); return; }
    setBusy(true);
    try { await post('password', { current: f.current, next: f.next }); setF({ current: '', next: '', confirm: '' }); toast('Password changed. Other devices are signed out.'); }
    catch (x) { toast(x.message, 'err'); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="My account" sub={`Signed in as @${admin.username}`} />
      <div className="cols">
        <Card title="Change password" sub="Changing it signs you out on every other device.">
          <form onSubmit={save} className="narrow">
            <Field label="Current password"><PasswordInput value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" required /></Field>
            <Field label="New password" hint="At least 10 characters, with letters and a number."><PasswordInput value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" required /></Field>
            <Field label="Repeat new password"><PasswordInput value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} autoComplete="new-password" required /></Field>
            <Button type="submit" busy={busy}>Change password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

export function Admins({ admin }) {
  const [rows, setRows] = useState(null);
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: '', username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  useEffect(() => { get('admins').then(setRows).catch((e) => toast(e.message, 'err')); }, [toast]);
  const create = async () => {
    setBusy(true);
    try { const r = await post('admins', f); setRows((l) => [...l, r]); setAdd(false); setF({ name: '', username: '', password: '' }); toast('Admin added'); }
    catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const remove = async (r) => {
    if (!(await confirm({ title: `Remove @${r.username}?`, body: 'They will no longer be able to sign in.', ok: 'Remove', danger: true }))) return;
    try { await del(`admins/${r.id}`); setRows((l) => l.filter((x) => x.id !== r.id)); toast('Admin removed'); } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <>
      <PageHead title="Admin users" sub="People who can sign in to this console. Everyone has full access." actions={<Button icon="plus" onClick={() => setAdd(true)}>Add admin</Button>} />
      {!rows ? <Loading /> : (
        <div className="stack">
          {rows.map((r) => (
            <article key={r.id} className="item">
              <span className="avatar">{(r.name || r.username)[0].toUpperCase()}</span>
              <div className="item-main"><strong>{r.name || r.username}{r.id === admin.id && <span className="muted"> (you)</span>}</strong><p className="muted">@{r.username} · last sign-in {r.last_login_at ? fmtDate(r.last_login_at) : 'never'}</p></div>
              <div className="item-side">{r.id !== admin.id && <button type="button" className="icon-btn danger" onClick={() => remove(r)} aria-label="Remove admin"><Icon name="trash" size={16} /></button>}</div>
            </article>
          ))}
        </div>
      )}
      <Dialog open={add} onClose={() => setAdd(false)} title="Add an admin" size="sm"
        footer={<><Button kind="ghost" onClick={() => setAdd(false)}>Cancel</Button><Button busy={busy} onClick={create}>Add admin</Button></>}>
        <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} /></Field>
        <Field label="Username"><input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} maxLength={40} autoComplete="off" /></Field>
        <Field label="Temporary password" hint="Share it privately. They can change it under My account."><PasswordInput value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
      </Dialog>
    </>
  );
}
