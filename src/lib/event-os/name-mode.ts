// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/name-mode.ts
//
// Resolves how many host-name fields an event asks for. The
// wizard Basics step uses this so weddings require two names,
// birthdays show exactly one (no awkward "& optional"), and
// group events (reunions, housewarmings) stay optional.
//
// Three modes:
//   'couple' — two names required (both persons co-host)
//   'solo'   — one name (no second field at all)
//   'group'  — one optional name (host, coordinator, or empty)
// ─────────────────────────────────────────────────────────────

import type { SiteOccasion } from '@/lib/site-urls';
import { isSoloOccasion } from '@/lib/event-os/solo-occasions';

export type NameMode = 'couple' | 'solo' | 'group';

export interface NameModeSpec {
  mode: NameMode;
  /** Field labels + placeholder text, tailored per occasion. */
  primaryLabel: string;
  primaryPlaceholder: string;
  secondaryLabel?: string;
  secondaryPlaceholder?: string;
  /** Helper copy under the name fields. */
  hint?: string;
}

const COUPLE_EVENTS: SiteOccasion[] = [
  'wedding',
  'engagement',
  'vow-renewal',
  'anniversary',
  'rehearsal-dinner',
  'welcome-party',
  'brunch',
  'gender-reveal',       // for expecting parents (a pair)
];

// Solo-honoree events read the canonical registry in
// lib/event-os/solo-occasions.ts — the same set the OG route,
// metadata emitters, and renderers consume. One person, ONE
// name field, no partner placeholder anywhere.
//
// Everything else (reunion, housewarming, story) is optional/group.

/** Resolve which host-name field layout fits this occasion. */
export function nameModeFor(occasion: string | undefined): NameModeSpec {
  const occ = (occasion ?? '') as SiteOccasion;

  if (COUPLE_EVENTS.includes(occ)) {
    // Specialize the field labels by occasion so gender reveals
    // don't say "Name 1 / Name 2".
    if (occ === 'gender-reveal') {
      return {
        mode: 'couple',
        primaryLabel: 'Parent 1',
        primaryPlaceholder: 'Jamie',
        secondaryLabel: 'Parent 2',
        secondaryPlaceholder: 'Alex',
        hint: 'Both names go on the invite and any paperwork Pear drafts for you.',
      };
    }
    return {
      mode: 'couple',
      primaryLabel: 'Name 1',
      primaryPlaceholder: 'Alex',
      secondaryLabel: 'Name 2',
      secondaryPlaceholder: 'Jamie',
      hint: 'Both names appear on the hero, invite, and save-the-date.',
    };
  }

  if (isSoloOccasion(occ)) {
    if (occ === 'baby-shower') {
      return {
        mode: 'solo',
        primaryLabel: 'Parent-to-be',
        primaryPlaceholder: 'Jamie',
        hint: 'The shower centers on them — Pear writes the rest around their name.',
      };
    }
    if (occ === 'sip-and-see') {
      return {
        mode: 'solo',
        primaryLabel: 'Baby’s name',
        primaryPlaceholder: 'Sage',
        hint: 'Guests are coming to meet exactly one very small person.',
      };
    }
    if (occ === 'bridal-shower' || occ === 'bridal-luncheon') {
      return {
        mode: 'solo',
        primaryLabel: 'Guest of honor',
        primaryPlaceholder: 'Jess',
        hint: 'Pear centers the day on her — the wedding gets its own site.',
      };
    }
    if (occ === 'bachelor-party' || occ === 'bachelorette-party') {
      return {
        mode: 'solo',
        primaryLabel: 'Guest of honor',
        primaryPlaceholder: 'Marco',
        hint: 'Pear will reference the guest of honor by name across the site.',
      };
    }
    if (occ === 'memorial' || occ === 'funeral') {
      return {
        mode: 'solo',
        primaryLabel: 'Name of the person being remembered',
        primaryPlaceholder: 'Eleanor Rose Thompson',
        hint: 'This is the name Pear centers every page around.',
      };
    }
    if (occ === 'first-birthday') {
      return {
        mode: 'solo',
        primaryLabel: 'Baby’s name',
        primaryPlaceholder: 'Sage',
        hint: 'Pear will write warmly about the baby without overreaching.',
      };
    }
    if (occ === 'graduation') {
      return {
        mode: 'solo',
        primaryLabel: 'Graduate',
        primaryPlaceholder: 'Kai Nakamura',
        hint: 'Pear will pair this with the school on the hero.',
      };
    }
    if (occ === 'retirement') {
      return {
        mode: 'solo',
        primaryLabel: 'Retiree',
        primaryPlaceholder: 'Patricia Nguyen',
        hint: 'Pear will weave their career arc into the story.',
      };
    }
    if (occ === 'bar-mitzvah' || occ === 'bat-mitzvah') {
      return {
        mode: 'solo',
        primaryLabel: 'Name of the young person',
        primaryPlaceholder: 'Noah',
        hint: 'English name is fine — you can add the Hebrew name in the editor.',
      };
    }
    if (occ === 'quinceanera') {
      return {
        mode: 'solo',
        primaryLabel: 'Quinceañera',
        primaryPlaceholder: 'Valentina',
        hint: 'Pear will frame the court-of-honor around her.',
      };
    }
    return {
      mode: 'solo',
      primaryLabel: 'Whose day is it?',
      primaryPlaceholder: 'Sam',
      hint: 'Just one name — this is their moment.',
    };
  }

  // Group / optional.
  if (occ === 'reunion') {
    return {
      mode: 'group',
      primaryLabel: 'Host / organizer (optional)',
      primaryPlaceholder: 'The Hernandez cousins',
      hint: 'Skip if this is a collective thing. Pear will refer to "everyone" by default.',
    };
  }
  if (occ === 'housewarming') {
    return {
      mode: 'group',
      primaryLabel: 'New resident(s)',
      primaryPlaceholder: 'Alex & Jamie',
      hint: 'One name or two — whoever moved in.',
    };
  }
  return {
    mode: 'group',
    primaryLabel: 'Host (optional)',
    primaryPlaceholder: 'Your name',
    hint: 'Leave blank if you’d rather keep the host anonymous.',
  };
}

/** True once the configured required-names are filled in. */
export function nameModeIsValid(occasion: string | undefined, names: [string, string]): boolean {
  const spec = nameModeFor(occasion);
  const primary = (names[0] ?? '').trim();
  if (spec.mode === 'group') return true;
  if (spec.mode === 'solo') return primary.length > 0;
  // couple: primary always required, secondary required for wedding-core events,
  // optional for shower/bachelor/baby-shower variants that opted in above.
  const occ = (occasion ?? '') as SiteOccasion;
  const strictCouple =
    occ === 'wedding' ||
    occ === 'engagement' ||
    occ === 'vow-renewal' ||
    occ === 'anniversary';
  if (strictCouple) {
    return primary.length > 0 && (names[1] ?? '').trim().length > 0;
  }
  return primary.length > 0;
}
