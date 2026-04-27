// ─────────────────────────────────────────────────────────────
// Pearloom / lib/block-engine/schema.ts
// Block schema types — every block's props are described by a schema
// so the editor can auto-generate controls and the renderer can
// resolve bindings before passing props to components.
// ─────────────────────────────────────────────────────────────

/**
 * Prop types the visual editor can render controls for.
 * Each prop in a block schema maps to a specific editor control.
 */
export type PropType =
  | 'text'         // single line text input
  | 'textarea'     // multi-line text area
  | 'richtext'     // rich text with basic formatting
  | 'number'       // numeric input
  | 'boolean'      // toggle switch
  | 'color'        // color picker
  | 'image'        // image URL with upload
  | 'url'          // URL input
  | 'select'       // dropdown from options
  | 'date'         // date picker
  | 'binding'      // a {{ variable }} reference
  | 'list';        // array of objects, each with an itemShape

/**
 * Schema for a single prop on a block.
 */
export interface PropSchema {
  /** Display label in the editor */
  label: string;
  /** The type of control to render */
  type: PropType;
  /** Default value if not set */
  defaultValue?: unknown;
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Description / helper text */
  description?: string;
  /** Whether this prop is required */
  required?: boolean;
  /** Options for 'select' type */
  options?: Array<{ value: string; label: string }>;
  /** Minimum value for 'number' type (inclusive) */
  min?: number;
  /** Maximum value for 'number' type (inclusive) */
  max?: number;
  /** Binding hint — suggests a {{ variable }} the user can use */
  bindingHint?: string;
  /** Group for organizing props in the editor */
  group?: string;
  /** Per-item schema for 'list' type */
  itemShape?: Record<string, PropSchema>;
  /** Template for a newly-added list item */
  itemDefaults?: Record<string, unknown>;
  /** Singular noun used in the "Add X" button for 'list' type */
  itemLabel?: string;
}

/**
 * Schema for a block type — defines all its editable props.
 */
export interface BlockSchema {
  /** Block type identifier */
  type: string;
  /** Display name in the editor */
  label: string;
  /** Short description */
  description: string;
  /** Icon name (Lucide icon) */
  icon: string;
  /** Category for grouping in the add-block panel */
  category: 'content' | 'media' | 'interaction' | 'layout' | 'social';
  /** Prop schemas — the editable fields for this block */
  props: Record<string, PropSchema>;
}

// ─────────────────────────────────────────────────────────────
// Block schema definitions for all 24 block types
// ─────────────────────────────────────────────────────────────

