// Sidebar structure. Dashboard first, then groups in the order the owner reaches for them.
export const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  {
    group: 'Customers', icon: 'inbox', items: [
      { to: '/bookings', label: 'Booking requests', icon: 'inbox', badge: 'new_bookings', tone: 'accent' },
    ],
  },
  {
    group: 'Website', icon: 'store', items: [
      { to: '/slides', label: 'Homepage slides', icon: 'slides', badge: 'slides' },
      { to: '/services', label: 'Services', icon: 'grid', badge: 'services' },
      { to: '/reviews', label: 'Reviews', icon: 'quote', badge: 'reviews' },
      { to: '/faqs', label: 'FAQ', icon: 'help', badge: 'faqs' },
      { to: '/photos', label: 'Photo library', icon: 'image', badge: 'images' },
    ],
  },
  {
    group: 'Business', icon: 'store', items: [
      { to: '/settings/contact', label: 'Contact & location', icon: 'phone' },
      { to: '/settings/hours', label: 'Opening hours', icon: 'clock' },
      { to: '/settings/homepage', label: 'Homepage text', icon: 'edit' },
      { to: '/settings/announcement', label: 'Announcement bar', icon: 'megaphone' },
      { to: '/settings/seo', label: 'Search & social', icon: 'search' },
    ],
  },
  {
    group: 'Account', icon: 'user', items: [
      { to: '/account', label: 'My account', icon: 'lock' },
      { to: '/admins', label: 'Admin users', icon: 'users' },
    ],
  },
];

export const FLAT = NAV.flatMap((n) => (n.items ? n.items.map((i) => ({ ...i, group: n.group })) : [{ ...n, group: '' }]));

export function findNav(path) {
  return FLAT.filter((i) => (i.to === '/' ? path === '/' : path === i.to || path.startsWith(i.to + '/'))).sort((a, b) => b.to.length - a.to.length)[0] || FLAT[0];
}
