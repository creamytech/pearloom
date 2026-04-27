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
  'bridal-shower',       // hosted FOR a couple or future-bride
  'bridal-luncheon',
  'bachelor-party',
  'bachelorette-party',
  'rehearsal-dinner',
  'welcome-party',
  'brunch',
  'gender-reveal',       // for expecting parents
  'baby-shower',         // baby shower for expecting parents
  'sip-and-see',
];

const SOLO_HONOREE_EVENTS: SiteOccasion[] = [
  'birthday',
  'milestone-birthday',
  'first-birthday',
  'sweet-sixteen',
  'retirement',
  'graduation',
  'bar-mitzvah',
  'bat-mitzvah',
  'quinceanera',
  'baptism',
  'first-communion',
  'confirmation',
  'memorial',
  'funeral',
];

// Everything else (reunion, housewarming, story) is optional/group.

/** Resolve which host-name field layout fits this occasion. */
export function nameModeFor(occasion: string | undefined): NameModeSpec {
  const occ = (occasion ?? '') as SiteOccasion;

  if (COUPLE_EVENTS.includes(occ)) {
    // Specialize the field labels by occasion so memorials don't say
    // "Name 1 / Name 2" and baby showers don't say "Partner".
    if (occ === 'baby-shower' || occ === 'gender-reveal' || occ === 'sip-and-see') {
      return {
        mode: 'couple',
        primaryLabel: 'Parent 1',
        primaryPlaceholder: 'Jamie',
        secondaryLabel: 'Parent 2',
        secondaryPlaceholder: 'Alex',
        hint: 'Both names go on the invite and any paperwork Pear drafts for you.',
      };
    }
    if (occ === 'bridal-shower' || occ === 'bridal-luncheon') {
      return {
        mode: 'couple',
        primaryLabel: 'Guest of honor',
        primaryPlaceholder: 'Jess',
        secondaryLabel: 'Partner',
        secondaryPlaceholder: 'Tom (optional)',
        hint: 'If this shower is for one person only, leave the second field blank.',
      };
    }
    if (occ === 'bachelor-party' || occ === 'bachelorette-party') {
      return {
        mode: 'couple',
        primaryLabel: 'Guest of honor',
        primaryPlaceholder: 'Marco',
        secondaryLabel: 'Co-host / best man',
        secondaryPlaceholder: 'Zack (optional)',
        hint: 'Pear will reference the guest of honor by name across the site.',
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

  if (SOLO_HONOREE_EVENTS.includes(occ)) {
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
