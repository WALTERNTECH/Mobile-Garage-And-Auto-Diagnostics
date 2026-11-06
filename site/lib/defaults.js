// Used only if the database cannot be reached, so the site still shows contact details.
export const fallback = {
  business: {
    name: 'Mobile Garage & Auto Diagnostics',
    shortName: 'Mobile Garage',
    tagline: 'Mobile mechanic and car diagnostics in Nairobi',
    phone: '0723 595977',
    phoneIntl: '+254723595977',
    whatsapp: '254723595977',
    address: 'Limuru Road, Nairobi',
    plusCode: 'QQQR+H5 Nairobi',
    lat: -1.2110885,
    lng: 36.7904054,
    mapsUrl: 'https://maps.app.goo.gl/JeqeSwUGnEToeRAt7',
    rating: 4.8,
    reviewCount: 35,
    hours: [
      { day: 'Monday', open: '07:30', close: '18:30' }, { day: 'Tuesday', open: '07:30', close: '18:30' },
      { day: 'Wednesday', open: '07:30', close: '18:30' }, { day: 'Thursday', open: '07:30', close: '18:30' },
      { day: 'Friday', open: '07:30', close: '18:30' }, { day: 'Saturday', open: '07:30', close: '18:30' },
      { day: 'Sunday', open: '10:30', close: '18:00' },
    ],
    hero: {
      eyebrow: 'Mobile mechanic · Limuru Road, Nairobi',
      title: 'The garage that comes to your car.',
      subtitle: 'Computer diagnostics and repairs at your home, office or roadside.',
    },
    about: { title: 'A mechanic who shows up, and explains.', body: '', points: [] },
    seo: {},
  },
  slides: [], services: [], testimonials: [], faqs: [],
};
