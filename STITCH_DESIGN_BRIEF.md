# PEARLOOM — Comprehensive UI Design Brief for Google Stitch

## 1. Brand Identity

### Brand Name & Meaning

Pearloom = "Pearl" + "Loom". Two lives woven together into something precious. The loom metaphor runs through the entire product — The Loom is the AI engine that "weaves" a site from photos and vibes. The brand feels: heirloom, warm, organic, premium, personal.

### Logo Mark

Two intertwining curves forming an infinity-like knot — representing two threads (two lives) woven together. Primary color: Soft Olive `#A3B18A`.

### Typography

- **Heading font:** Playfair Display (serif, italic for editorial feel)
- **Body font:** Lora (serif, warm and readable)

### Color Palette

**Primary colors:**

| Name | Hex | Usage |
|------|-----|-------|
| Warm Parchment | `#FAF7F2` | Main background (cream) |
| Warm Sand | `#F0EBE0` | Alternating sections (cream-deep) |
| Card White | `#FFFFFF` | Elevated surfaces |
| Near Black | `#1A1A1A` | Body text (ink) |
| Warm Dark | `#3D3530` | Headings on light (ink-soft) |
| Secondary Text | `#7A756E` | Muted/secondary copy |
| Borders | `#E0D8CA` | Dividers, separators |

**Brand accents:**

| Name | Hex | Usage |
|------|-----|-------|
| Soft Olive | `#A3B18A` | PRIMARY brand color, CTAs, active states |
| Olive Hover | `#8FA876` | Hover state |
| Olive Deep | `#6E8C5C` | Pressed/active state |
| Olive Mist | `#EEE8DC` | Light tint backgrounds |
| Antique Gold | `#C4A96A` | Premium accent, highlights |
| Muted Plum | `#6D597A` | Emotional highlights, secondary accent |

**Dark surfaces (canvas/generation):**

| Name | Value | Usage |
|------|-------|-------|
| Dark BG | `#1E1B24` | Editor canvas background |
| Dark Card | `rgba(255,255,255,0.09)` | Elevated surfaces on dark |

### Design Principles

- **Heirloom Luxury** — warm parchment, pressed botanicals, antique gold
- **Every interaction should feel personal and precious** — the product celebrates real human moments; the UI should never feel generic
- **Reduce friction everywhere** — AI does the work; the user provides memories, the Loom handles the rest
- **Motion and feedback on every interaction** — nothing should feel static; the interface breathes
- **Elegance with energy** — not static, not overwhelming; a living, graceful rhythm

### Spacing & Sizing

- **Base unit:** 4px spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96)
- **Border radius:** 6px (tight/inputs) to 100px (pills/tags)
- **Shadows:** warm-tinted using `rgba(43, 30, 20, ...)` for cohesion with the parchment palette
- **Cards:** 14px radius, 1px divider border in `#E0D8CA`, subtle warm shadow

### Motion

- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` for smooth, organic transitions
- **Spring:** stiffness 380, damping 28 (for interactive/draggable elements)
- **Durations:** Fast 0.15s, Normal 0.32s, Slow 0.6s
- **Scroll effects:** reveal animations on section entry, parallax on hero imagery

---

## 2. Target Users

- **Couples planning weddings** (primary) — building a shared site to celebrate their story, share details with guests, and collect RSVPs
- **Birthday tribute sites** — assembling photos and messages into a surprise keepsake page
- **Anniversary celebrations** — marking milestones with a curated visual narrative
- **Engagement announcements** — sharing the news with a beautiful, personal page
- **Any milestone** — graduations, reunions, or any life event worth preserving

---

## 3. Product Positioning

> "Drop in memories, AI instantly builds something beautiful."

- Competitor to Squarespace/Wix wedding sites — but AI-generated, not template-driven
- Not a template picker — it's a story weaver
- **Seed** (Free), **Pair** ($29 one-time), **Perennial** ($12/mo)

---

## 4. Marketing / Landing Page

### Purpose
Convert visitors into sign-ups. Should feel premium, fast, and magical.

### Page Structure (top to bottom)

1. **Sticky Nav Bar** — Dark ink background (#1A1A1A), Pearloom wordmark left, nav links center (How it works, The Loom, Features, Pricing, FAQ), "Get Started Free" CTA right, hamburger menu on mobile with slide-out drawer

2. **Hero Section** — Radial gradient cream background, ambient floating orbs (olive + plum), rotating occasion text ("Weddings", "Birthdays", "Anniversaries"), main heading "Every moment worth celebrating deserves its own world", gold divider rule, sub-headline about The Loom, two CTAs ("Create Your Free Site" primary + "View Example" secondary), trust badges below, large site mockup preview with parallax tilt on hover. Mockup cycles through 3 example sites (Wedding/Birthday/Anniversary) with browser chrome.

3. **Social Proof Bar** — Animated stat counters (2,000+ sites, 50,000+ photos, 4.9/5 rating, 5 min build time), scrolling testimonial marquee below

4. **How It Works** — 3-column grid: "Share your story" → "The Loom weaves it" → "Share and celebrate". Numbered badges with accent colors, connecting line on desktop, hover lift on cards

5. **The Loom Showcase** — Dark background (#1E1B24), "Not assembled. Woven." headline, 7 AI pass pills (Face Detection, Scene Understanding, Emotional Mapping, Narrative Threading, Moment Ranking, Event DNA, Timeline Weaving), 3 Rind™ theme cards showing color palettes + font names

6. **Block Types Grid** — 15 block type cards in 4-column grid (Hero, Story, Gallery, Timeline, RSVP, Registry, Travel, Accommodations, FAQ, Seating Chart, Time Capsule, Guestbook, Countdown, Music, Custom), each with icon + description, hover lift

7. **Guest Experience / Platform Features** — Split layout: headline left + feature pills right, 4 feature group cards (Site Building, Guest Management, Communication, After the Day) each with 4 sub-features

8. **Editor Showcase** — Large editor mockup with browser chrome, animated typing cursor, sidebar with chapters, toolbar with Publish/Preview, tabbed feature list (Visual Editor / AI Powers / Collaboration)

9. **Try It Live Playground** — Name input fields that update a live mini-preview card in real-time

10. **Occasions Section** — Dark background, numbered list (01-05): Weddings, Engagements, Anniversaries, Birthdays, Any Celebration with taglines and hover arrows

11. **Testimonials** — 3-column pull quotes with large opening quotation mark

12. **Pricing** — 3 tier cards: Seed ($0 forever), Pair ($29 one-time, highlighted/scaled up), Perennial ($12/mo). Each has icon, price, tagline, feature list with checkmarks

13. **FAQ** — Accordion inside card container, 10 questions

14. **Final CTA** — Dark background, split layout: headline left ("Your moment is already beautiful. Let's give it a home.") + CTA card right with sparkle icon and "Begin Your Story" button

15. **Footer** — 3-column links (Product, Occasions, Support) + social icons + copyright

### Design Notes
- Cream background (#FAF7F2) with warm sand (#F0EBE0) alternating sections
- Dark sections (#1A1A1A) for contrast (The Loom, Occasions, Final CTA)
- All sections use scroll-triggered fade-up animations
- CTAs should be large, high contrast, with "Takes less than 2 minutes" microcopy
- Cards have hover lift + shadow transitions
- Mobile: full-width sections, hamburger nav, stacked grids

---

## 5. Wizard / Onboarding Flow

### Purpose
Guide users from zero to a fully generated AI site in under 2 minutes. Should feel like a guided AI experience, not a form.

### Progress Bar
3-step indicator at top: Select Memories → Capture Vibe → Editor. Shows across all wizard steps.

### Step 1: Select Memories (Photo Selection)
- Google Photos picker integration (opens Google's picker in popup)
- Local file upload as alternative
- Dynamic feedback bar when photos selected: animated count badge, cycling AI messages ("Creating your story...", "Building something beautiful..."), mini photo grid preview of first 5 selected photos
- Pro tip hint: "Select 10-30 photos for best results"
- Sticky bottom bar with "Continue with X photos" button
- Max 30 photos

### Step 2: Photo Clusters (Location Grouping)
- Photos auto-grouped by date (2-day gap = new cluster)
- Each cluster shows: thumbnail strip, date range, photo count, location
- Auto-reverse-geocodes GPS coordinates
- Auto-suggests locations via AI for clusters without GPS
- "AI Suggest" button per cluster + manual location input
- Split/merge cluster controls
- "What was happening here?" note field per cluster
- Story Arc Advisor: AI analyzes clusters and suggests improvements

### Step 3: Mood Board Swipe
- 8 swipeable mood cards (Golden Hour, Clean Lines, Wildflowers, Velvet, Sea Glass, Editorial, Garden Party, Rustic)
- Each card: gradient background, emoji, label, vibe words
- Drag to swipe or click Yes/No buttons
- Background color shifts based on current card
- Emoji feedback on swipe (sparkle for yes, wave for no)
- Progress bar with liked count
- Summary screen showing all selected vibe words as pills
- Skip option

### Step 4: Vibe Input (8 internal sub-steps)

**4.1 — Occasion Select**: 2-column grid of large cards with per-occasion accent colors and icons (Wedding, Anniversary, Engagement, Birthday, Just Because). Checkmark badge on selected. Date picker for non-story occasions.

**4.2 — Names**: Two name inputs. Birthday mode only requires one name.

**4.3 — Mood/Personality**: 2-column grid of mood cards with gradient backgrounds and glow effects (Classic Romance, Adventurous, Playful & Fun, Cozy & Intimate, Wanderlust, Our Fur Babies). Different mood sets per occasion. "Make it yours" section with keyword tags and inspiration URL inputs.

**4.4 — Colors & Style**: "Let AI pick" recommended option at top. 2-column palette cards with gradient strip + swatches (12 palettes). Timeline Layout selector with visual mini-previews (Cascade, Filmstrip, Magazine, Scrapbook, Chapters, Starmap).

**4.5 — Your Story**: Tone suggestion chips (Funny, Emotional, Short & sweet). "How did you meet?" textarea. "Just a few lines — AI does the rest."

**4.6 — Final Touches**: All optional. Pets/inside jokes + "Your song" input.

**4.7 — Event Details** (wedding/engagement only): Date, venue search, RSVP deadline, cash fund URL.

**4.8 — Details Phase**: Occasion-specific accordion sections. URL slug picker with availability check.

**Confirm Screen**: Review summary with edit links. Large "Generate My Site" CTA.

### Step 5: Generation Screen
- Full-screen takeover with WebGL mesh gradient backdrop
- Progress ring (SVG circle) with percentage
- 8 pass steps: Reading photos → Writing story → Refining → Learning DNA → Designing world → Painting art → Uploading → Final poetry
- Photo mosaic of selected photos appearing
- Sneak peek hints ("Chapter 1 taking shape...", "Your palette is gorgeous...")
- "Your story is ready ✨" completion state

---

## 6. Dashboard (My Sites)

### Purpose
Manage existing sites and start new ones.

### Layout
- Site cards with: thumbnail, name, subdomain, status (draft/published), last edited
- Actions per site: Edit, View, Delete
- "Create New Site" button starts wizard
- Draft recovery banner if unsaved progress
- Quick start option

---

## 7. Site Editor

### Purpose
Full visual editor for customizing the AI-generated site. Should feel like shaping a story visually, not configuring settings.

### Overall Layout
- **Top**: 44px toolbar (exit, site name, breadcrumb, undo/redo, save status, device switcher, preview, publish)
- **Left**: 56px dark icon rail + expandable light cream sidebar panel (260-520px)
- **Center**: Dark studio canvas with dot-grid, ambient glow, device-framed live preview

### Navigation Rail (56px, dark)
4 category groups expanding to sub-items:
- **Content**: Story, Events, Guests, AI Blocks, Voice
- **Design**: Theme, Sections
- **Pages**: Messages, Save the Date, Thank You, Music, Vendors
- **Settings**: Details, Analytics, Languages

### Toolbar (44px)
Exit | Site name (italic Playfair) | Breadcrumb + ⌘K | Undo/Redo | Save pill | Device switcher | Preview | **Publish** (olive gradient CTA)

### Canvas (Center)
- Dark background (#1A1720) with dot grid + dual ambient glow
- Live preview iframe with device framing (phone/tablet/desktop)
- Section Hover Toolbar: floating glassmorphic pill with Edit, Style, ✨ AI Rewrite, More

### Sidebar Panel (Light cream, resizable)

#### Story Tab
- Timeline Format: 6 visual preview cards showing actual layout patterns
- Reorderable chapter list with thumbnails, drag handles
- Block palette: 6 draggable block types (Text Chapter, Photo + Story, Full Bleed, Photo Gallery, Cinematic Quote, Polaroid Mosaic)
- Inline chapter editor (below)

#### Chapter Editor
- Featured title input (italic Playfair, borderless)
- Date + Subtitle row
- Story textarea with inline AI Rewrite + 3 Alternatives pills
- Layout: 3x2 visual mini-preview cards (Editorial, Full Bleed, Split, Cinematic, Gallery, Mosaic)
- Mood: 8 visual presets with colored dots + custom input
- Image Manager + Section Style overrides

#### Design Tab
- AI Regenerate (prominent CTA at top)
- Theme Switcher presets
- Color Palette with AI-generated SVG art
- Visual Effects: film grain, vignette, color temperature, gradient mesh, custom cursor, section dividers, scroll reveal, texture overlays
- Font Picker
- AI Art Manager (hero, ambient, art strip)
- Asset Library (SVG dividers, illustrations, accents, stickers)
- Design Health (AI advisor + accessibility audit)

#### Events Tab
Event types: ceremony, reception, rehearsal dinner, welcome party, farewell brunch. Fields: name, date, time, venue, address.

#### Guests Tab
Search, CSV import, RSVP tracking, seating chart, invite send.

#### Other Tabs
- **AI Blocks**: Gemini-powered section generator
- **Voice**: Train AI to match writing voice
- **Messages**: Bulk email invitations
- **Save the Date**: Downloadable card generator
- **Thank You**: AI personalized notes per guest
- **Music**: Spotify suggestions + playlist embed
- **Vendors**: Category tracking with budget + day-of timeline
- **Details**: URL, couple info, dress code, registry, travel, FAQ, vibe tags
- **Analytics**: Visits, RSVPs, devices, section views
- **Languages**: AI translation into 9 languages

### Publish Flow
Modal with subdomain/custom domain, share URL, QR code, social sharing.

### Mobile Editor
Bottom sheet overlay, simplified chapter editing, touch-optimized.

---

## 8. Public Site (What Guests See)

### Purpose
The final AI-generated site guests visit. Beautiful, responsive, unique.

### Structure
- **Site Nav**: Couple names, page links (occasion-aware)
- **Hero**: Full-width cover photo, names, tagline, date/venue pill, AI-generated background art
- **Story Timeline** (6 formats): Cascade, Filmstrip, Magazine, Scrapbook, Chapters, Starmap
- **Events/Schedule**: Times, venues, maps
- **RSVP Form**: Responses, meal preferences, plus-ones
- **Registry**: Gift links
- **Travel**: Airports, hotels with booking URLs
- **FAQ**: Expandable Q&A
- **Countdown**: Live ticker to event
- **Guestbook**: Guest wishes with emoji reactions
- **Photo Gallery**: Masonry grid
- **Footer**: Closing line, couple names

### Interactive Guest Features
- **AI Guest Concierge**: Chat widget answering questions from site data
- **Guest Photo Wall**: Upload photos with captions
- **Community Memory Wall**: Guest-submitted memories with moderation
- **Couple Quiz**: Trivia generated from chapters
- **Seat Finder**: Name lookup for table assignment
- **Live Updates Feed**: Real-time updates on wedding day
- **Story Map**: Interactive map of chapter locations
- **Spotify Section**: Embedded playlist
- **Time Capsule**: Messages unlocking on future anniversaries
- **Language Switcher**: 9 language options
- **Password Protection**: Optional gate

### Visual Identity (Rind™)
Each site gets a unique AI-generated identity:
- Color palette (background, foreground, accent, accent2, muted, card)
- Typography (heading + body font pair)
- Tone (mood word)
- Section labels (AI-customized)
- Hero art, ambient art, art strip (AI-generated SVG)

### Visual Effects
Film grain, vignette, color temperature, gradient mesh, custom cursors, section dividers, scroll reveals, texture overlays, celebration confetti, wave dividers, sticker overlays.

---

## 9. Shared UI Components

- **Button**: 7 variants (primary, accent, secondary, ghost, gold, danger, darkGhost). Sizes: xs–xl + icon. Loading + icon slots.
- **Card**: default, elevated, dark. Padding: none/sm/md/lg. Hover lift.
- **Badge**: success, warning, info, default.
- **Input**: Olive focus ring, 16px min mobile font.
- **Textarea**: Multi-line, resize handle.
- **Tabs**: Pill indicator, Radix-based.
- **Accordion**: Chevron rotation animation.
- **Modal/Dialog**: Backdrop blur overlay.
- **Dropdown**: Popover with hover states.
- **Tooltip**: Small hover popover.
- **Toast**: Bottom-right notification.
- **Avatar**: Circular image.
- **Separator**: Divider line.
- **Skeleton**: Shimmer loading placeholder.
- **Switch**: Toggle.
- **Progress Steps**: Wizard indicator with aliases.
- **Pill**: Eyebrow badge with sparkle, variants (olive/plum/dark/gold).
- **IconCircle**: Icon in circular accent background.
- **Marquee**: Infinite scrolling strip.
- **Empty State**: Icon + title + description + primary/AI action buttons.

---

## 10. Design Requests for Stitch

Generate high-fidelity UI concepts for each screen. Maintain Pearloom brand (cream backgrounds, olive accents, Playfair Display headings, Lora body, warm shadows, organic/botanical feel).

### Concepts to Generate:
1. **Marketing Landing Page** — Full scroll, hero through footer
2. **Wizard: Photo Selection** — Dynamic feedback bar + photo grid
3. **Wizard: Mood Board Swipe** — Card swipe with background shift
4. **Wizard: Occasion Selection** — 2-column large card grid
5. **Wizard: Colors & Style** — Palette cards + timeline format previews
6. **Wizard: Generation Screen** — Full-screen mesh gradient + progress ring
7. **Dashboard: My Sites** — Site card grid + create new
8. **Editor: Full Layout** — Rail + sidebar + canvas, all zones visible
9. **Editor: Chapter Editor** — Layout previews, mood presets, story textarea
10. **Editor: Design Panel** — Theme switcher, colors, effects, fonts
11. **Public Site: Wedding** — Hero through footer, cascade timeline
12. **Public Site: Birthday** — Different tone/colors
13. **Component Library** — Buttons, cards, inputs, badges, pills, modals
14. **Mobile: Wizard Flow** — Phone-sized steps
15. **Mobile: Editor** — Bottom sheet interface
