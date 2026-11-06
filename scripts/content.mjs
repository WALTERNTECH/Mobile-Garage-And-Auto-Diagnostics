// First-run content, taken from the Google Maps listing (Nov 2026). Everything here is editable in the admin.
export const business = {
  name: 'Mobile Garage & Auto Diagnostics',
  shortName: 'Mobile Garage',
  tagline: 'Mobile mechanic and car diagnostics in Nairobi',
  phone: '0723 595977',
  phoneIntl: '+254723595977',
  whatsapp: '254723595977',
  email: '',
  address: 'Limuru Road, Nairobi',
  plusCode: 'QQQR+H5 Nairobi',
  lat: -1.2110885,
  lng: 36.7904054,
  mapsUrl: 'https://maps.app.goo.gl/JeqeSwUGnEToeRAt7',
  rating: 4.8,
  reviewCount: 35,
  hours: [
    { day: 'Monday', open: '07:30', close: '18:30', closed: false },
    { day: 'Tuesday', open: '07:30', close: '18:30', closed: false },
    { day: 'Wednesday', open: '07:30', close: '18:30', closed: false },
    { day: 'Thursday', open: '07:30', close: '18:30', closed: false },
    { day: 'Friday', open: '07:30', close: '18:30', closed: false },
    { day: 'Saturday', open: '07:30', close: '18:30', closed: false },
    { day: 'Sunday', open: '10:30', close: '18:00', closed: false },
  ],
  hero: {
    eyebrow: 'Mobile mechanic · Limuru Road, Nairobi',
    title: 'The garage that comes to your car.',
    subtitle: 'Computer diagnostics and repairs at your home, office or roadside. We find the fault, explain it clearly, and get you moving again.',
  },
  about: {
    title: 'A mechanic who shows up, and explains.',
    body: 'Mobile Garage & Auto Diagnostics brings scan tools and a full kit to wherever your car is. Customers mention the same things again and again: we come quickly, we diagnose properly, and we take the time to walk you through the results and your options before any work starts.',
    points: [
      'We come to you: home, office, or where you broke down',
      'Computer diagnostics before guesswork',
      'Clear explanation of the fault and the options',
      'Workshop on Limuru Road for bigger jobs',
    ],
  },
  announcement: { enabled: false, text: '', link: '' },
  social: { facebook: '', instagram: '', tiktok: '' },
  seo: {
    title: 'Mobile Garage & Auto Diagnostics | Mobile mechanic in Nairobi',
    description: 'Mobile car diagnostics and repairs in Nairobi. Engine, timing, transmission, overheating and electrical faults fixed at your location. Call or WhatsApp 0723 595977.',
  },
};

// photo keys refer to files in .local/maps-photos
export const slides = [
  { photo: 'p2', eyebrow: 'On-site repairs', title: 'Fixed where your car stands', subtitle: 'Diagnostics and repairs at your home, office or roadside.', cta_label: 'Book a mechanic', cta_href: '#book' },
  { photo: 'p7', eyebrow: 'Breakdown call-outs', title: 'Stuck at night? Call us.', subtitle: 'Customers have called late at night and had us there fast.', cta_label: 'Call now', cta_href: 'tel' },
  { photo: 'p3', eyebrow: 'Engine & timing', title: 'Precise engine work', subtitle: 'Misfires, timing faults and check-engine lights, traced to the cause.', cta_label: 'See services', cta_href: '#services' },
  { photo: 'p5', eyebrow: 'Our workshop', title: 'Fully kitted on Limuru Road', subtitle: 'Jacks, stands and tools ready for the bigger jobs.', cta_label: 'Get directions', cta_href: 'maps' },
];

