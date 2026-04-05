# PEARLOOM — UI Design Brief for Google Stitch

## Brand Identity

**Pearloom** = "Pearl" + "Loom" — two lives woven together into something precious. The Loom is our AI engine that weaves a complete website from photos and vibes.

**Brand feel:** Heirloom luxury, warm, organic, premium, deeply personal.

**Logo:** Two intertwining curves forming an infinity-like knot — two threads woven together.

### Color Palette

| Name | Hex | Role |
|------|-----|------|
| Warm Parchment | `#FAF7F2` | Main background |
| Warm Sand | `#F0EBE0` | Alternate sections |
| Card White | `#FFFFFF` | Elevated surfaces |
| Near Black | `#1A1A1A` | Primary text |
| Warm Dark | `#3D3530` | Headings |
| Muted | `#7A756E` | Secondary text |
| Divider | `#E0D8CA` | Borders |
| **Soft Olive** | `#A3B18A` | **Primary brand accent** |
| Olive Deep | `#6E8C5C` | Active/pressed states |
| Antique Gold | `#C4A96A` | Premium accent |
| Muted Plum | `#6D597A` | Emotional accent |
| Dark BG | `#1E1B24` | Dark surfaces |

### Typography
- **Headings:** Playfair Display (serif, italic)
- **Body:** Lora (serif, warm)

### Design Principles
- Heirloom luxury — warm parchment, pressed botanicals, antique gold
- AI does the work, user provides memories
- Motion and feedback on every interaction
- Elegance with energy — not static, not overwhelming
- Everything should feel personal, never generic

---

## Product Overview

Pearloom is an AI-powered celebration site builder. Users upload photos and describe their vibe, and The Loom (our AI) generates a complete, beautiful website with narrative, design, and artwork — all unique to them.

**Occasions supported:** Weddings, Birthdays, Anniversaries, Engagements, any milestone.

**Pricing:** Free tier (Seed), $29 one-time (Pair), $12/mo (Perennial).

**Core promise:** "Drop in memories → AI instantly builds something beautiful."

---

## Screens to Design

### 1. Marketing Landing Page

A conversion-focused homepage that communicates what Pearloom does and gets users to sign up.

**Features to showcase:**
- Hero with product value prop and live site preview mockup
- Social proof (site count, rating, build time stats)
- How it works (3 steps: upload → AI weaves → share)
- The Loom AI showcase (7-pass AI pipeline explanation)
- Block types available (15 content blocks)
- Platform features (site building, guest management, communication, post-event)
- Interactive demo (type names → see preview update live)
- Supported occasions list
- Testimonials
- Pricing tiers (3 plans)
- FAQ
- Final CTA

---

### 2. Wizard / Onboarding Flow

A guided flow that takes users from zero to a generated site. Should feel like magic, not a form.

**Steps:**

1. **Photo Selection** — Pick photos from Google Photos or upload locally. Max 30. Shows dynamic count and AI processing messages as photos are selected.

2. **Photo Clusters** — Photos auto-grouped by date/location. Users can add locations (AI suggests or manual entry), add notes per group, split/merge groups. AI Story Arc Advisor gives feedback.

3. **Mood Board Swipe** — 8 aesthetic cards to swipe through (Golden Hour, Wildflowers, Velvet & Candlelight, Sea Glass, Editorial, etc). Swipe right = love, left = skip. Builds a vibe profile.

4. **Vibe Details** (multi-step):
   - Occasion type selection (Wedding, Birthday, Anniversary, Engagement, Just Because)
   - Couple/person names
   - Personality/mood selection (6 mood options with icons, varies by occasion)
   - Aesthetic keyword tags (Film Noir, Mediterranean, Art Deco, Coastal, etc.)
   - Color palette selection (12 curated palettes + "Let AI decide" option)
   - Timeline layout format (6 visual styles: Cascade, Filmstrip, Magazine, Scrapbook, Chapters, Starmap)
   - Story text input with tone suggestion chips (Funny, Emotional, Short & sweet)
   - Optional details (pets, music, special traditions)
   - Event logistics (date, venue, RSVP deadline — wedding/engagement only)
   - Occasion-specific details (ceremony/reception for weddings, proposal story for engagements, birthday age/surprise, etc.)
   - Site URL selection with availability check
   - Review & confirm screen

5. **Generation Screen** — Full-screen animated experience showing AI building the site in real-time. 8 named passes with progress ring and sneak peek messages. The "wow moment."

---

### 3. Dashboard (My Sites)

Where users manage their sites after signing in.

**Features:**
- List of existing sites with thumbnails, names, status (draft/published)
- Edit, view, and delete actions per site
- Create new site button
- Draft recovery if user abandoned the wizard
- Quick start option

---

### 4. Site Editor

A visual editor for customizing the AI-generated site. Should feel like shaping a story, not filling out settings.

