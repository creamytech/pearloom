// ─────────────────────────────────────────────────────────────
// Pearloom / lib/pricing-agreement.test.ts
//
// THE AGREEMENT FENCE (M.7 — NEW-USER-REVAMP L36/L87).
//
// One suite that makes the three money truths agree:
//
//   1. PLAN_LIMITS / PLAN_PRICE_CENTS (the code that enforces)
//   2. The pricing page's rendered claims (DesignPricing.TIERS)
//      + the settings plan cards (text-grepped)
//   3. docs/MONETIZATION.md's ladder (the doc that calls itself
//      the single source of truth)
//
// The audit found all three disagreeing: the doc sold 1 free site
// while the code enforced 2; the ladder sold "AI generations
// 10/100/Unlimited" — numbers NOTHING enforced (the real gate is
// checkPearGate: 15 drafts/month free, unlimited from Pass up);
// and the cards sold the full Studio, the Director, seating, the
// vendor book, the memory book, and archive export — none of which
// has a plan gate, so every account already has them (L36).
//
// The rule this fence enforces: A MONEY SURFACE MAY ONLY CLAIM
// WHAT THE CODE ENFORCES OR GRANTS. Change a limit, a price, or a
// grant and this suite makes you change every surface with it.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PLAN_LIMITS,
  PLAN_PRICE_CENTS,
  ARCHIVE_RENEWAL_CENTS,
} from '@/lib/plan-gate';
import { PEAR_MONTHLY_LIMIT } from '@/lib/rate-limit';
import { TIERS } from '@/components/marketing/design/DesignPricing';
import { planGrantedPackIds } from '@/lib/theme-store/entitlements';
import { PACKS } from '@/lib/theme-store/packs';
import { EVENT_TYPES } from '@/lib/event-os/event-types';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

/** All host-readable text on a tier card, one lowercase string. */
const cardText = (name: string) => {
  const tier = TIERS.find((t) => t.name === name);
  if (!tier) throw new Error(`pricing page has no "${name}" tier`);
  return [tier.blurb, ...tier.feats].join(' · ').toLowerCase();
};

// ─── 1 · The enforced constants themselves ───────────────────
//
// Pin the numbers first so every claim below is anchored to code,
// not to another copy of the copy.

describe('the enforced plan constants', () => {
  it('Page (FREE) enforces 2 sites / 100 guests / 50 photos / 1 co-host', () => {
    expect(PLAN_LIMITS.FREE.maxSites).toBe(2); // DECISIONS-2026-08-04 §2
    expect(PLAN_LIMITS.FREE.maxGuests).toBe(100);
    expect(PLAN_LIMITS.FREE.maxPhotos).toBe(50);
    expect(PLAN_LIMITS.FREE.maxCoHosts).toBe(1);
  });

  it('free Pear drafting mirrors the ONE enforced gate (checkPearGate)', () => {
    // The old ladder sold 10/100/∞ — enforced by nothing. The real
    // gate is PEAR_MONTHLY_LIMIT per month for free accounts and
    // unlimited from Pass up (rate-limit.ts short-circuits rank ≥ pro).
    expect(PLAN_LIMITS.FREE.aiGenerations).toBe(PEAR_MONTHLY_LIMIT);
    expect(PLAN_LIMITS.PRO.aiGenerations).toBe(Infinity);
    expect(PLAN_LIMITS.PREMIUM.aiGenerations).toBe(Infinity);
  });

  it('Pass (PRO) enforces 10 sites / 500 guests / 500 photos / unlimited co-hosts', () => {
    expect(PLAN_LIMITS.PRO.maxSites).toBe(10);
    expect(PLAN_LIMITS.PRO.maxGuests).toBe(500);
    expect(PLAN_LIMITS.PRO.maxPhotos).toBe(500);
    expect(PLAN_LIMITS.PRO.maxCoHosts).toBe(Infinity);
  });

  it('Keepsake (PREMIUM) is unlimited on every counted limit', () => {
    expect(PLAN_LIMITS.PREMIUM.maxSites).toBe(Infinity);
    expect(PLAN_LIMITS.PREMIUM.maxGuests).toBe(Infinity);
    expect(PLAN_LIMITS.PREMIUM.maxPhotos).toBe(Infinity);
    expect(PLAN_LIMITS.PREMIUM.maxCoHosts).toBe(Infinity);
  });

  it('prices are the one-time trio the tills import', () => {
    expect(PLAN_PRICE_CENTS.free).toBe(0);
    expect(PLAN_PRICE_CENTS.pro).toBe(8900);
    expect(PLAN_PRICE_CENTS.premium).toBe(19900);
    expect(ARCHIVE_RENEWAL_CENTS).toBe(2900);
  });
});

