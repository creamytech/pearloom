// ─────────────────────────────────────────────────────────────
// Pearloom / lib/guest-management/index.ts
// Advanced guest management — address collection, family
// grouping, plus-one approval, dietary aggregation, seating
// assignments, thank-you tracking.
//
// This is what makes us competitive with Zola's guest tools.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface GuestRecord {
  id: string;
  /** Full name */
  name: string;
  email?: string;
  phone?: string;
  /** Mailing address for thank-you cards */
  mailingAddress?: MailingAddress;
  /** RSVP status */
  status: 'invited' | 'attending' | 'declined' | 'pending' | 'maybe';
  /** Family/household group ID */
  familyGroupId?: string;
  /** Family group name (e.g., "The Johnson Family") */
  familyGroupName?: string;
  /** Is this the primary contact for the family? */
  isPrimaryContact: boolean;
  /** Plus-one details */
  plusOne?: {
    allowed: boolean;
    name?: string;
    confirmed?: boolean;
    /** Host must approve the plus-one */
    needsApproval: boolean;
    approvedAt?: number;
  };
  /** Meal selection */
  mealSelection?: string;
  /** Dietary restrictions */
  dietary?: string;
  /** Custom question responses */
  customResponses?: Record<string, string>;
  /** Table/seat assignment */
  tableAssignment?: string;
  seatNumber?: number;
  /** Guest category */
  category: 'couple-side-a' | 'couple-side-b' | 'mutual' | 'family' | 'work' | 'other';
  /** Guest tier (affects invite timing) */
  tier: 'a-list' | 'b-list' | 'c-list';
  /** Invite sent tracking */
  inviteSentAt?: number;
  inviteOpenedAt?: number;
  inviteClickedAt?: number;
  /** RSVP submitted timestamp */
  rsvpSubmittedAt?: number;
  /** Thank-you sent tracking */
  thankYouSentAt?: number;
  /** Gift received */
  giftDescription?: string;
  giftAmount?: number;
  /** Notes from the couple */
  notes?: string;
  /** Created timestamp */
  createdAt: number;
}

export interface MailingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface FamilyGroup {
  id: string;
  name: string; // "The Johnson Family"
  memberIds: string[];
  /** Max guests allowed for this household */
  maxGuests: number;
  /** Primary contact ID */
  primaryContactId: string;
}

// ── Guest List Management ────────────────────────────────────

/**
 * Group guests into families/households.
 */
export function groupByFamily(guests: GuestRecord[]): FamilyGroup[] {
  const groups = new Map<string, GuestRecord[]>();

  for (const guest of guests) {
    const groupId = guest.familyGroupId || guest.id;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId)!.push(guest);
  }

  return Array.from(groups.entries()).map(([id, members]) => ({
    id,
    name: members[0].familyGroupName || `${members[0].name}'s Group`,
    memberIds: members.map(m => m.id),
    maxGuests: members.length + members.filter(m => m.plusOne?.allowed).length,
    primaryContactId: members.find(m => m.isPrimaryContact)?.id || members[0].id,
  }));
}

/**
 * Get plus-one approval queue.
 */
export function getPlusOneApprovals(guests: GuestRecord[]): GuestRecord[] {
  return guests.filter(g =>
    g.plusOne?.name &&
    g.plusOne.needsApproval &&
    !g.plusOne.approvedAt
  );
}

/**
 * Aggregate dietary needs for catering.
 */
export function aggregateDietary(guests: GuestRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const g of guests) {
    if (g.status !== 'attending' || !g.dietary) continue;
    const needs = g.dietary.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    for (const need of needs) {
      counts[need] = (counts[need] || 0) + 1;
    }
  }
  return counts;
}

/**
 * Get meal count summary for caterer.
 */
export function getMealCounts(guests: GuestRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const g of guests) {
    if (g.status !== 'attending') continue;
    const meal = g.mealSelection || 'Not selected';
    counts[meal] = (counts[meal] || 0) + 1;
  }
  return counts;
}

/**
 * Get guests missing mailing addresses (for thank-you cards).
 */
export function getMissingAddresses(guests: GuestRecord[]): GuestRecord[] {
  return guests.filter(g =>
    g.status === 'attending' &&
    (!g.mailingAddress || !g.mailingAddress.line1 || !g.mailingAddress.city)
  );
}

/**
 * Get thank-you tracking summary.
 */
export function getThankYouSummary(guests: GuestRecord[]): {
  total: number;
  sent: number;
  pending: number;
  withGifts: number;
  giftTotal: number;
} {
  const attending = guests.filter(g => g.status === 'attending');
  const sent = attending.filter(g => g.thankYouSentAt);
  const withGifts = attending.filter(g => g.giftDescription || g.giftAmount);
  return {
    total: attending.length,
    sent: sent.length,
    pending: attending.length - sent.length,
    withGifts: withGifts.length,
    giftTotal: withGifts.reduce((sum, g) => sum + (g.giftAmount || 0), 0),
  };
}

/**
 * Export guest addresses for mail merge / thank-you cards.
 */
export function exportAddressCSV(guests: GuestRecord[]): string {
  const header = 'Name,Address Line 1,Address Line 2,City,State,ZIP,Country,Gift,Thank You Sent';
  const rows = guests
    .filter(g => g.status === 'attending' && g.mailingAddress)
    .map(g => {
      const a = g.mailingAddress!;
      return `"${g.name}","${a.line1}","${a.line2 || ''}","${a.city}","${a.state}","${a.zip}","${a.country}","${g.giftDescription || ''}","${g.thankYouSentAt ? 'Yes' : 'No'}"`;
    });
  return [header, ...rows].join('\n');
}

/**
 * Get RSVP statistics.
 */
export function getRsvpStats(guests: GuestRecord[]): {
  total: number;
  attending: number;
  declined: number;
  pending: number;
  plusOnes: number;
  totalHeadcount: number;
  responseRate: number;
} {
  const attending = guests.filter(g => g.status === 'attending');
  const declined = guests.filter(g => g.status === 'declined');
  const pending = guests.filter(g => g.status === 'pending' || g.status === 'invited');
  const plusOnes = attending.filter(g => g.plusOne?.confirmed).length;

  return {
    total: guests.length,
    attending: attending.length,
    declined: declined.length,
    pending: pending.length,
    plusOnes,
    totalHeadcount: attending.length + plusOnes,
    responseRate: guests.length > 0 ? Math.round(((attending.length + declined.length) / guests.length) * 100) : 0,
  };
}

// ── Invite Tracking ──────────────────────────────────────────

/**
 * Get invite funnel analytics.
 */
export function getInviteFunnel(guests: GuestRecord[]): {
  sent: number;
  opened: number;
  clicked: number;
  responded: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
} {
  const sent = guests.filter(g => g.inviteSentAt);
  const opened = guests.filter(g => g.inviteOpenedAt);
  const clicked = guests.filter(g => g.inviteClickedAt);
  const responded = guests.filter(g => g.rsvpSubmittedAt);

  return {
    sent: sent.length,
    opened: opened.length,
    clicked: clicked.length,
    responded: responded.length,
    openRate: sent.length > 0 ? Math.round((opened.length / sent.length) * 100) : 0,
    clickRate: sent.length > 0 ? Math.round((clicked.length / sent.length) * 100) : 0,
    responseRate: sent.length > 0 ? Math.round((responded.length / sent.length) * 100) : 0,
  };
}
