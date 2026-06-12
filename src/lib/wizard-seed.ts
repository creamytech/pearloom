// ─────────────────────────────────────────────────────────────
// wizard-seed — fill the SECTION data the wizard didn't ask for.
//
// The wizard collects story inputs (occasion, names, photos,
// vibes, palette) but a finished site also needs Schedule /
// Details / Travel / FAQ / RSVP data. seedSectionsFromWizard()
// derives what it honestly can from what the host already gave
// us — venue-aware FAQ answers, a travel intro naming the venue,
// an RSVP deadline ~5 weeks before the date — and fills ONLY
// missing fields, so AI-generated or host-authored content always
// wins. Deterministic, server-safe, no model calls.
//
// Called from WizardV8.handleFinish on BOTH paths (AI + skeleton)
// after the manifest is resolved, plus stamps the host's explicit
// "The Day" picks (events / dress code / deadline) which beat
// anything generated.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import {
  faqQuestionSuggestions,
  faqAnswerDraftFor,
  travelDirectionsSuggestions,
  smartContext,
} from '@/components/pearloom/editor/panels/_suggestions';

type Loose = Record<string, unknown>;

/** Host picks from the wizard's "The Day" step. */
export interface DayPicks {
  /** Tap-built schedule moments (already time-filled). */
  events?: Array<{ name: string; time: string }>;
  dressCode?: string;
  rsvpDeadline?: string; // ISO date
  /** "Guests will ask" quick-collect — where to stay, kids,
   *  parking. Each seeds the section guests actually read
   *  (Travel hotels / Details cards / FAQ answers). */
  hotels?: Array<{ name: string; address: string }>;
  kidsPolicy?: string;
  parkingNote?: string;
  /** "The extras" — component picks. Countdown joins the block
   *  order, the playlist becomes the Music embed, meals become
   *  the RSVP form's meal question, the registry link becomes a
   *  Registry card. */
  wantsCountdown?: boolean;
  playlistUrl?: string;
  meals?: string[];
  registryUrl?: string;
  /** Plus-ones policy → rsvpConfig.plusOnes + the FAQ answer. */
  plusOnes?: boolean;
  /** Honor list names → manifest.weddingParty + the honorList
   *  section. `partyRole` labels them per occasion ("Wedding
   *  party" / "Court of honor" / "Candle lighter"). */
  partyNames?: string[];
  partyRole?: string;
}

/* Append a block to the manifest's block order without disturbing
   an explicit order the host (or a template) already set. Mirrors
   redesign/bastings.ts — the core sections are the implicit
   default when blockOrder is unset. */
const CORE_ORDER = ['story', 'details', 'schedule', 'travel', 'registry', 'gallery', 'rsvp', 'faq'];
function withBlock(loose: Loose, section: string): void {
  const order = Array.isArray(loose.blockOrder) ? (loose.blockOrder as string[]) : CORE_ORDER;
  if (!order.includes(section)) loose.blockOrder = [...order, section];
}

/* Provider detection — the same regexes MusicPanel uses. */
function musicProviderFor(url: string): 'spotify' | 'apple' | 'youtube' | 'custom' {
  if (/spotify\.com/i.test(url)) return 'spotify';
  if (/music\.apple\.com/i.test(url)) return 'apple';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  return 'custom';
}

/* A friendly store name from a registry URL's host. */
const REGISTRY_HOSTS: Array<[RegExp, string]> = [
  [/zola\.com/i, 'Zola'],
  [/amazon\./i, 'Amazon'],
  [/babylist\.com/i, 'Babylist'],
  [/target\.com/i, 'Target'],
  [/crateandbarrel\.com/i, 'Crate & Barrel'],
  [/williams-?sonoma\.com/i, 'Williams Sonoma'],
  [/myregistry\.com/i, 'MyRegistry'],
  [/gofundme\.com/i, 'GoFundMe'],
  [/honeyfund\.com/i, 'Honeyfund'],
];
function registryNameFor(url: string): string {
  for (const [re, name] of REGISTRY_HOSTS) if (re.test(url)) return name;
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    return host.split('.')[0].replace(/^./, (c) => c.toUpperCase());
  } catch {
    return 'Our registry';
  }
}