// ─── 2 · The pricing page agrees with the code ───────────────

describe('the pricing page (DesignPricing.TIERS)', () => {
  it('carries exactly Page / Pass / Keepsake at the till prices, one-time', () => {
    expect(TIERS.map((t) => t.name)).toEqual(['Page', 'Pass', 'Keepsake']);
    const [page, pass, keepsake] = TIERS;
    expect(page.price * 100).toBe(PLAN_PRICE_CENTS.free);
    expect(pass.price * 100).toBe(PLAN_PRICE_CENTS.pro);
    expect(keepsake.price * 100).toBe(PLAN_PRICE_CENTS.premium);
    expect(page.cadence).toBe('forever');
    expect(pass.cadence).toBe('once');
    expect(keepsake.cadence).toBe('once');
  });

  it('the Page card claims the FREE limits, in the FREE numbers', () => {
    const page = cardText('Page');
    expect(page).toMatch(/two sites/); // maxSites 2, pinned above
    expect(page).toContain(`${PLAN_LIMITS.FREE.maxGuests} guests`);
    expect(page).toContain(`${PLAN_LIMITS.FREE.aiGenerations} drafts by pear`);
    expect(page).toMatch(/every month/); // the allowance is monthly, and says so
    // The occasions claim tracks the registry, not a hand-kept number.
    expect(page).toContain(`all ${EVENT_TYPES.length} occasions`);
  });

  it('the Pass card claims the PRO limits, in the PRO numbers', () => {
    const pass = cardText('Pass');
    expect(pass).toMatch(/ten sites/); // maxSites 10, pinned above
    expect(pass).toContain(
      `${PLAN_LIMITS.PRO.maxGuests} guests, ${PLAN_LIMITS.PRO.maxPhotos} photos`,
    );
    expect(pass).toMatch(/unlimited drafting/); // aiGenerations Infinity
    expect(pass).toMatch(/co-hosts/); // maxCoHosts Infinity
  });

  it('the Keepsake card claims only the unlimited scale that IS its gate', () => {
    const keepsake = cardText('Keepsake');
    expect(keepsake).toMatch(/unlimited sites/);
    expect(keepsake).toMatch(/unlimited guests, unlimited photos/);
  });

  it('design is free — every plan grants the whole catalog, no pack carries a price (E.1)', () => {
    // FREE DESIGN (EDITOR-CALM-PLAN E.1, owner decision 2026-08-13):
    // the tier system is collapsed at the source. Every pack is
    // free; every plan (and no plan) grants everything.
    for (const p of PACKS) {
      expect(p.priceCents, `${p.id} carries a price`).toBe(0);
      expect(p.tier, `${p.id} carries a paid tier`).toBe('free');
    }
    const all = PACKS.map((p) => p.id);
    for (const plan of ['free', 'pro', 'premium', 'page', 'pass', 'keepsake', null]) {
      const grants = planGrantedPackIds(plan);
      for (const id of all) expect(grants).toContain(id);
    }
    // The free card says so plainly; no paid card claims design.
    expect(cardText('Page')).toMatch(/every theme and design, free/i);
  });

  it('never sells an un-gated feature as a paid one (L36)', () => {
    // None of these has a plan gate — every account has them all.
    // They may not appear on ANY tier card until a gate exists.
    // theme/shelf/pack joined the list with E.1: design is free
    // for everyone, so any design claim on a PAID card is exactly
    // the fabrication this test exists to kill.
    const unGated =
      /\b(studio|director|seating|vendor|budget|broadcast|custom domain|memory book|archive)\b/;
    const designClaim = /\b(theme|themes|shelf|pack|packs)\b/i;
    for (const tier of TIERS) {
      expect(cardText(tier.name)).not.toMatch(unGated);
      if (tier.name !== 'Page') {
        expect(cardText(tier.name), `${tier.name} claims design`).not.toMatch(designClaim);
      }
    }
  });

  it('never speaks subscription language on a card', () => {
    for (const tier of TIERS) {
      // "15 drafts by Pear every month" is an allowance, not a bill —
      // billing language ("per month", "/mo", "monthly") is what's banned.
      expect(cardText(tier.name)).not.toMatch(/\/mo\b|per month|monthly|subscription/);
      expect(tier.cadence).not.toMatch(/mo|month|year|yr/);
    }
  });
});