export const services = [
  {
    slug: 'computer-diagnostics', title: 'Computer Diagnostics', category: 'Diagnostics', icon: 'scan', featured: true,
    summary: 'A full scan at your location: fault codes, live sensor data and a plain explanation of what is wrong.',
    description: 'We plug a professional scan tool into your car wherever it is, read and interpret the fault codes, check live sensor data, and then sit down with you to go through what we found and what it will take to fix it. No guesswork, no parts swapped "to see".',
    highlights: ['Check-engine and warning lights', 'Fault codes read, explained and cleared', 'Live sensor data checks', 'Results walked through with you'],
    photos: ['p3', 'p2'],
  },
  {
    slug: 'engine-timing-repair', title: 'Engine & Timing Repair', category: 'Engine', icon: 'engine', featured: true,
    summary: 'Timing belts and chains, misfires, rough idling, loss of power and oil leaks.',
    description: 'From a rough idle to a timing fault that stops the car, we trace engine problems to the cause before replacing anything. Timing belt and chain work, ignition coils and plugs, sensors, and leaks.',
    highlights: ['Timing belt and chain work', 'Misfire and rough-idle diagnosis', 'Ignition coils and spark plugs', 'Oil leaks and gaskets'],
    photos: ['p3', 'p2'],
  },
  {
    slug: 'transmission-repair', title: 'Transmission & Gearbox', category: 'Drivetrain', icon: 'gear', featured: true,
    summary: 'Hard or delayed shifting, slipping, warning lights and fluid problems on automatic and manual boxes.',
    description: 'Gearbox trouble is expensive when it is guessed at. We scan the transmission control unit, check fluid condition and level, and tell you honestly whether it is a service, a sensor, or a bigger repair.',
    highlights: ['Transmission fault scanning', 'Shifting and slipping problems', 'Fluid checks and service', 'Honest repair-or-replace advice'],
    photos: ['p2'],
  },
  {
    slug: 'overheating-cooling', title: 'Overheating & Cooling', category: 'Engine', icon: 'thermo', featured: false,
    summary: 'Temperature climbing, coolant loss or steam: radiators, thermostats, water pumps and fans.',
    description: 'Overheating can wreck an engine quickly, so stop driving and call. We find where the coolant is going or why it is not circulating, then repair the radiator, hoses, thermostat, water pump or cooling fan.',
    highlights: ['Leak tracing and pressure checks', 'Thermostat and water pump', 'Radiator, hoses and fans', 'Coolant service'],
    photos: ['p7', 'p3'],
  },
  {
    slug: 'auto-electrical', title: 'Auto Electrical & Batteries', category: 'Electrical', icon: 'bolt', featured: false,
    summary: 'No-start, flat batteries, charging faults, sensors and wiring.',
    description: 'If the car will not crank, keeps draining its battery, or throws electrical warnings, we test the battery, starter and alternator, then trace sensor and wiring faults with the scan tool and a meter.',
    highlights: ['Battery, starter and alternator tests', 'Sensor faults', 'Wiring and connector repairs', 'Lights and accessories'],
    photos: ['p7'],
  },
  {
    slug: 'breakdown-call-outs', title: 'Mobile Call-outs', category: 'Mobile', icon: 'pin', featured: true,
    summary: 'Broken down at home, at work or on the road? We come to you with the tools to diagnose and fix.',
    description: 'Tell us where you are and what the car is doing. We come out, diagnose on the spot, and fix it there when it can be done safely. When it cannot, we explain the options and arrange the next step.',
    highlights: ['Home, office and roadside', 'Diagnosis on arrival', 'Many repairs done on the spot', 'Clear next steps if not'],
    photos: ['p7', 'p2'],
  },
  {
    slug: 'routine-servicing', title: 'Routine Servicing', category: 'Maintenance', icon: 'oil', featured: false,
    summary: 'Oil and filters, fluids, plugs and a once-over that catches problems early.',
    description: 'A regular service keeps small problems small. Oil and filter change, fluid top-ups, plugs and belts checked, plus a scan for stored fault codes. Done at your place or at the workshop.',
    highlights: ['Engine oil and filters', 'Fluids topped up', 'Belts, plugs and hoses checked', 'Stored fault code scan'],
    photos: ['p5', 'p1'],
  },
  {
    slug: 'pre-purchase-inspection', title: 'Pre-purchase Inspection', category: 'Diagnostics', icon: 'shield', featured: false,
    summary: 'Buying a used car? Get it scanned and checked before you pay.',
    description: 'We meet you at the seller, scan every module for stored and pending faults, and inspect the engine, gearbox, cooling system and underside, so you know what you are buying and can negotiate with facts.',
    highlights: ['Full multi-module scan', 'Engine and gearbox check', 'Leaks and underbody look', 'Findings explained on the spot'],
    photos: ['p2', 'p3'],
  },
];

export const testimonials = [
  { name: 'Austin Adrians Baraza', when_label: 'Google review', body: 'The mechanic knew what he was doing, I called him late at night and he came immediately. I needed to know the issue urgently. I appreciate the good job done and attention to detail. He is truly a professional as he diagnosed the issue and provided the solution and my car got moving again.' },
  { name: 'Rose Mwelesa', when_label: 'Google review', body: 'Excellent service! The vehicle diagnostic was done professionally and efficiently. They were very helpful, explained the issue clearly, and provided great customer service. I highly recommend them to anyone looking for reliable and trustworthy vehicle diagnostic services.' },
  { name: 'David Odida', when_label: 'Google review', body: 'Very happy with the service. The diagnostic was on point and he was on time at the agreed meeting point. Was also very patient in reviewing the results and possible solutions. Very happy.' },
];

export const faqs = [
  { question: 'Do you come to me?', answer: 'Yes. We are a mobile garage: we come to your home, office or wherever the car has stopped, in Nairobi and nearby. Bigger jobs can be done at our workshop on Limuru Road.' },
  { question: 'How much does a diagnostic cost?', answer: 'It depends on the vehicle and where you are. Call or WhatsApp 0723 595977 with your make, model and location and we will give you a price before we come.' },
  { question: 'Can you fix the car on the spot?', answer: 'Many faults, yes. When a repair needs parts or the workshop, we explain what we found, what it will cost, and arrange the next step with you.' },
  { question: 'Which cars do you work on?', answer: 'Most makes and models. Tell us the make, model and year when you book so we bring the right tools.' },
  { question: 'What are your hours?', answer: 'Monday to Saturday 7:30 am to 6:30 pm, and Sunday 10:30 am to 6 pm. For a breakdown outside these hours, call and ask.' },
];