/** ~5 weeks before the event date, clamped to tomorrow. */
export function suggestRsvpDeadline(eventDateIso?: string): string | null {
  if (!eventDateIso) return null;
  const ms = Date.parse(eventDateIso);
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms - 35 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pick = d > tomorrow ? d : tomorrow;
  if (pick.getTime() > ms) return null; // event is (nearly) past
  return pick.toISOString().slice(0, 10);
}

/** Fill-missing section seeding + stamp explicit Day picks. */
export function seedSectionsFromWizard(
  manifest: StoryManifest,
  picks: DayPicks = {},
): StoryManifest {
  const loose = { ...(manifest as unknown as Loose) };
  const logistics = { ...((loose.logistics as Loose | undefined) ?? {}) };

  // ── Host picks always win ──────────────────────────────────
  if (picks.dressCode?.trim()) logistics.dresscode = picks.dressCode.trim();
  if (picks.rsvpDeadline) logistics.rsvpDeadline = picks.rsvpDeadline;
  if (picks.events && picks.events.length > 0) {
    loose.events = picks.events.map((e, i) => ({
      id: `e-${i}-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: e.name,
      time: e.time,
      type: 'other',
      date: '',
      venue: '',
      address: '',
    }));
  }

  // ── Derived fills (only when missing) ──────────────────────
  if (!logistics.rsvpDeadline) {
    const dl = suggestRsvpDeadline(logistics.date as string | undefined);
    if (dl) logistics.rsvpDeadline = dl;
  }
  loose.logistics = logistics;

  const ctx = smartContext({ ...loose, logistics });

  // Travel intro — venue-aware first line when none exists.
  const travelInfo = { ...((loose.travelInfo as Loose | undefined) ?? {}) };
  if (!(travelInfo.directions as string | undefined)?.trim() && ctx.venue) {
    travelInfo.directions = travelDirectionsSuggestions(ctx).options[0];
    loose.travelInfo = travelInfo;
  }

  // "Where guests stay" — the wizard's hotel picks become real
  // Travel-section hotel cards (only when the host hasn't already
  // added hotels some other way).
  const hostHotels = (picks.hotels ?? []).filter((h) => h.name.trim());
  const existingHotels = (travelInfo.hotels as unknown[] | undefined) ?? [];
  if (hostHotels.length > 0 && existingHotels.length === 0) {
    travelInfo.hotels = hostHotels.map((h, i) => ({
      id: `h-seed-${i}`,
      name: h.name.trim(),
      address: h.address.trim(),
    }));
    loose.travelInfo = travelInfo;
  }

  // Parking — rides the Travel section's parking line.
  if (picks.parkingNote?.trim() && !(travelInfo.parkingInfo as string | undefined)?.trim()) {
    travelInfo.parkingInfo = picks.parkingNote.trim();
    loose.travelInfo = travelInfo;
  }

  // FAQ — seed the occasion's standard questions WITH venue-aware
  // draft answers (skip questions we can't answer honestly). The
  // host's explicit "Guests will ask" answers beat the drafts:
  // a kids policy answers the kids question in their words, the
  // first hotel answers "Where should I stay?".
  const existingFaqs = (loose.faqs as Array<{ question?: string }> | undefined) ?? [];
  if (existingFaqs.length === 0) {
    const qs = faqQuestionSuggestions(ctx.occasion).options.slice(0, 4);
    const seeded = qs
      .map((q, i) => {
        const lower = q.toLowerCase();
        let answer = '';
        if (picks.kidsPolicy?.trim() && /kids|children/.test(lower)) {
          answer = picks.kidsPolicy.trim();
        } else if (picks.plusOnes !== undefined && /plus.?one|bring (a guest|someone)/.test(lower)) {
          answer = picks.plusOnes
            ? 'Yes — the RSVP form will offer a spot for your guest.'
            : 'We’re keeping it to invited guests only — thank you for understanding.';
        } else if (hostHotels.length > 0 && /stay|hotel/.test(lower)) {
          answer = `We suggest ${hostHotels.map((h) => h.name.trim()).join(' or ')} — details in the Travel section.`;
        } else if (picks.parkingNote?.trim() && /park/.test(lower)) {
          answer = picks.parkingNote.trim();
        } else {
          answer = faqAnswerDraftFor(q, ctx, { ...loose, logistics }) ?? '';
        }
        return { id: `f-seed-${i}`, question: q, answer, order: i };
      })
      .filter((f) => f.answer); // only ship answered rows
    if (seeded.length > 0) loose.faqs = seeded;
  }

  // ── The extras ──────────────────────────────────────────────
  // Countdown — joins the block order (the renderer carries the
  // CountdownBlock; presence in blockOrder is the switch).
  if (picks.wantsCountdown) withBlock(loose, 'countdown');

  // Playlist — becomes the Music section embed (fill-missing).
  const playlist = picks.playlistUrl?.trim();
  if (playlist && !(loose.music as { url?: string } | undefined)?.url) {
    loose.music = { provider: musicProviderFor(playlist), url: playlist };
    withBlock(loose, 'music');
  }

  // Meals — the RSVP form's meal question, in the MealOption shape
  // GuestRsvpModal + PresetRsvpForm read (fill-missing).
  const meals = (picks.meals ?? []).map((m) => m.trim()).filter(Boolean);
  const rsvpConfig = { ...((loose.rsvpConfig as Loose | undefined) ?? {}) };
  if (meals.length > 0 && !Array.isArray(rsvpConfig.mealOptions)) {
    rsvpConfig.mealOptions = meals.map((name, i) => ({ id: `meal-${i}`, name, dietaryTags: [] }));
    loose.rsvpConfig = rsvpConfig;
  }

  // Plus-ones — the RSVP form's +1 behavior. An explicit pick
  // always lands (it IS the host's setting, not a derived fill).
  if (picks.plusOnes !== undefined) {
    loose.rsvpConfig = { ...((loose.rsvpConfig as Loose | undefined) ?? {}), plusOnes: picks.plusOnes };
  }

  // The honor list — names become weddingParty members (the field
  // the honorList section + HonorListPanel read), labeled for the
  // occasion. Fill-missing.
  const party = (picks.partyNames ?? []).map((n) => n.trim()).filter(Boolean);
  if (party.length > 0 && !((loose.weddingParty as unknown[] | undefined)?.length)) {
    loose.weddingParty = party.map((name, i) => ({
      id: `wp-seed-${i}`,
      name,
      role: 'other',
      customRole: picks.partyRole ?? 'Wedding party',
      order: i,
    }));
    withBlock(loose, 'honorList');
  }

  // Registry link — one real entry, store name derived from the
  // host's URL (fill-missing).
  const regUrl = picks.registryUrl?.trim();
  const registry = { ...((loose.registry as Loose | undefined) ?? {}) };
  if (regUrl && !((registry.entries as unknown[] | undefined)?.length)) {
    registry.enabled = true;
    registry.entries = [{ name: registryNameFor(regUrl), url: regUrl.startsWith('http') ? regUrl : `https://${regUrl}` }];
    loose.registry = registry;
  }

  // Details cards — dress code / kids / parking, when none exist.
  const cards = (loose.detailsCards as unknown[] | undefined) ?? [];
  if (cards.length === 0) {
    const seededCards: Array<[string, string]> = [];
    if ((logistics.dresscode as string | undefined)?.trim()) {
      seededCards.push(['Dress code', logistics.dresscode as string]);
    }
    if (picks.kidsPolicy?.trim()) seededCards.push(['Kids', picks.kidsPolicy.trim()]);
    if (picks.parkingNote?.trim()) seededCards.push(['Parking', picks.parkingNote.trim()]);
    if (seededCards.length > 0) loose.detailsCards = seededCards;
  }

  return loose as unknown as StoryManifest;
}