export const BLOCK_SCHEMAS: Record<string, BlockSchema> = {
  hero: {
    type: 'hero',
    label: 'Hero',
    description: 'Full-bleed hero section with names, photo, and tagline',
    icon: 'Image',
    category: 'content',
    props: {
      subtitle: {
        label: 'Subtitle',
        type: 'text',
        placeholder: 'A short tagline beneath the names',
        bindingHint: '{{ poetry.heroTagline }}',
        group: 'Content',
      },
      coverPhoto: {
        label: 'Cover Photo',
        type: 'image',
        description: 'Override the AI-selected cover photo',
        group: 'Media',
      },
      layout: {
        label: 'Layout Style',
        type: 'select',
        options: [
          { value: 'editorial', label: 'Editorial' },
          { value: 'fullbleed', label: 'Full Bleed' },
          { value: 'cinematic', label: 'Cinematic' },
        ],
        defaultValue: 'editorial',
        group: 'Style',
      },
      showCountdown: {
        label: 'Show Countdown',
        type: 'boolean',
        defaultValue: true,
        group: 'Options',
      },
    },
  },

  story: {
    type: 'story',
    label: 'Story',
    description: 'Timeline of chapters with photos and narrative',
    icon: 'BookOpen',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Our Story',
        bindingHint: '{{ sectionLabels.story }}',
        group: 'Content',
      },
      layoutFormat: {
        label: 'Layout Format',
        type: 'select',
        options: [
          { value: 'cascade', label: 'Cascade' },
          { value: 'filmstrip', label: 'Filmstrip' },
          { value: 'scrapbook', label: 'Scrapbook' },
          { value: 'magazine', label: 'Magazine' },
          { value: 'chapters', label: 'Chapters' },
        ],
        defaultValue: 'cascade',
        group: 'Style',
      },
    },
  },

  event: {
    type: 'event',
    label: 'Events',
    description: 'Wedding ceremony, reception, and schedule',
    icon: 'CalendarDays',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'The Celebration',
        bindingHint: '{{ sectionLabels.events }}',
        group: 'Content',
      },
    },
  },

  itinerary: {
    type: 'itinerary',
    label: 'Itinerary',
    description: 'Multi-day hourly schedule — bachelor, reunion, welcome party',
    icon: 'CalendarClock',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'The plan',
        group: 'Content',
      },
      subtitle: {
        label: 'Subtitle',
        type: 'text',
        placeholder: 'Every hour accounted for — or close enough.',
        group: 'Content',
      },
      entries: {
        label: 'Schedule',
        type: 'list',
        group: 'Content',
        itemLabel: 'Slot',
        itemDefaults: { day: 'Day 1', time: '', title: '', location: '', detail: '' },
        itemShape: {
          day: {
            label: 'Day',
            type: 'text',
            placeholder: 'Friday · Day 1 · Arrival day',
            description: 'Slots with the same day label are grouped together.',
          },
          time: {
            label: 'Time',
            type: 'text',
            placeholder: '09:30 · All day · Evening',
          },
          title: {
            label: 'What',
            type: 'text',
            placeholder: 'Hotel check-in',
          },
          location: {
            label: 'Where',
            type: 'text',
            placeholder: 'Chez nous · The Hollow · 123 Main St.',
          },
          detail: {
            label: 'Notes',
            type: 'textarea',
            placeholder: 'Key in the lockbox if you\u2019re early.',
          },
        },
      },
    },
  },

  privacyGate: {
    type: 'privacyGate',
    label: 'Privacy gate',
    description: 'Invite-only callout with access rules — bachelor, private memorial',
    icon: 'Lock',
    category: 'layout',
    props: {
      title: { label: 'Title', type: 'text', placeholder: 'Private event', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', group: 'Content' },
      body: { label: 'Body', type: 'textarea', group: 'Content' },
      rules: {
        label: 'Rules',
        type: 'list',
        group: 'Content',
        itemLabel: 'Rule',
        itemDefaults: { text: '' },
        itemShape: { text: { label: 'Rule', type: 'text' } },
      },
      contact: { label: 'Contact for access', type: 'text', placeholder: 'Text the best man at 555-1234', group: 'Content' },
      password: {
        label: 'Password (optional)',
        type: 'text',
        placeholder: 'Leave blank for a callout-only gate',
        description: 'If set, guests must enter this password before the site loads. Legacy comingSoon.password wins if both are set.',
        group: 'Settings',
      },
    },
  },

  obituary: {
    type: 'obituary',
    label: 'Obituary',
    description: 'Name, dates, long-form body — memorial + funeral',
    icon: 'BookOpen',
    category: 'content',
    props: {
      name: { label: 'Name', type: 'text', required: true, group: 'Content' },
      dates: { label: 'Dates', type: 'text', placeholder: '1942 — 2026', group: 'Content' },
      photoUrl: { label: 'Portrait URL', type: 'image', group: 'Content' },
      body: { label: 'Body', type: 'textarea', required: true, group: 'Content' },
      inMemoryOf: { label: 'In memory of / donations', type: 'text', placeholder: 'In lieu of flowers, donations to the Pacific Foundation.', group: 'Content' },
    },
  },

  livestream: {
    type: 'livestream',
    label: 'Livestream',
    description: 'Watch-live callout with start time + link',
    icon: 'Video',
    category: 'media',
    props: {
      title: { label: 'Title', type: 'text', placeholder: 'Watch live', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', group: 'Content' },
      startsAt: { label: 'Starts at (ISO)', type: 'text', placeholder: '2026-06-14T18:00:00-04:00', description: 'Any ISO 8601 datetime. Shown in the viewer\u2019s local timezone.', group: 'Settings' },
      url: { label: 'Stream URL', type: 'url', required: true, placeholder: 'https://zoom.us/…', group: 'Settings' },
      buttonLabel: { label: 'Button label', type: 'text', placeholder: 'Open the livestream', group: 'Settings' },
    },
  },

  program: {
    type: 'program',
    label: 'Program',
    description: 'Ordered ceremony program — bar mitzvah, quinceañera, memorial',
    icon: 'ListOrdered',
    category: 'content',
    props: {
      title: { label: 'Title', type: 'text', placeholder: 'The program', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', group: 'Content' },
      items: {
        label: 'Items',
        type: 'list',
        group: 'Content',
        itemLabel: 'Item',
        itemDefaults: { title: '', description: '', participant: '' },
        itemShape: {
          title: { label: 'Title', type: 'text', placeholder: 'Candle-lighting ceremony' },
          participant: { label: 'Participant', type: 'text', placeholder: 'The family' },
          description: { label: 'Description', type: 'textarea', placeholder: 'Each candle lit in memory of…' },
        },
      },
    },
  },

  packingList: {
    type: 'packingList',
    label: 'Packing list',
    description: 'Bring-this checklist — destination trips, bachelor weekend',
    icon: 'Briefcase',
    category: 'content',
    props: {
      title: { label: 'Section Title', type: 'text', placeholder: 'What to pack', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', placeholder: 'The non-negotiables.', group: 'Content' },
      items: {
        label: 'Items',
        type: 'list',
        group: 'Content',
        itemLabel: 'Item',
        itemDefaults: { label: '', category: '', note: '', required: false },
        itemShape: {
          label: { label: 'Item', type: 'text', placeholder: 'Swim trunks · Dress shirt · Reef-safe sunscreen' },
          category: { label: 'Category', type: 'text', placeholder: 'Essentials · Clothes · Optional' },
          note: { label: 'Note', type: 'text', placeholder: 'One pair — laundry is pricey.' },
          required: { label: 'Must-have', type: 'boolean' },
        },
      },
    },
  },

  activityVote: {
    type: 'activityVote',
    label: 'Activity vote',
    description: 'Multi-choice poll — Saturday activity, playlist mood',
    icon: 'Vote',
    category: 'interaction',
    props: {
      title: { label: 'Section Title', type: 'text', placeholder: 'What should we do?', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', group: 'Content' },
      question: { label: 'Question', type: 'text', placeholder: 'Saturday afternoon — pick one:', group: 'Content' },
      showResults: { label: 'Show running tally', type: 'boolean', defaultValue: true, group: 'Settings' },
      options: {
        label: 'Options',
        type: 'list',
        group: 'Content',
        itemLabel: 'Option',
        itemDefaults: { id: '', label: '', note: '', initialVotes: 0 },
        itemShape: {
          id: { label: 'ID (unique, no spaces)', type: 'text', placeholder: 'bar-crawl · boat-day · hike' },
          label: { label: 'Label', type: 'text', placeholder: 'Bar crawl' },
          note: { label: 'Note', type: 'text', placeholder: 'Six stops, walking only.' },
          initialVotes: { label: 'Seed votes', type: 'number', min: 0, description: 'Host-entered starting votes.' },
        },
      },
    },
  },

  adviceWall: {
    type: 'adviceWall',
    label: 'Advice wall',
    description: 'Prompted guest submissions — baby shower, retirement, milestone',
    icon: 'Feather',
    category: 'interaction',
    props: {
      title: { label: 'Section Title', type: 'text', placeholder: 'Advice wall', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', group: 'Content' },
      prompt: {
        label: 'Prompt',
        type: 'text',
        placeholder: 'A piece of advice for the road ahead.',
        description: 'Shown above the input. Sets the tone.',
        group: 'Content',
      },
      seeds: {
        label: 'Seed entries (optional)',
        type: 'list',
        group: 'Content',
        itemLabel: 'Entry',
        itemDefaults: { from: '', body: '' },
        itemShape: {
          from: { label: 'Name', type: 'text', placeholder: 'Auntie Ro' },
          body: { label: 'Message', type: 'textarea', placeholder: 'Never go to bed angry.' },
        },
      },
    },
  },

  toastSignup: {
    type: 'toastSignup',
    label: 'Toast signup',
    description: 'Ordered slots for who speaks — rehearsal dinner, milestone birthday',
    icon: 'Mic',
    category: 'interaction',
    props: {
      title: { label: 'Section Title', type: 'text', placeholder: 'Toasts & words', group: 'Content' },
      subtitle: { label: 'Subtitle', type: 'text', group: 'Content' },
      slots: {
        label: 'Slots',
        type: 'list',
        group: 'Content',
        itemLabel: 'Slot',
        itemDefaults: { label: '', assigned: '', note: '' },
        itemShape: {
          label: { label: 'What', type: 'text', placeholder: 'Father of the bride · Best man · Grandma' },
          assigned: { label: 'Assigned to', type: 'text', placeholder: 'Leave blank for open' },
          note: { label: 'Note', type: 'text', placeholder: 'Keep it under 90 seconds.' },
        },
      },
    },
  },

  costSplitter: {
    type: 'costSplitter',
    label: 'Cost share',
    description: 'Shared group budget with per-person share — bachelor, reunion',
    icon: 'Wallet',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'The cost share',
        group: 'Content',
      },
      subtitle: {
        label: 'Intro',
        type: 'text',
        placeholder: 'All-in, split evenly.',
        group: 'Content',
      },
      currency: {
        label: 'Currency',
        type: 'select',
        defaultValue: 'USD',
        options: [
          { value: 'USD', label: 'USD $' },
          { value: 'EUR', label: 'EUR €' },
          { value: 'GBP', label: 'GBP £' },
          { value: 'CAD', label: 'CAD $' },
          { value: 'AUD', label: 'AUD $' },
        ],
        group: 'Settings',
      },
      headcount: {
        label: 'Number of people',
        type: 'number',
        min: 1,
        max: 200,
        description: 'Used to calculate the per-person share.',
        group: 'Settings',
      },
      payoutHandle: {
        label: 'Pay to (Venmo / handle)',
        type: 'text',
        placeholder: 'Venmo @best-man',
        group: 'Settings',
      },
      lineItems: {
        label: 'Line items',
        type: 'list',
        group: 'Content',
        itemLabel: 'Expense',
        itemDefaults: { label: '', amount: 0, note: '' },
        itemShape: {
          label: {
            label: 'What',
            type: 'text',
            placeholder: 'Airbnb · Dinner Saturday · Activity',
          },
          amount: {
            label: 'Amount',
            type: 'number',
            min: 0,
          },
          note: {
            label: 'Note',
            type: 'text',
            placeholder: 'Locked in · Split 6 ways · Tip included',
          },
        },
      },
    },
  },

  rsvp: {
    type: 'rsvp',
    label: 'RSVP',
    description: 'Guest RSVP form with meal selection',
    icon: 'Mail',
    category: 'interaction',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'RSVP',
        group: 'Content',
      },
      introText: {
        label: 'Intro Text',
        type: 'textarea',
        placeholder: 'We would love to have you join us...',
        bindingHint: '{{ poetry.rsvpIntro }}',
        group: 'Content',
      },
      deadline: {
        label: 'RSVP Deadline',
        type: 'date',
        bindingHint: '{{ logistics.rsvpDeadline }}',
        group: 'Settings',
      },
    },
  },

  registry: {
    type: 'registry',
    label: 'Registry',
    description: 'Gift registry links and cash fund',
    icon: 'Gift',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Registry',
        bindingHint: '{{ sectionLabels.registry }}',
        group: 'Content',
      },
      message: {
        label: 'Registry Message',
        type: 'textarea',
        placeholder: 'Your presence is the greatest gift...',
        group: 'Content',
      },
    },
  },

  travel: {
    type: 'travel',
    label: 'Travel',
    description: 'Venue, hotels, and travel logistics',
    icon: 'Plane',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Getting There',
        group: 'Content',
      },
    },
  },

  faq: {
    type: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions accordion',
    icon: 'HelpCircle',
    category: 'content',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'FAQ',
        group: 'Content',
      },
    },
  },

  countdown: {
    type: 'countdown',
    label: 'Countdown',
    description: 'Countdown timer to the event date',
    icon: 'Timer',
    category: 'content',
    props: {
      label: {
        label: 'Countdown Label',
        type: 'text',
        placeholder: 'Until we say I do',
        group: 'Content',
      },
      targetDate: {
        label: 'Target Date',
        type: 'date',
        bindingHint: '{{ logistics.date }}',
        group: 'Settings',
      },
    },
  },

  text: {
    type: 'text',
    label: 'Text Block',
    description: 'Free-form text paragraph',
    icon: 'FileText',
    category: 'content',
    props: {
      text: {
        label: 'Content',
        type: 'textarea',
        required: true,
        placeholder: 'Write your content here...',
        group: 'Content',
      },
      align: {
        label: 'Text Alignment',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
        defaultValue: 'center',
        group: 'Style',
      },
    },
  },

  quote: {
    type: 'quote',
    label: 'Quote',
    description: 'Decorative pull quote with symbol',
    icon: 'Quote',
    category: 'content',
    props: {
      text: {
        label: 'Quote Text',
        type: 'textarea',
        placeholder: 'Enter your quote...',
        bindingHint: '{{ vibeString }}',
        group: 'Content',
      },
      symbol: {
        label: 'Decorative Symbol',
        type: 'text',
        defaultValue: '\u2726',
        placeholder: '\u2726',
        group: 'Style',
      },
      attribution: {
        label: 'Attribution',
        type: 'text',
        placeholder: '— Author Name',
        group: 'Content',
      },
    },
  },

  video: {
    type: 'video',
    label: 'Video',
    description: 'Embedded video from YouTube or Vimeo',
    icon: 'Video',
    category: 'media',
    props: {
      url: {
        label: 'Video URL',
        type: 'url',
        required: true,
        placeholder: 'https://youtube.com/watch?v=...',
        group: 'Media',
      },
      title: {
        label: 'Caption',
        type: 'text',
        placeholder: 'Our Wedding Film',
        group: 'Content',
      },
    },
  },

  map: {
    type: 'map',
    label: 'Map',
    description: 'Interactive venue map',
    icon: 'MapPin',
    category: 'media',
    props: {
      address: {
        label: 'Venue Address',
        type: 'text',
        placeholder: '123 Wedding Venue Drive',
        bindingHint: '{{ logistics.venue }}',
        group: 'Content',
      },
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Find Us',
        group: 'Content',
      },
    },
  },

  photos: {
    type: 'photos',
    label: 'Photo Gallery',
    description: 'Photo grid from your uploaded images',
    icon: 'Camera',
    category: 'media',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Our Photos',
        bindingHint: '{{ sectionLabels.photos }}',
        group: 'Content',
      },
      maxPhotos: {
        label: 'Max Photos',
        type: 'number',
        defaultValue: 9,
        group: 'Settings',
      },
      showGuestPhotos: {
        label: 'Show Guest Photos',
        type: 'boolean',
        defaultValue: true,
        group: 'Settings',
      },
    },
  },

  guestbook: {
    type: 'guestbook',
    label: 'Guestbook',
    description: 'Guest messages and well-wishes',
    icon: 'MessageSquare',
    category: 'interaction',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Leave a Message',
        group: 'Content',
      },
      prompt: {
        label: 'Prompt Text',
        type: 'textarea',
        placeholder: 'Share your wishes for the couple...',
        group: 'Content',
      },
    },
  },

  divider: {
    type: 'divider',
    label: 'Divider',
    description: 'Decorative section divider',
    icon: 'Minus',
    category: 'layout',
    props: {
      style: {
        label: 'Divider Style',
        type: 'select',
        options: [
          { value: 'wave', label: 'Wave' },
          { value: 'line', label: 'Simple Line' },
          { value: 'dots', label: 'Dot Pattern' },
          { value: 'botanical', label: 'Botanical' },
        ],
        defaultValue: 'wave',
        group: 'Style',
      },
      height: {
        label: 'Height',
        type: 'number',
        defaultValue: 60,
        group: 'Style',
      },
    },
  },

  spotify: {
    type: 'spotify',
    label: 'Music',
    description: 'Spotify playlist embed',
    icon: 'Music',
    category: 'media',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Our Soundtrack',
        group: 'Content',
      },
      url: {
        label: 'Spotify URL',
        type: 'url',
        placeholder: 'https://open.spotify.com/playlist/...',
        bindingHint: '{{ spotifyUrl }}',
        group: 'Media',
      },
    },
  },

  quiz: {
    type: 'quiz',
    label: 'Couple Quiz',
    description: 'Fun trivia quiz about the couple',
    icon: 'HelpCircle',
    category: 'interaction',
    props: {
      quizTitle: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'How Well Do You Know Us?',
        group: 'Content',
      },
      questions: {
        label: 'Questions',
        type: 'list',
        group: 'Content',
        itemLabel: 'Question',
        itemDefaults: { question: '', answer: '', options: [] },
        itemShape: {
          question: {
            label: 'Question',
            type: 'text',
            placeholder: 'Where did we first meet?',
          },
          options: {
            label: 'Choices (comma-separated)',
            type: 'text',
            placeholder: 'A coffee shop, Brooklyn, At work, Online',
            description: 'Leave blank for a free-text answer.',
          },
          answer: {
            label: 'Correct Answer',
            type: 'text',
            placeholder: 'A coffee shop',
          },
        },
      },
    },
  },

  photoWall: {
    type: 'photoWall',
    label: 'Guest Photo Wall',
    description: 'Live wall where guests upload photos during the wedding',
    icon: 'Camera',
    category: 'interaction',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Share Your Photos',
        group: 'Content',
      },
      prompt: {
        label: 'Upload Prompt',
        type: 'textarea',
        placeholder: 'Upload your favorite moments from the celebration...',
        group: 'Content',
      },
    },
  },

  hashtag: {
    type: 'hashtag',
    label: 'Hashtags',
    description: 'Social media hashtag display',
    icon: 'Hash',
    category: 'social',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Share the Moment',
        group: 'Content',
      },
    },
  },

  gallery: {
    type: 'gallery',
    label: 'Photo Collage',
    description: 'Artistic collage layout from your curated photos',
    icon: 'Image',
    category: 'media',
    props: {
      title: {
        label: 'Section Title',
        type: 'text',
        placeholder: 'Gallery',
        group: 'Content',
      },
    },
  },

  vibeQuote: {
    type: 'vibeQuote',
    label: 'Vibe Quote',
    description: 'Atmospheric quote that sets the mood',
    icon: 'Quote',
    category: 'content',
    props: {
      text: {
        label: 'Quote Text',
        type: 'textarea',
        placeholder: 'A quote that captures the essence...',
        bindingHint: '{{ vibeString }}',
        group: 'Content',
      },
      symbol: {
        label: 'Decorative Symbol',
        type: 'text',
        defaultValue: '\u2726',
        group: 'Style',
      },
    },
  },

  welcome: {
    type: 'welcome',
    label: 'Welcome',
    description: 'Personal welcome statement from the couple',
    icon: 'FileText',
    category: 'content',
    props: {
      text: {
        label: 'Welcome Message',
        type: 'textarea',
        placeholder: 'Welcome to our celebration...',
        bindingHint: '{{ poetry.welcomeStatement }}',
        group: 'Content',
      },
    },
  },

  footer: {
    type: 'footer',
    label: 'Footer',
    description: 'Site footer with closing line and branding',
    icon: 'Minus',
    category: 'layout',
    props: {
      text: {
        label: 'Closing Line',
        type: 'textarea',
        placeholder: 'Thank you for being part of our story.',
        bindingHint: '{{ poetry.closingLine }}',
        group: 'Content',
      },
      subtitle: {
        label: 'Branding Text',
        type: 'text',
        defaultValue: 'Made with Pearloom',
        group: 'Content',
      },
      showShareButtons: {
        label: 'Show Share Buttons',
        type: 'boolean',
        defaultValue: true,
        group: 'Options',
      },
    },
  },

  anniversary: {
    type: 'anniversary',
    label: 'Anniversary',
    description: 'Anniversary edition banner',
    icon: 'Star',
    category: 'content',
    props: {
      title: {
        label: 'Banner Text',
        type: 'text',
        placeholder: 'Anniversary Edition',
        group: 'Content',
      },
      milestones: {
        label: 'Milestones',
        type: 'list',
        group: 'Content',
        itemLabel: 'Milestone',
        itemDefaults: { label: '', date: '', emoji: '\u2726' },
        itemShape: {
          label: {
            label: 'Label',
            type: 'text',
            placeholder: 'First Date',
          },
          date: {
            label: 'Date',
            type: 'date',
          },
          emoji: {
            label: 'Symbol',
            type: 'text',
            placeholder: '\u2726',
            description: 'Any emoji or symbol.',
          },
        },
      },
    },
  },

  storymap: {
    type: 'storymap',
    label: 'Story Map',
    description: 'Interactive map of your journey together',
    icon: 'MapPin',
    category: 'media',
    props: {
      title: {
        label: 'Title',
        type: 'text',
        defaultValue: 'Our Journey',
        group: 'Content',
      },
      pins: {
        label: 'Pins',
        type: 'list',
        group: 'Content',
        itemLabel: 'Pin',
        itemDefaults: { place: '', when: '', note: '' },
        itemShape: {
          place: {
            label: 'Place',
            type: 'text',
            placeholder: 'Brooklyn, NY',
          },
          when: {
            label: 'When',
            type: 'text',
            placeholder: 'Summer 2021',
          },
          note: {
            label: 'Moment',
            type: 'textarea',
            placeholder: 'What happened here?',
          },
        },
      },
    },
  },

  weddingParty: {
    type: 'weddingParty',
    label: 'Wedding Party',
    description: 'Showcase your bridal party and groomsmen',
    icon: 'Users',
    category: 'content',
    props: {
      title: {
        label: 'Title',
        type: 'text',
        defaultValue: 'The Wedding Party',
        group: 'Content',
      },
    },
  },
};
