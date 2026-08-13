/* =========================================================================
   PEARLOOM EVENTS — 35+ event types. Each event drives:
     · which THEME PACKS are recommended (via mood)
     · the MOOD (gates motifs / tone / palette leaning)
     · the SECTION structure + order
     · the COPY (hero kicker, tagline, section heads, CTA)
     · event-appropriate DATA tables where it matters (somber, corporate, kids)

   The theme packs (visual systems) stay universal; events recombine them.

   Exports (window): EVENTS, EVENT_CATEGORIES, getEvent, buildEventCopy,
     MOOD_THEMES, recommendedThemes
   ========================================================================= */

/* Recommended theme order per mood (first = best fit) */
const MOOD_THEMES = {
  romantic: ['santorini', 'garden', 'tuscan', 'midnight', 'coastal', 'editorial'],
  joyful:   ['garden', 'tuscan', 'santorini', 'coastal', 'midnight', 'editorial'],
  playful:  ['tuscan', 'garden', 'coastal', 'santorini', 'editorial', 'midnight'],
  bold:     ['editorial', 'midnight', 'coastal', 'santorini', 'tuscan', 'garden'],
  elegant:  ['midnight', 'santorini', 'editorial', 'coastal', 'garden', 'tuscan'],
  formal:   ['editorial', 'midnight', 'coastal', 'santorini', 'garden', 'tuscan'],
  festive:  ['tuscan', 'midnight', 'garden', 'coastal', 'santorini', 'editorial'],
  somber:   ['coastal', 'editorial', 'midnight', 'santorini', 'garden', 'tuscan'],
  family:   ['garden', 'tuscan', 'coastal', 'santorini', 'editorial', 'midnight'],
};

/* Generic fallback section heads + data (wedding-ish but neutral) */
const DEF_HEADS = {
  story:    { eyebrow: 'ABOUT', title: 'A little', italic: 'about us' },
  details:  { eyebrow: 'GOOD TO KNOW', title: 'The', italic: 'details' },
  schedule: { eyebrow: 'THE PLAN', title: 'How it', italic: 'unfolds' },
  travel:   { eyebrow: 'GETTING THERE', title: 'Where to', italic: 'stay' },
  registry: { eyebrow: 'GIFTS', title: 'A little', italic: 'wishlist' },
  gallery:  { eyebrow: 'PHOTOS', title: 'A few', italic: 'favourites' },
  faq:      { eyebrow: 'Q & A', title: 'The little', italic: 'things' },
  rsvp:     { eyebrow: 'PLEASE REPLY', title: 'Will you', italic: 'be there?' },
};
const DEF_DATA = {
  details:  [
    { icon: 'sparkles', l: 'Dress code', v: 'Smart casual', s: 'Come comfortable' },
    { icon: 'clock', l: 'Timing', v: 'Doors at 6', s: 'Stay as late as you like' },
    { icon: 'pin', l: 'Parking', v: 'On-site', s: 'Plenty of room' },
  ],
  schedule: [
    { t: '6:00', l: 'Arrivals', s: 'Drinks & hellos', m: 'pm' },
    { t: '7:00', l: 'The main event', s: '', m: 'pm' },
    { t: '8:30', l: 'Toasts', s: 'A few words', m: 'pm' },
    { t: '9:00', l: 'Celebrate', s: 'Until late', m: 'pm' },
  ],
  travel: [
    { name: 'The Grand Hotel', sub: '5-min walk · room block', tone: 'warm' },
    { name: 'Garden Inn', sub: '10-min walk', tone: 'lavender' },
  ],
  registry: ['Group gift', 'Experiences', 'Charity'],
  faq: ['What should I wear?', 'Can I bring a guest?', 'Is there parking?', 'Where do I check in?'],
  story: { body: 'A few words about the day, the people, and why it matters. This is where the story goes — warm, specific, and yours.', chips: ['The details', 'Good company', 'A day to remember'] },
};

/* ---------- THE CATALOG ---------- */