// ─── 3 · The settings plan cards agree (text-grepped) ────────
//
// UserSettingsModal + DashSettings render their own plan copy.
// Importing those trees drags the whole dashboard into the test,
// so this greps the source — the same pattern as the fabrications
// fence in welcome-home-copy.test.ts.

describe('the settings money surfaces', () => {
  const SURFACES = [
    'src/components/pearloom/dash/UserSettingsModal.tsx',
    'src/components/marketing/design/dash/DashSettings.tsx',
  ];

  it.each(SURFACES)('%s carries the real prices and no un-gated sales', (file) => {
    const body = read(file);
    expect(body).toContain(`$${PLAN_PRICE_CENTS.pro / 100}`);
    expect(body).toContain(`$${PLAN_PRICE_CENTS.premium / 100}`);
    // The claims this fence exists to kill, verbatim as they shipped:
    expect(body).not.toMatch(/full Studio/);
    expect(body).not.toMatch(/memory book, kept/i);
    // The invented subscription tier's price from the pre-M.1 era.
    // (Not the word "Bloom" itself — that's also a brand groove
    // component; the fabrication was the $12/mo subscription.)
    expect(body).not.toMatch(/\$12\/mo/);
  });

  it('the Stripe line items claim only enforced limits', () => {
    // These descriptions land on the buyer's receipt — the most
    // binding money copy of all. The shipped versions sold "the full
    // Studio, and the day-of room" (Pass) and "the memory book, and
    // the long view" (Keepsake): none plan-gated, all free.
    const till = read('src/app/api/billing/checkout/route.ts');
    expect(till).not.toMatch(/full Studio/);
    expect(till).not.toMatch(/the day-of room/);
    expect(till).not.toMatch(/the memory book, and/);
    expect(till).not.toMatch(/full-resolution media/);
  });
});

// ─── 4 · MONETIZATION.md agrees with the code it points at ───
//
// The doc declares itself the source of truth for the model; the
// audit found it drifting from its own constants three ways (L87).
// Pin the ladder rows to the enforced numbers so the doc can never
// quietly disagree with plan-gate.ts again.

describe('docs/MONETIZATION.md', () => {
  const doc = read('docs/MONETIZATION.md');

  it('the ladder carries the enforced numbers', () => {
    expect(doc).toContain(
      `| Celebrations / sites | ${PLAN_LIMITS.FREE.maxSites} | ${PLAN_LIMITS.PRO.maxSites} | Unlimited |`,
    );
    expect(doc).toContain(
      `| Guests | ${PLAN_LIMITS.FREE.maxGuests} | ${PLAN_LIMITS.PRO.maxGuests} | Unlimited |`,
    );
    expect(doc).toContain(
      `| Photos | ${PLAN_LIMITS.FREE.maxPhotos} | ${PLAN_LIMITS.PRO.maxPhotos} | Unlimited |`,
    );
    expect(doc).toContain(
      `| Drafts by Pear | ${PEAR_MONTHLY_LIMIT} a month | Unlimited | Unlimited |`,
    );
    expect(doc).toContain(
      `| Co-hosts | ${PLAN_LIMITS.FREE.maxCoHosts} | Unlimited | Unlimited |`,
    );
  });

  it('the ladder carries the till prices', () => {
    expect(doc).toContain(`**$${PLAN_PRICE_CENTS.pro / 100}** one-time`);
    expect(doc).toContain(`**$${PLAN_PRICE_CENTS.premium / 100}** one-time`);
    expect(doc).toContain(`$${ARCHIVE_RENEWAL_CENTS / 100}/yr`);
  });

  it('the drifted rows this fence was built for stay dead', () => {
    // Free tier at 1 site (the code enforces 2):
    expect(doc).not.toContain('| Celebrations / sites | 1 |');
    // The un-enforced AI ladder:
    expect(doc).not.toMatch(/\| AI generations \|/);
    // The table row that sold un-gated features and a custom domain
    // nobody built (the Enforcement section may DISCUSS them; a
    // ladder row may not sell them):
    expect(doc).not.toMatch(/^\| Linked events, co-hosts, full Studio/m);
    expect(doc).not.toMatch(/^\| Custom domain \| — \| ✓ \| ✓ \|/m);
    expect(doc).not.toMatch(/^\| Unlimited full-res media, memory book, archive export/m);
  });
});
