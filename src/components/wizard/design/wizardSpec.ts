// Pearloom / wizard/design/wizardSpec.ts
// Step definitions, event registry, Pear speech per step.
// Kept separate from UI so the shell can iterate steps without
// pulling TSX in.

export type StepKey =
  | 'category'
  | 'occasion'
  | 'names'
  | 'date'
  | 'venue'
  | 'details'
  | 'photos'
  | 'photoreview'
  | 'vibe'
  | 'layout'
  | 'song'
  | 'ready'
  | 'generating';

export interface StepSpec {
  k: StepKey;
  n: number;
  l: string;
  s: string;
}

export const STEPS: StepSpec[] = [
  { k: 'category', n: 1, l: 'Category', s: 'What kind of moment?' },
  { k: 'occasion', n: 2, l: 'Occasion', s: 'What are we celebrating?' },
  { k: 'names', n: 3, l: 'Names', s: "Who's gathering?" },
  { k: 'date', n: 4, l: 'Date', s: "When's the date?" },
  { k: 'venue', n: 5, l: 'Venue', s: "Where's it happening?" },
  { k: 'details', n: 5.5, l: 'Details', s: 'A few specifics' },
  { k: 'photos', n: 6, l: 'Photos', s: 'Bring the moments' },
  { k: 'photoreview', n: 6.5, l: 'Review', s: 'Caption + place' },
  { k: 'vibe', n: 7, l: 'Vibe', s: 'Mood & color' },
  { k: 'layout', n: 8, l: 'Layout', s: 'How it reads' },
  { k: 'song', n: 9, l: 'Song', s: 'A sound for it' },
  { k: 'ready', n: 10, l: 'Ready', s: 'One button' },
  { k: 'generating', n: 11, l: 'Weaving', s: 'Pear weaves it' },
];

export type CategoryKey =
  | 'wedding-arc'
  | 'family'
  | 'milestone'
  | 'cultural'
  | 'commemoration';

export const CATEGORIES: Array<{ k: CategoryKey; l: string; s: string }> = [
  { k: 'wedding-arc', l: 'Wedding arc', s: 'proposal → honeymoon' },
  { k: 'family', l: 'Family', s: 'births, reunions, baby showers' },
  { k: 'milestone', l: 'Milestone', s: 'birthdays, graduations, retirement' },
  { k: 'cultural', l: 'Cultural rites', s: 'mitzvahs, quinces, baptisms' },
  { k: 'commemoration', l: 'In memory', s: 'memorials, celebrations of life' },
];

export interface EventDef {
  k: string;
  l: string;
  cat: CategoryKey;
  tone: 'celebratory' | 'playful' | 'intimate' | 'ceremonial' | 'solemn';
  theme: 'groove' | 'editorial';
  days?: boolean;
  memory?: boolean;
  school?: boolean;
}

export const EVENTS: EventDef[] = [
  { k: 'engagement', l: 'Engagement party', cat: 'wedding-arc', tone: 'celebratory', theme: 'groove' },
  { k: 'bridal-shower', l: 'Bridal shower', cat: 'wedding-arc', tone: 'playful', theme: 'groove' },
  { k: 'bachelor-party', l: 'Bachelor weekend', cat: 'wedding-arc', tone: 'playful', theme: 'groove', days: true },
  { k: 'bachelorette-party', l: 'Bachelorette', cat: 'wedding-arc', tone: 'playful', theme: 'groove', days: true },
  { k: 'rehearsal-dinner', l: 'Rehearsal dinner', cat: 'wedding-arc', tone: 'intimate', theme: 'editorial' },
  { k: 'wedding', l: 'Wedding', cat: 'wedding-arc', tone: 'ceremonial', theme: 'editorial' },
  { k: 'vow-renewal', l: 'Vow renewal', cat: 'wedding-arc', tone: 'ceremonial', theme: 'editorial' },
  { k: 'baby-shower', l: 'Baby shower', cat: 'family', tone: 'playful', theme: 'groove' },
  { k: 'sip-and-see', l: 'Sip & see', cat: 'family', tone: 'intimate', theme: 'editorial' },
  { k: 'reunion', l: 'Family reunion', cat: 'family', tone: 'celebratory', theme: 'groove', days: true },
  { k: 'birthday', l: 'Birthday', cat: 'milestone', tone: 'celebratory', theme: 'groove' },
  { k: 'milestone-birthday', l: 'Milestone birthday', cat: 'milestone', tone: 'celebratory', theme: 'groove' },
  { k: 'graduation', l: 'Graduation', cat: 'milestone', tone: 'celebratory', theme: 'groove', school: true },
  { k: 'retirement', l: 'Retirement', cat: 'milestone', tone: 'intimate', theme: 'editorial' },
  { k: 'housewarming', l: 'Housewarming', cat: 'milestone', tone: 'playful', theme: 'groove' },
  { k: 'anniversary', l: 'Anniversary', cat: 'milestone', tone: 'intimate', theme: 'editorial' },
  { k: 'bar-mitzvah', l: 'Bar mitzvah', cat: 'cultural', tone: 'ceremonial', theme: 'editorial' },
  { k: 'bat-mitzvah', l: 'Bat mitzvah', cat: 'cultural', tone: 'ceremonial', theme: 'editorial' },
  { k: 'quinceanera', l: 'Quinceañera', cat: 'cultural', tone: 'celebratory', theme: 'groove' },
  { k: 'baptism', l: 'Baptism', cat: 'cultural', tone: 'ceremonial', theme: 'editorial' },
  { k: 'first-communion', l: 'First communion', cat: 'cultural', tone: 'ceremonial', theme: 'editorial' },
  { k: 'confirmation', l: 'Confirmation', cat: 'cultural', tone: 'ceremonial', theme: 'editorial' },
  { k: 'memorial', l: 'Memorial', cat: 'commemoration', tone: 'solemn', theme: 'editorial', memory: true },
  { k: 'celebration-life', l: 'Celebration of life', cat: 'commemoration', tone: 'solemn', theme: 'editorial', memory: true },
  { k: 'funeral', l: 'Funeral', cat: 'commemoration', tone: 'solemn', theme: 'editorial', memory: true },
];

export const PEAR_COPY: Record<StepKey, { headline: string; tail: string }> = {
  category: { headline: "Hi, I'm Pear.", tail: "Let's start with the shape. What are we gathering for?" },
  occasion: { headline: 'Good. Narrowing in.', tail: 'Pick the exact occasion so I set the right tone.' },
  names: { headline: 'Whose names go up top?', tail: "First names work. I'll handle the rest." },
  date: { headline: 'The when.', tail: "Pick a day, or tell me you haven't locked one yet. Either's fine." },
  venue: { headline: 'The where.', tail: "If you don't know yet, tell me TBD and I'll hide the map." },
  details: { headline: 'One more specific.', tail: 'This only appears for certain events.' },
  photos: { headline: 'Now the moments.', tail: "Drop some photos. I'll cluster them into chapters." },
  photoreview: { headline: 'Help me place these.', tail: 'Where and when? Your captions anchor my writing.' },
  vibe: { headline: 'Now the feel.', tail: "Describe the mood. I'll press three palettes from your words." },
  layout: { headline: 'How should it read?', tail: 'Each layout tells the story a different way.' },
  song: { headline: 'One song, optional.', tail: "Just the link. It'll live under the hero." },
  ready: { headline: 'All threaded.', tail: "Seven passes, about ninety seconds, then you decide." },
  generating: { headline: 'Weaving now.', tail: "Hang on. It's worth it." },
};
