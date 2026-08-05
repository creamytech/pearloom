// ─────────────────────────────────────────────────────────────
// Hide, don't delete.
//
// The synthesis (§1.9, unanimous) collapses the sidebar to three
// areas — Create / Guests / Plan & Remember — and is explicit that
// everything else becomes CONTEXTUAL, not gone. The failure mode of
// any such collapse is a destination that quietly stops being
// reachable from anywhere: the route still resolves, so no test
// fails and no build breaks, but no host can find it again.
//
// So this pins the pre-collapse destination list as a contract.
// Every one of them must still be reachable from the sidebar, a
// sub-nav tab, or the quiet shelf (⌘K + More tools). Move things
// freely; drop one and this fails.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { DASH_NAV_GROUPS, DASH_SECTIONS } from './DashShell';
import { DEPROMOTED_DESTINATIONS } from './DashCommandPalette';

/**
 * Everything a host could reach from the sidebar before the
 * 2026-08-05 collapse. This list is deliberately frozen — it is the
 * contract, not a mirror of the current nav.
 */
const PRE_COLLAPSE_DESTINATIONS = [
  '/dashboard',
  '/dashboard/event',
  '/dashboard/weekend',
  '/dashboard/rsvp',
  '/dashboard/invite',
  '/dashboard/gallery',
  '/dashboard/registry',
  '/dashboard/day-of',
  '/dashboard/music',
  '/dashboard/speech',
  '/dashboard/budget',
  '/dashboard/vendors',
  '/dashboard/keepsakes',
  '/dashboard/passport-cards',
  '/dashboard/qr-poster',
  '/dashboard/circle',
  '/dashboard/analytics',
  '/dashboard/profile',
  '/dashboard/help',
];

function reachable(): Set<string> {
  const out = new Set<string>();
  for (const group of DASH_NAV_GROUPS) for (const item of group.items) out.add(item.href);
  for (const section of Object.values(DASH_SECTIONS)) {
    for (const tab of section.tabs) out.add(tab.href);
  }
  for (const d of DEPROMOTED_DESTINATIONS) out.add(d.href);
  return out;
}

describe('no destination is lost in the collapse', () => {
  const found = reachable();

  it.each(PRE_COLLAPSE_DESTINATIONS)('%s is still reachable', (href) => {
    expect(
      found.has(href),
      `${href} is no longer in the sidebar, any sub-nav, or the quiet shelf. `
      + 'The collapse is "hide, don\'t delete" — put it on DEPROMOTED_DESTINATIONS '
      + 'or a sub-nav tab rather than dropping it.',
    ).toBe(true);
  });

  it('scanned real registries', () => {
    expect(found.size).toBeGreaterThan(15);
  });
});

describe('the sidebar is actually collapsed', () => {
  const contentGroups = DASH_NAV_GROUPS.filter((g) => g.id !== 'main' && g.id !== 'house');

  it('shows three areas of celebration work, not six', () => {
    expect(contentGroups.map((g) => g.label))
      .toEqual(['Create', 'Guests', 'Plan & Remember']);
  });

  it('keeps each area scannable', () => {
    // The point of the collapse is that a host can take the whole
    // sidebar in at once. Any area growing past a handful of rows
    // has quietly rebuilt the thing we just removed.
    for (const group of contentGroups) {
      expect(group.items.length, `"${group.label}" has too many rows`).toBeLessThanOrEqual(4);
    }
  });
});
