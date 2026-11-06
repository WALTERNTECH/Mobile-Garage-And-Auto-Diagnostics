// Same stroke set as the public site, plus console-only glyphs.
const P = {
  scan: 'M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h2l1.5-3 3 6 1.5-3h2',
  engine: 'M4 10v5M4 12.5h2M6 9h3V7h5v2h2l2 2h2v5h-2l-2 2H8l-2-2V9zM10 7V5h3',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1',
  thermo: 'M14 14.8V5a2 2 0 1 0-4 0v9.8a4 4 0 1 0 4 0zM12 9v7',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  pin: 'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  oil: 'M3 11h4l2-2h6l5 3-3 2v4H5a2 2 0 0 1-2-2zM20 6s-1.5 2-1.5 3a1.5 1.5 0 0 0 3 0c0-1-1.5-3-1.5-3z',
  shield: 'M12 3 5 6v6c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6zM9 12l2 2 4-4',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  brake: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 7a9 9 0 0 1 4-3.5',
  car: 'M5 17h14v-4l-2-5H7l-2 5zM3 13h18M7 17v2M17 17v2',
  phone: 'M6.6 3h2.6l1.3 4-2 1.3a12 12 0 0 0 5.2 5.2l1.3-2 4 1.3v2.6A2.6 2.6 0 0 1 16.4 18 13.4 13.4 0 0 1 4 5.6 2.6 2.6 0 0 1 6.6 3z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  star: 'm12 3 2.8 5.6 6.2.9-4.5 4.4 1 6.1L12 17.1 6.5 20l1-6.1L3 9.5l6.2-.9z',
  map: 'm9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20',
  calendar: 'M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM4 10h16M9 3v4M15 3v4',
  quote: 'M9 7H5v5h4v-1a4 4 0 0 1-4 4M19 7h-4v5h4v-1a4 4 0 0 1-4 4',
  // console
  home: 'M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z',
  inbox: 'M4 13h4l1.5 3h5l1.5-3h4M5.5 6h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z',
  slides: 'M4 6h16v12H4zM8 18v2M16 18v2M4 14l4-4 4 4 3-3 5 5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  image: 'M4 5h16v14H4zM4 15l4-4 5 5 3-3 4 4M15.5 8.5h.01',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01',
  store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  megaphone: 'M4 10v4h3l7 4V6l-7 4zM17 9a3 3 0 0 1 0 6',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 20a8 8 0 0 1 16 0',
  users: 'M9 5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2.5 20a6.5 6.5 0 0 1 13 0M16 5.5a3 3 0 0 1 0 6M18 14a5.5 5.5 0 0 1 3.5 6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 7h16M4 12h16M4 17h10',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10 11v6M14 11v6',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M18 13l-6 6-6-6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeOff: 'M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.7M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1.1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  drag: 'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zM9 8.5c.3 2.7 2.8 5.2 5.5 5.5l1-1.2 2 .8c0 1.2-1 2.2-2.4 2.2A8 8 0 0 1 7.2 7.9C7.2 6.5 8.2 5.5 9.4 5.5l.8 2z',
};

export const SERVICE_ICONS = ['scan', 'engine', 'gear', 'thermo', 'bolt', 'pin', 'oil', 'shield', 'wrench', 'brake', 'car', 'clock'];

export function Icon({ name, size = 18, className = '', fill = false }) {
  return (
    <svg className={`ic ${className}`} width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.wrench} />
    </svg>
  );
}