**Layout:** Navigation rail on left + content panel + live preview canvas in center.

**Navigation categories:**
- **Content** — Story chapters, events, guest list, AI-generated blocks, voice training
- **Design** — Theme presets, color palette, visual effects, fonts, AI art, asset library
- **Pages** — Messaging, save the date cards, thank you notes, music/Spotify, vendor management
- **Settings** — Site details/URL, analytics, multi-language translations (9 languages)

**Chapter editing features:**
- Reorderable chapter list with drag & drop
- 6 layout format options per chapter (editorial, full bleed, split, cinematic, gallery, mosaic)
- 8 mood presets per chapter
- AI rewrite + 3 alternative versions
- Image management with repositioning
- Section style overrides

**Design features:**
- AI theme regeneration
- Theme preset switching
- Color palette editor with AI-generated SVG background art
- Visual effects (film grain, vignette, color temperature, gradient mesh, custom cursors, texture overlays, scroll animations)
- Font pair picker
- AI art management (hero art, ambient art, art strip)
- SVG asset library (dividers, illustrations, accents) with sticker overlay system

**Guest management:**
- Guest list with search + CSV import
- RSVP tracking and insights
- Visual seating chart editor (drag tables on canvas)
- Bulk email invitations
- AI guest concierge setup

**Additional tools:**
- AI block generator (events, venue, registry, travel, FAQ sections)
- Hashtag generator
- Save the Date card designer
- Thank you note generator (personalized per guest)
- Spotify song suggestions based on vibe
- Vendor tracking with budget and day-of timeline
- Analytics (visits, RSVPs, device breakdown, section engagement)
- Accessibility audit
- AI design advisor

**Canvas/Preview:**
- Live preview with device framing (desktop, tablet, phone)
- Section hover toolbar for quick edit/style/AI rewrite
- Drag-to-canvas block insertion

**Publishing:**
- Custom subdomain or custom domain
- Share URL, QR code, social sharing

---

### 5. Public Site (What Guests See)

The final generated website. Every site is unique — AI generates colors, fonts, narrative, artwork, and layout.

**Core sections:**
- Hero with cover photo, couple names, tagline, AI-generated art
- Story timeline (6 layout formats)
- Events/schedule with venue details and maps
- RSVP form with meal preferences and plus-ones
- Gift registry links
- Travel info (airports, hotels with booking links)
- FAQ
- Live countdown to event
- Guestbook with emoji reactions
- Photo gallery
- Footer with closing line

**Interactive guest features:**
- AI Guest Concierge — chat widget that answers questions from site data
- Guest Photo Wall — upload photos with captions
- Community Memory Wall — submit and view guest memories
- Couple Quiz — trivia generated from the love story
- Seat Finder — look up table assignment by name
- Live Updates Feed — real-time updates on wedding day
- Story Map — interactive map of chapter locations
- Spotify playlist embed
- Time Capsule — messages that unlock on future anniversaries
- Multi-language switcher (9 languages)
- Password protection option

**Visual identity system (Rind™):**
Each site gets a unique AI-generated visual identity:
- Custom color palette
- Typography pairing
- Tone/mood label
- AI-customized section labels
- AI-generated hero art, ambient art, and decorative patterns

**Visual effects available:**
Film grain, vignette, color temperature, gradient mesh, custom cursors, section dividers, scroll reveal animations, texture overlays, confetti, wave dividers, sticker overlays.

---

### 6. Component Library

Reusable UI components used across all screens:

- **Button** — 7 style variants, 7 sizes, loading state, icon support
- **Card** — default/elevated/dark, multiple padding sizes, hover lift
- **Badge** — success, warning, info, default
- **Input & Textarea** — olive focus ring, mobile-optimized
- **Tabs** — pill-style indicator
- **Accordion** — collapsible with animation
- **Modal** — centered with backdrop blur
- **Dropdown, Tooltip, Toast** — standard interactive overlays
- **Avatar** — circular user image
- **Skeleton** — shimmer loading placeholder
- **Switch** — toggle control
- **Progress Steps** — wizard step indicator
- **Pill** — eyebrow badge with sparkle option (olive/plum/gold/dark variants)
- **Empty State** — placeholder with icon, description, and AI action button
- **Marquee** — infinite scrolling strip

---

## What We Need From Stitch

Design high-fidelity UI concepts for:

1. **Marketing Landing Page** — desktop + mobile
2. **Wizard Flow** — each major step (photo select, mood swipe, occasion pick, vibe details, generation screen)
3. **Dashboard** — site management view
4. **Site Editor** — full layout with all zones
5. **Public Site** — wedding example + birthday example
6. **Component Library** — all shared components

For each, propose fresh layouts and visual approaches. We want to see new concepts — not replications of our current implementation. Maintain the Pearloom brand palette, typography, and principles described above.
