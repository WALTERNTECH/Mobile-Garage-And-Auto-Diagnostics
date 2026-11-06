// Inline stroke icons (24px grid). Kept in one place so the site and admin agree on names.
const p = {
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 12h2l1.5-3 3 6 1.5-3h2"/>',
  engine: '<path d="M4 10v5M4 12.5h2M6 9h3V7h5v2h2l2 2h2v5h-2l-2 2H8l-2-2V9z"/><path d="M10 7V5h3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  oil: '<path d="M3 11h4l2-2h6l5 3-3 2v4H5a2 2 0 0 1-2-2z"/><path d="M20 6s-1.5 2-1.5 3a1.5 1.5 0 0 0 3 0c0-1-1.5-3-1.5-3z"/>',
  shield: '<path d="M12 3 5 6v6c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  brake: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M5 7a9 9 0 0 1 4-3.5"/>',
  car: '<path d="M5 17h14v-4l-2-5H7l-2 5z"/><path d="M3 13h18M7 17v2M17 17v2"/><circle cx="8" cy="14.5" r=".8"/><circle cx="16" cy="14.5" r=".8"/>',
  phone: '<path d="M6.6 3h2.6l1.3 4-2 1.3a12 12 0 0 0 5.2 5.2l1.3-2 4 1.3v2.6A2.6 2.6 0 0 1 16.4 18 13.4 13.4 0 0 1 4 5.6 2.6 2.6 0 0 1 6.6 3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  star: '<path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1 6.1L12 17.1 6.5 20l1-6.1L3 9.5l6.2-.9z"/>',
  map: '<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  quote: '<path d="M9 7H5v5h4v-1a4 4 0 0 1-4 4M19 7h-4v5h4v-1a4 4 0 0 1-4 4"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
};

export const ICON_NAMES = Object.keys(p);

export function icon(name, cls = 'i') {
  const body = p[name] || p.wrench;
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function whatsappIcon(cls = 'i') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.9L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.4A11.8 11.8 0 0 0 20.4 3.6z"/></svg>`;
}