const EVENTS = [
  /* ===== Weddings & love ===== */
  { id: 'wedding', label: 'Wedding', category: 'Weddings & love', icon: 'heart-icon', mood: 'romantic', subject: 'couple',
    subj: { a: 'Scott', b: 'Shauna' }, lead: 'SAVE THE DATE', cta: 'RSVP', useVoice: true,
    sections: ['hero','story','details','schedule','travel','registry','gallery','rsvp','faq'],
    data: { registry: ['Honeymoon fund', 'Crate & Barrel', 'Zola'],
      travel: [{ name: 'Cosmos Suites', sub: 'Room block: SHAUNA27', tone: 'warm' }, { name: 'Andronis Boutique', sub: 'Cliffside · book early', tone: 'lavender' }] },
    meta: { date: 'Monday, April 26, 2027', place: 'Casa Chorro · Santorini, Greece' } },

  { id: 'engagement', label: 'Engagement party', category: 'Weddings & love', icon: 'sparkles', mood: 'romantic', subject: 'couple',
    subj: { a: 'Scott', b: 'Shauna' }, lead: 'WE\u2019RE ENGAGED', cta: 'Count me in', tagline: 'she said yes',
    sections: ['hero','story','details','schedule','gallery','rsvp'],
    heads: { story: { eyebrow: 'THE PROPOSAL', title: 'How it', italic: 'happened' }, rsvp: { eyebrow: 'JOIN US', title: 'Come', italic: 'celebrate' } },
    meta: { date: 'Saturday, June 12, 2027', place: 'The Rooftop · Lisbon' } },

  { id: 'vow-renewal', label: 'Vow renewal', category: 'Weddings & love', icon: 'heart-icon', mood: 'romantic', subject: 'couple',
    subj: { a: 'Scott', b: 'Shauna' }, lead: 'TWENTY YEARS ON', cta: 'RSVP', tagline: 'we\u2019d choose you again',
    sections: ['hero','story','schedule','gallery','rsvp'],
    meta: { date: 'Autumn 2027', place: 'Where it all began' } },

  { id: 'anniversary', label: 'Anniversary', category: 'Weddings & love', icon: 'heart-icon', mood: 'elegant', subject: 'couple',
    subj: { a: 'Scott', b: 'Shauna' }, lead: 'CELEBRATING', cta: 'Join us', tagline: 'fifty golden years',
    sections: ['hero','story','schedule','gallery','rsvp'],
    meta: { date: 'May 2027', place: 'The Vineyard' } },

  /* ===== Showers & new life ===== */
  { id: 'bridal-shower', label: 'Bridal shower', category: 'Showers & new arrivals', icon: 'gift', mood: 'joyful', subject: 'title',
    subj: { title: 'Shauna\u2019s Shower' }, lead: 'SHOWERING', cta: 'RSVP', tagline: 'before the big day',
    sections: ['hero','details','registry','gallery','rsvp'],
    heads: { registry: { eyebrow: 'GIFTS', title: 'Her', italic: 'wishlist' } },
    meta: { date: 'Sunday, March 14', place: 'The Garden Room' } },

  { id: 'baby-shower', label: 'Baby shower', category: 'Showers & new arrivals', icon: 'gift', mood: 'family', subject: 'title',
    subj: { title: 'Baby Ellison' }, lead: 'A BABY IS ON THE WAY', cta: 'RSVP', tagline: 'oh baby!',
    sections: ['hero','details','registry','gallery','rsvp'],
    heads: { details: { eyebrow: 'GOOD TO KNOW', title: 'The', italic: 'shower' }, registry: { eyebrow: 'REGISTRY', title: 'Little', italic: 'things' } },
    data: { registry: ['Diapers & wipes', 'Nursery fund', 'Storybooks'], details: [
      { icon: 'calendar', l: 'When', v: 'Sun, 2 pm', s: 'Brunch & games' },
      { icon: 'gift', l: 'Theme', v: 'Woodland', s: 'Soft greens' },
      { icon: 'heart-icon', l: "It's a", v: 'Surprise!', s: 'Guess away' } ] },
    meta: { date: 'Sunday, 2:00 pm', place: 'The Conservatory' } },

  { id: 'gender-reveal', label: 'Gender reveal', category: 'Showers & new arrivals', icon: 'sparkles', mood: 'playful', subject: 'title',
    subj: { title: 'Boy or Girl?' }, lead: 'THE BIG REVEAL', cta: "I'll be there", tagline: 'pink or blue?',
    sections: ['hero','details','gallery','rsvp'],
    meta: { date: 'Saturday afternoon', place: 'The Backyard' } },

  { id: 'sip-and-see', label: 'Sip & see / Welcome', category: 'Showers & new arrivals', icon: 'heart-icon', mood: 'family', subject: 'title',
    subj: { title: 'Meet Baby Rose' }, lead: 'COME MEET', cta: 'RSVP', tagline: 'she\u2019s finally here',
    sections: ['hero','details','gallery','rsvp'],
    meta: { date: 'Saturday, 11 am', place: 'Our home' } },

  { id: 'christening', label: 'Christening / Baptism', category: 'Showers & new arrivals', icon: 'leaf', mood: 'elegant', subject: 'title',
    subj: { title: 'The Baptism of Rose' }, lead: 'YOU ARE INVITED', cta: 'RSVP', tagline: 'a day of blessing',
    sections: ['hero','schedule','details','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'ORDER OF SERVICE', title: 'The', italic: 'ceremony' } },
    meta: { date: 'Sunday, 10 am', place: "St. Mary\u2019s Chapel" } },

  /* ===== Birthdays & milestones ===== */
  { id: 'birthday', label: 'Birthday party', category: 'Birthdays & milestones', icon: 'gift', mood: 'playful', subject: 'title',
    subj: { title: "Mia\u2019s Birthday" }, lead: "YOU\u2019RE INVITED", cta: 'Count me in', tagline: 'let\u2019s celebrate',
    sections: ['hero','details','schedule','gallery','rsvp'],
    heads: { details: { eyebrow: 'THE NEED-TO-KNOWS', title: 'Party', italic: 'details' } },
    meta: { date: 'Saturday, 7 pm', place: 'The Loft' } },

  { id: 'milestone-birthday', label: 'Milestone birthday', category: 'Birthdays & milestones', icon: 'sparkles', mood: 'bold', subject: 'title',
    subj: { title: 'Mia turns 40' }, lead: 'FORTY & FABULOUS', cta: 'Count me in', tagline: 'four decades, no regrets',
    sections: ['hero','story','details','schedule','gallery','rsvp'],
    meta: { date: 'Saturday night', place: 'The Supper Club' } },

  { id: 'sweet-sixteen', label: 'Sweet sixteen', category: 'Birthdays & milestones', icon: 'sparkles', mood: 'bold', subject: 'title',
    subj: { title: 'Mia\u2019s Sweet 16' }, lead: 'SWEET SIXTEEN', cta: 'RSVP', tagline: 'sixteen & shining',
    sections: ['hero','details','schedule','gallery','rsvp'],
    meta: { date: 'Friday, 8 pm', place: 'The Ballroom' } },

  { id: 'quinceanera', label: 'Quinceañera', category: 'Birthdays & milestones', icon: 'sparkles', mood: 'festive', subject: 'title',
    subj: { title: 'Sofía\u2019s Quinceañera' }, lead: 'MIS QUINCE AÑOS', cta: 'RSVP', tagline: 'quince años de sueños',
    sections: ['hero','story','schedule','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'LA CELEBRACIÓN', title: 'The', italic: 'evening' } },
    meta: { date: 'Saturday, 6 pm', place: 'Salón Real' } },

  { id: 'bar-mitzvah', label: 'Bar / Bat Mitzvah', category: 'Birthdays & milestones', icon: 'star', mood: 'festive', subject: 'title',
    subj: { title: "Noah\u2019s Bar Mitzvah" }, lead: 'TODAY I AM', cta: 'RSVP', tagline: 'mazel tov!',
    sections: ['hero','schedule','details','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'THE WEEKEND', title: 'Service &', italic: 'celebration' } },
    meta: { date: 'Saturday morning', place: 'Temple Beth Shalom' } },

  /* ===== Parties & nightlife ===== */
  { id: 'bachelor', label: 'Bachelor party', category: 'Parties & nightlife', icon: 'sparkles', mood: 'bold', subject: 'title',
    subj: { title: "Scott\u2019s Last Ride" }, lead: 'ONE LAST RIDE', cta: "I'm in", tagline: 'what happens in Vegas…',
    sections: ['hero','schedule','details','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'THE WEEKEND', title: 'The', italic: 'itinerary' }, details: { eyebrow: 'LOGISTICS', title: 'Need to', italic: 'know' } },
    data: { details: [
      { icon: 'pin', l: 'Where', v: 'Las Vegas', s: '2 nights' },
      { icon: 'gift', l: 'Damage', v: '$420 pp', s: 'Room + table' },
      { icon: 'clock', l: 'Arrive by', v: 'Fri 4pm', s: "Don\u2019t be late" } ] },
    meta: { date: 'Memorial Day weekend', place: 'Las Vegas, NV' } },

  { id: 'bachelorette', label: 'Bachelorette party', category: 'Parties & nightlife', icon: 'sparkles', mood: 'playful', subject: 'title',
    subj: { title: "Shauna\u2019s Last Fling" }, lead: 'LAST FLING BEFORE THE RING', cta: "I'm in", tagline: 'final fiesta',
    sections: ['hero','schedule','details','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'THE WEEKEND', title: 'The', italic: 'plan' } },
    meta: { date: 'June 6–8', place: 'Charleston, SC' } },

  { id: 'cocktail', label: 'Cocktail party', category: 'Parties & nightlife', icon: 'sparkles', mood: 'elegant', subject: 'title',
    subj: { title: 'Cocktails & Co.' }, lead: 'JOIN US FOR', cta: 'RSVP', tagline: 'a proper evening',
    sections: ['hero','details','gallery','rsvp'],
    meta: { date: 'Friday, 7 pm', place: 'The Library Bar' } },

  { id: 'nye', label: 'New Year\u2019s Eve', category: 'Parties & nightlife', icon: 'sparkles', mood: 'bold', subject: 'title',
    subj: { title: 'New Year\u2019s Eve' }, lead: 'RING IT IN', cta: "I'm in", tagline: 'see you at midnight',
    sections: ['hero','details','schedule','gallery','rsvp'],
    meta: { date: 'Dec 31, 9 pm', place: 'The Rooftop' } },

  { id: 'holiday', label: 'Holiday party', category: 'Parties & nightlife', icon: 'leaf', mood: 'festive', subject: 'title',
    subj: { title: 'Holiday Soirée' }, lead: 'TIS THE SEASON', cta: 'RSVP', tagline: 'merry & bright',
    sections: ['hero','details','schedule','gallery','rsvp'],
    meta: { date: 'Saturday, Dec 14', place: 'The Manor' } },

  { id: 'dinner-party', label: 'Dinner party', category: 'Parties & nightlife', icon: 'sparkles', mood: 'elegant', subject: 'title',
    subj: { title: 'Supper at Ours' }, lead: 'COME FOR DINNER', cta: 'RSVP', tagline: 'a seat at our table',
    sections: ['hero','details','gallery','rsvp'],
    meta: { date: 'Saturday, 7:30 pm', place: 'Our home' } },

  /* ===== Gatherings ===== */
  { id: 'graduation', label: 'Graduation', category: 'Gatherings & milestones', icon: 'star', mood: 'joyful', subject: 'title',
    subj: { title: 'Mia, Class of 2027' }, lead: 'SHE DID IT', cta: 'RSVP', tagline: 'pomp & circumstance',
    sections: ['hero','story','schedule','gallery','rsvp'],
    heads: { story: { eyebrow: 'THE GRAD', title: 'Four years,', italic: 'one degree' } },
    meta: { date: 'Saturday, 2 pm', place: 'The Quad' } },

  { id: 'retirement', label: 'Retirement', category: 'Gatherings & milestones', icon: 'sun', mood: 'elegant', subject: 'title',
    subj: { title: 'Cheers to Margaret' }, lead: 'HAPPILY RETIRED', cta: 'RSVP', tagline: '40 years, well earned',
    sections: ['hero','story','schedule','gallery','rsvp'],
    heads: { story: { eyebrow: 'A CAREER', title: 'Four decades of', italic: 'service' } },
    meta: { date: 'Friday, 5 pm', place: 'The Terrace' } },

  { id: 'reunion', label: 'Reunion', category: 'Gatherings & milestones', icon: 'users', mood: 'joyful', subject: 'title',
    subj: { title: 'The Ellison Reunion' }, lead: 'BACK TOGETHER', cta: 'RSVP', tagline: 'the gang\u2019s all here',
    sections: ['hero','schedule','travel','gallery','rsvp'],
    meta: { date: 'Labor Day weekend', place: 'Lake House' } },

  { id: 'housewarming', label: 'Housewarming', category: 'Gatherings & milestones', icon: 'home', mood: 'family', subject: 'title',
    subj: { title: 'Our New Place' }, lead: 'WE MOVED', cta: 'RSVP', tagline: 'come see the place',
    sections: ['hero','details','registry','gallery','rsvp'],
    heads: { registry: { eyebrow: 'IF YOU INSIST', title: 'For the', italic: 'home' } },
    meta: { date: 'Saturday, 4 pm', place: '12 Maple Street' } },

  /* ===== Memorial ===== */
  { id: 'funeral', label: 'Funeral', category: 'In memory', icon: 'leaf', mood: 'somber', subject: 'title',
    subj: { title: 'Margaret Ellison' }, lead: 'IN LOVING MEMORY', cta: 'Let us know', tagline: '1948 — 2026',
    sections: ['hero','story','schedule','faq','registry','rsvp'],
    heads: {
      story: { eyebrow: 'IN LOVING MEMORY', title: 'A life well', italic: 'lived' },
      schedule: { eyebrow: 'ORDER OF SERVICE', title: 'The', italic: 'service' },
      faq: { eyebrow: 'TRIBUTES', title: 'Share a', italic: 'memory' },
      registry: { eyebrow: 'IN LIEU OF FLOWERS', title: 'A cause she', italic: 'loved' },
      rsvp: { eyebrow: 'ATTENDING', title: 'Joining', italic: 'us?' },
    },
    body: { rsvpSub: 'Please let the family know if you plan to attend the service and reception.' },
    data: {
      schedule: [
        { t: '10:00', l: 'Gathering', s: 'Chapel doors open', m: 'am' },
        { t: '10:30', l: 'Service', s: 'Readings & eulogies', m: 'am' },
        { t: '12:00', l: 'Committal', s: 'Graveside, family', m: 'pm' },
        { t: '1:00', l: 'Reception', s: 'Lunch & remembrance', m: 'pm' },
      ],
      faq: ['A favourite memory of Margaret', 'How did you know her?', 'A song she loved', 'Words for the family'],
      registry: ['Heart Foundation', 'Hospice fund', 'Local library'],
      story: { body: 'Margaret lived eight decades with grace, mischief and an open door. A gardener, a teacher, a grandmother to many. We gather not only to mourn, but to give thanks for a life that touched all of ours.', chips: ['1948 — 2026', 'Beloved teacher', 'Forever missed'] },
    },
    meta: { date: 'Friday, April 9', place: "St. Mary\u2019s Chapel" } },

  { id: 'celebration-of-life', label: 'Celebration of life', category: 'In memory', icon: 'sun', mood: 'somber', subject: 'title',
    subj: { title: 'Remembering David' }, lead: 'A CELEBRATION OF LIFE', cta: 'Let us know', tagline: 'a life worth celebrating',
    sections: ['hero','story','schedule','gallery','faq','rsvp'],
    heads: {
      story: { eyebrow: 'HIS STORY', title: 'A life, in', italic: 'full' },
      schedule: { eyebrow: 'THE GATHERING', title: 'How we\u2019ll', italic: 'remember' },
      faq: { eyebrow: 'MEMORIES', title: 'Share a', italic: 'story' },
      rsvp: { eyebrow: 'JOINING US', title: 'Will you', italic: 'be there?' },
    },
    data: { faq: ['A favourite memory of David', 'How did your paths cross?', 'Something that made you laugh', 'A photo you\u2019d like to share'],
      story: { body: 'No black ties, no hushed voices — David wouldn\u2019t have wanted that. Bring a story, bring a smile, and help us celebrate a life lived loudly and well.', chips: ['Bring a story', 'Wear colour', 'Raise a glass'] } },
    meta: { date: 'Sunday, 2 pm', place: 'The Boathouse' } },

  /* ===== Professional ===== */
  { id: 'corporate', label: 'Corporate event', category: 'Professional', icon: 'users', mood: 'formal', subject: 'title',
    subj: { title: 'Acme Annual Summit' }, lead: 'YOU\u2019RE INVITED', cta: 'Register', tagline: 'one team, one day',
    sections: ['hero','schedule','details','travel','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'AGENDA', title: 'The', italic: 'programme' }, details: { eyebrow: 'GOOD TO KNOW', title: 'Event', italic: 'info' }, rsvp: { eyebrow: 'REGISTER', title: 'Reserve your', italic: 'spot' } },
    data: { schedule: [
      { t: '9:00', l: 'Keynote', s: 'Main stage', m: 'am' },
      { t: '11:00', l: 'Breakouts', s: 'Tracks A–C', m: 'am' },
      { t: '1:00', l: 'Lunch & demos', s: 'Expo hall', m: 'pm' },
      { t: '4:00', l: 'Closing panel', s: 'Main stage', m: 'pm' } ],
      details: [
        { icon: 'pin', l: 'Venue', v: 'Hall A', s: 'Convention Center' },
        { icon: 'ticket', l: 'Badge', v: 'At check-in', s: 'Bring ID' },
        { icon: 'globe', l: 'Stream', v: 'Online too', s: 'Link to follow' } ] },
    meta: { date: 'Thursday, Oct 14', place: 'Metro Convention Center' } },

  { id: 'conference', label: 'Conference', category: 'Professional', icon: 'mic', mood: 'bold', subject: 'title',
    subj: { title: 'DesignWeek 2027' }, lead: 'JOIN US AT', cta: 'Get tickets', tagline: 'three days, one craft',
    sections: ['hero','schedule','details','travel','gallery','rsvp'],
    heads: { schedule: { eyebrow: 'PROGRAMME', title: 'The', italic: 'sessions' }, rsvp: { eyebrow: 'TICKETS', title: 'Secure your', italic: 'pass' } },
    meta: { date: 'March 3–5', place: 'The Pavilion' } },

  { id: 'product-launch', label: 'Product launch', category: 'Professional', icon: 'sparkles', mood: 'bold', subject: 'title',
    subj: { title: 'Introducing Halo' }, lead: 'THE UNVEILING', cta: 'Reserve a seat', tagline: 'the wait is over',
    sections: ['hero','story','schedule','gallery','rsvp'],
    heads: { story: { eyebrow: 'THE STORY', title: 'Why we built', italic: 'it' } },
    meta: { date: 'Tuesday, 6 pm', place: 'The Showroom' } },

  { id: 'fundraiser', label: 'Fundraiser / Gala', category: 'Professional', icon: 'heart-icon', mood: 'elegant', subject: 'title',
    subj: { title: 'The Spring Gala' }, lead: 'AN EVENING FOR GOOD', cta: 'Buy tickets', tagline: 'for a brighter year',
    sections: ['hero','story','schedule','details','registry','rsvp'],
    heads: { story: { eyebrow: 'THE CAUSE', title: 'Why we\u2019re', italic: 'here' }, registry: { eyebrow: 'GIVE', title: 'Make a', italic: 'gift' }, rsvp: { eyebrow: 'TICKETS', title: 'Reserve your', italic: 'table' } },
    data: { registry: ['$100 · Friend', '$500 · Patron', '$2,500 · Table'] },
    meta: { date: 'Saturday, 7 pm', place: 'The Grand Ballroom' } },

  { id: 'awards', label: 'Awards night', category: 'Professional', icon: 'star', mood: 'formal', subject: 'title',
    subj: { title: 'The 2027 Awards' }, lead: 'A NIGHT OF HONOURS', cta: 'RSVP', tagline: 'and the winner is…',
    sections: ['hero','schedule','details','gallery','rsvp'],
    meta: { date: 'Friday, 7 pm', place: 'The Opera House' } },

  { id: 'workshop', label: 'Workshop / Class', category: 'Professional', icon: 'brush', mood: 'joyful', subject: 'title',
    subj: { title: 'Hands-on Ceramics' }, lead: 'COME MAKE SOMETHING', cta: 'Reserve a spot', tagline: 'get your hands dirty',
    sections: ['hero','details','schedule','gallery','rsvp'],
    meta: { date: 'Saturday, 10 am', place: 'The Studio' } },

  /* ===== Community ===== */
  { id: 'festival', label: 'Festival', category: 'Community', icon: 'music', mood: 'festive', subject: 'title',
    subj: { title: 'Harvest Festival' }, lead: 'COME ONE, COME ALL', cta: 'Get tickets', tagline: 'food, music, magic',
    sections: ['hero','schedule','details','gallery','rsvp'],
    meta: { date: 'Sat–Sun, Sept 20–21', place: 'Riverside Park' } },

  { id: 'sports', label: 'Sports / Tournament', category: 'Community', icon: 'flag', mood: 'bold', subject: 'title',
    subj: { title: 'The Charity 5K' }, lead: 'ON YOUR MARKS', cta: 'Register', tagline: 'run for a reason',
    sections: ['hero','details','schedule','gallery','rsvp'],
    meta: { date: 'Sunday, 8 am', place: 'The Waterfront' } },

  { id: 'prom', label: 'Prom / School dance', category: 'Community', icon: 'star', mood: 'bold', subject: 'title',
    subj: { title: 'Prom 2027' }, lead: 'A NIGHT TO REMEMBER', cta: 'RSVP', tagline: 'under the stars',
    sections: ['hero','details','gallery','rsvp'],
    meta: { date: 'Saturday, 8 pm', place: 'The Starlight Hall' } },
];

const EVENT_CATEGORIES = (() => {
  const order = [];
  const map = {};
  EVENTS.forEach(e => { if (!map[e.category]) { map[e.category] = []; order.push(e.category); } map[e.category].push(e); });
  return order.map(c => ({ name: c, events: map[c] }));
})();

function getEvent(id) { return EVENTS.find(e => e.id === id) || EVENTS[0]; }

/* Section id → rail label + icon (the canvas uses the same kind ids) */
const SECTION_META = {
  hero:     { label: 'Hero', icon: 'home' },
  story:    { label: 'Story', icon: 'heart-icon' },
  details:  { label: 'Details', icon: 'sparkles' },
  schedule: { label: 'Schedule', icon: 'calendar' },
  travel:   { label: 'Travel', icon: 'map' },
  registry: { label: 'Registry', icon: 'gift' },
  gallery:  { label: 'Gallery', icon: 'image' },
  rsvp:     { label: 'RSVP', icon: 'mail' },
  faq:      { label: 'FAQ', icon: 'sparkles' },
};

/* Rail items for an event: [{id,label,icon,desc}] using the event's copy */
function railSections(event, voice) {
  const C = buildEventCopy(event, voice);
  const descFor = { hero: 'Title, date, cover', story: 'The story', details: 'Good to know', schedule: 'Order of the day', travel: 'Getting there', registry: 'Gifts / giving', gallery: 'Photos', rsvp: C.cta, faq: 'Questions' };
  return event.sections.map(k => ({ id: k, label: (SECTION_META[k] || {}).label || k, icon: (SECTION_META[k] || {}).icon || 'page', desc: descFor[k] || '' }));
}function recommendedThemes(event) {
  return event.themes || MOOD_THEMES[event.mood] || MOOD_THEMES.joyful;
}

/* A coherent starting point for ALL FOUR dials, derived from the event mood. */
const MOOD_KIT    = { romantic: 'classic', joyful: 'classic', playful: 'scrapbook', bold: 'ticket', elegant: 'plate', formal: 'plate', festive: 'ticket', somber: 'minimal', family: 'scrapbook' };
const MOOD_LAYOUT = { romantic: 'stacked', joyful: 'stacked', playful: 'stacked', bold: 'split', elegant: 'boxed', formal: 'boxed', festive: 'stacked', somber: 'stacked', family: 'stacked' };
const MOOD_VOICE  = { romantic: 'poetic', playful: 'playful', festive: 'playful', family: 'playful' };
function eventDefaults(event) {
  const rec = recommendedThemes(event);
  return {
    themeId: event.theme || rec[0],
    kitId: event.kit || MOOD_KIT[event.mood] || 'classic',
    siteLayout: event.layout || MOOD_LAYOUT[event.mood] || 'stacked',
    voice: event.useVoice ? (MOOD_VOICE[event.mood] || 'classic') : 'classic',
    motifsOn: event.mood !== 'somber',
    intensity: event.mood === 'somber' ? 0.7 : 1,
  };
}

/* Assemble the copy object the renderers expect, from event + voice. */
function buildEventCopy(event, voice) {
  // Wedding keeps the rich 3-voice copy
  const base = (event.useVoice && typeof COPY !== 'undefined' && COPY[voice]) ? COPY[voice] : null;

  const head = (kind) => (event.heads && event.heads[kind]) || (base && base[kind]) || DEF_HEADS[kind];
  const dataFor = (kind) => (event.data && event.data[kind]) || (base && baseData(base, kind)) || DEF_DATA[kind];

  const story = {
    ...head('story'),
    body: (event.data && event.data.story && event.data.story.body) || (base && base.story.body) || DEF_DATA.story.body,
    chips: (event.data && event.data.story && event.data.story.chips) || (base && base.story.chips) || DEF_DATA.story.chips,
  };

  return {
    mood: event.mood,
    subject: event.subject === 'couple' ? { type: 'couple', a: event.subj.a, b: event.subj.b } : { type: 'title', title: event.subj.title },
    lead: event.lead,
    tagline: base ? base.tagline : (event.tagline || ''),
    cta: event.cta || 'RSVP',
    meta: event.meta || {},
    sections: event.sections,
    story,
    details: head('details'),
    schedule: head('schedule'),
    travel: head('travel'),
    registry: { ...head('registry'), body: (event.body && event.body.registryBody) || (base && base.registry.body) || 'If you\u2019d like to give, here are a few ways.' },
    gallery: head('gallery'),
    faq: { ...head('faq'), qs: dataFor('faq') },
    rsvp: { ...head('rsvp'), sub: (event.body && event.body.rsvpSub) || (base && base.rsvp.sub) || 'It only takes a minute. We\u2019d love to know if you can make it.' },
    data: {
      details: dataFor('details'),
      schedule: dataFor('schedule'),
      travel: dataFor('travel'),
      registry: dataFor('registry'),
    },
  };
}
function baseData() { return null; } // wedding data tables live in themed-site defaults

Object.assign(window, { EVENTS, EVENT_CATEGORIES, getEvent, buildEventCopy, MOOD_THEMES, recommendedThemes, eventDefaults, SECTION_META, railSections });
