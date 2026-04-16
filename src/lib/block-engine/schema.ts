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
