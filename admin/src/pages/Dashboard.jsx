import { useEffect, useState } from 'react';
import { get } from '../api.js';
import { Card, PageHead, Loading, Badge, Empty, Button, fmtBytes, timeAgo, fmtDay } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { Link, navigate } from '../router.jsx';

export const STATUS = {
  new: { label: 'New', tone: 'accent' },
  contacted: { label: 'Contacted', tone: 'blue' },
  scheduled: { label: 'Scheduled', tone: 'violet' },
  done: { label: 'Done', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'grey' },
};

function Trend({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.n));
  const total = daily.reduce((a, d) => a + d.n, 0);
  return (
    <div className="trend">
      <div className="trend-bars" role="img" aria-label={`${total} booking requests in the last 14 days`}>
        {daily.map((d) => (
          <div key={d.day} className="trend-col" title={`${fmtDay(d.day)}: ${d.n}`}>
            <span className="trend-n">{d.n || ''}</span>
            <i style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }} className={d.n ? '' : 'zero'} />
            <small>{new Date(d.day).toLocaleDateString('en-KE', { weekday: 'narrow' })}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ admin }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { get('dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  const hello = (() => { const h = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' })); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();

  if (err) return <div className="alert err">{err}</div>;
  if (!d) return <><PageHead title="Dashboard" /><Loading rows={6} /></>;
  const c = d.counts, k = d.content;
  const alerts = [];
  if (c.new > 0) alerts.push({ tone: 'accent', icon: 'inbox', text: `${c.new} booking request${c.new > 1 ? 's' : ''} waiting for a reply`, to: '/bookings' });
  if (k.services_no_photo > 0) alerts.push({ tone: 'amber', icon: 'image', text: `${k.services_no_photo} live service${k.services_no_photo > 1 ? 's have' : ' has'} no photos`, to: '/services' });
  if (k.slides_live < 2) alerts.push({ tone: 'amber', icon: 'slides', text: 'Add at least two homepage slides so the carousel moves', to: '/slides' });
  if (d.announcement?.enabled) alerts.push({ tone: 'blue', icon: 'megaphone', text: `Announcement bar is on: "${d.announcement.text}"`, to: '/settings/announcement' });

  return (
    <>
      <PageHead title={`${hello}, ${(admin.name || admin.username).split(' ')[0]}`} sub="Here is what needs you first."
        actions={d.siteUrl ? <a className="b b-ghost" href={d.siteUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} />View website</a> : null} />

      <div className="dash">
        <Card className="span-2" title="Needs a reply" sub={c.new ? `${c.new} new request${c.new > 1 ? 's' : ''}` : 'You are all caught up'}
          actions={<Link to="/bookings" className="b b-ghost b-sm">All requests<Icon name="arrow" size={15} /></Link>} pad={false}>
          {!d.recent.length ? <Empty icon="inbox" title="No booking requests yet">Requests from the website form appear here.</Empty> : (
            <ul className="rlist">
              {d.recent.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => navigate(`/bookings?open=${b.id}`)}>
                    <span className={`rdot ${b.status}`} />
                    <span className="rmain"><strong>{b.name}</strong><small>{[b.service || 'Not sure yet', b.vehicle, b.location].filter(Boolean).join(' · ')}</small></span>
                    <span className="rside"><Badge tone={STATUS[b.status].tone}>{STATUS[b.status].label}</Badge><small>{timeAgo(b.created_at)}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="kpis span-2">
          <div className="kpi"><small>Today</small><strong>{c.today}</strong><span>requests</span></div>
          <div className="kpi"><small>Last 7 days</small><strong>{c.week}</strong><span>requests</span></div>
          <div className="kpi"><small>Open jobs</small><strong>{c.open}</strong><span>contacted or scheduled</span></div>
          <div className="kpi"><small>Completed</small><strong>{c.done_month}</strong><span>in 30 days</span></div>
        </div>

        <Card title="Requests, last 14 days" sub={`${c.month} in the last 30 days · ${c.total} all time`}>
          <Trend daily={d.daily} />
        </Card>

        <Card title="Alerts" sub={alerts.length ? `${alerts.length} item${alerts.length > 1 ? 's' : ''}` : 'Nothing to fix'} pad={false}>
          {!alerts.length ? <Empty icon="check" title="All good">The website content looks complete.</Empty> : (
            <ul className="alerts">{alerts.map((a, i) => (
              <li key={i}><Link to={a.to} className={`al al-${a.tone}`}><Icon name={a.icon} size={16} /><span>{a.text}</span><Icon name="chevron" size={15} /></Link></li>
            ))}</ul>
          )}
        </Card>

        <Card title="Website content" sub={k.last_edit ? `Last edited ${timeAgo(k.last_edit)}` : ''}>
          <div className="mini-grid">
            <Link to="/slides" className="mini"><Icon name="slides" /><strong>{k.slides_live}<em>/{k.slides}</em></strong><small>Slides live</small></Link>
            <Link to="/services" className="mini"><Icon name="grid" /><strong>{k.services_live}<em>/{k.services}</em></strong><small>Services live</small></Link>
            <Link to="/reviews" className="mini"><Icon name="quote" /><strong>{k.reviews}</strong><small>Reviews shown</small></Link>
            <Link to="/faqs" className="mini"><Icon name="help" /><strong>{k.faqs}</strong><small>FAQs shown</small></Link>
            <Link to="/photos" className="mini"><Icon name="image" /><strong>{k.images}</strong><small>Photos · {fmtBytes(Number(k.image_bytes))}</small></Link>
          </div>
        </Card>

        <Card title="Most requested" sub="Last 90 days">
          {!d.topServices.length ? <p className="muted">No requests yet.</p> : (
            <ul className="bars">{d.topServices.map((s) => {
              const max = d.topServices[0].n;
              return <li key={s.service}><span>{s.service}</span><i><b style={{ width: `${(s.n / max) * 100}%` }} /></i><em>{s.n}</em></li>;
            })}</ul>
          )}
        </Card>

        <Card title="Quick actions" className="span-2">
          <div className="quick">
            <Button kind="ghost" icon="slides" onClick={() => navigate('/slides?add=1')}>Add a homepage slide</Button>
            <Button kind="ghost" icon="grid" onClick={() => navigate('/services?add=1')}>Add a service</Button>
            <Button kind="ghost" icon="image" onClick={() => navigate('/photos')}>Upload photos</Button>
            <Button kind="ghost" icon="clock" onClick={() => navigate('/settings/hours')}>Change opening hours</Button>
            <Button kind="ghost" icon="megaphone" onClick={() => navigate('/settings/announcement')}>Post an announcement</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
