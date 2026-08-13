// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/db.ts
//
// Server-side helpers for the Event OS tables. Uses the
// service role key — ALL callers must verify the session
// before invoking these functions.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  _admin = createClient(url, key);
  return _admin;
}

// ── Events ────────────────────────────────────────────────────

export interface PearloomEvent {
  id: string;
  site_id: string;
  owner_email: string;
  occasion: string;
  name: string;
  kind: string;
  start_at: string | null;
  end_at: string | null;
  timezone: string;
  venue_id: string | null;
  is_public: boolean;
  capacity: number | null;
  dress_code: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
}

export async function listEvents(siteId: string): Promise<PearloomEvent[]> {
  const { data, error } = await admin()
    .from('events')
    .select('*')
    .eq('site_id', siteId)
    .order('start_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as PearloomEvent[];
}

export async function createEvent(input: Omit<PearloomEvent, 'id' | 'metadata'> & { metadata?: Record<string, unknown> }): Promise<PearloomEvent> {
  const { data, error } = await admin()
    .from('events')
    .insert({ ...input, metadata: input.metadata ?? {} })
    .select()
    .single();
  if (error) throw error;
  return data as PearloomEvent;
}

// ── Unified guests ────────────────────────────────────────────

export interface PearloomGuest {
  id: string;
  site_id: string;
  event_id: string | null;
  guest_token: string;
  display_name: string;
  pronunciation: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  home_city: string | null;
  home_country: string | null;
  relationship_to_host: string | null;
  side: string | null;
  is_plus_one_of: string | null;
  language: string;
  dietary: string[] | null;
  accessibility: string[] | null;
  notes: string | null;
  metadata: Record<string, unknown>;
}

/* ── Site-key resolution (G.1a) ───────────────────────────────
   pearloom_guests.site_id is sites.id AS TEXT (canonical since
   20260812_pearloom_guests_site_key — the only live writer, the
   mint below, always wrote it; legacy subdomain rows are
   backfilled). Surfaces that need the subdomain (getSiteConfig,
   guest_photos) resolve through here, tolerant of either shape so
   a straggler row or a caller passing a subdomain still lands. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SiteRef { id: string; subdomain: string }

export async function resolveSiteRef(key: string): Promise<SiteRef | null> {
  const k = (key ?? '').trim();
  if (!k) return null;
  const q = admin().from('sites').select('id, subdomain');
  const { data } = UUID_RE.test(k)
    ? await q.eq('id', k).maybeSingle()
    : await q.eq('subdomain', k).maybeSingle();
  if (!data) return null;
  return { id: String((data as { id: unknown }).id), subdomain: String((data as { subdomain: unknown }).subdomain) };
}

/* ── THE ADAPTER (G.1b) ───────────────────────────────────────
   guests is the ONE canonical guest row since the
   20260812_guest_spine_merge migration folded pearloom_guests
   into it (docs/FORK-SURVEY.md is the map). Every consumer that
   used to read pearloom_guests goes through these helpers; the
   grep fence (no-guest-fork.test.ts) bans querying the old
   table anywhere. The
   PearloomGuest shape survives as the adapter's return type so
   the passport surfaces didn't have to change. */

interface GuestSpineRow {
  id: string;
  site_id: string;
  event_id?: string | null;
  guest_token?: string | null;
  passport_token?: string | null;
  name?: string | null;
  pronunciation?: string | null;
  pronouns?: string | null;
  email?: string | null;
  phone?: string | null;
  home_city?: string | null;
  home_country?: string | null;
  relationship_to_host?: string | null;
  side?: string | null;
  is_plus_one_of?: string | null;
  language?: string | null;
  dietary?: string[] | null;
  accessibility?: string[] | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

function toPearloomGuest(g: GuestSpineRow): PearloomGuest {
  return {
    id: String(g.id),
    // sites.id as uuid → the text convention every consumer holds.
    site_id: String(g.site_id ?? ''),
    event_id: g.event_id ?? null,
    // The personal-link token: passport_token is the one every
    // email/QR/dashboard surface mints; guest_token is the legacy
    // identity-era column (kept unique + resolvable).
    guest_token: String(g.passport_token ?? g.guest_token ?? ''),
    display_name: String(g.name ?? g.email ?? 'Guest'),
    pronunciation: g.pronunciation ?? null,
    pronouns: g.pronouns ?? null,
    email: g.email ?? null,
    phone: g.phone ?? null,
    home_city: g.home_city ?? null,
    home_country: g.home_country ?? null,
    relationship_to_host: g.relationship_to_host ?? null,
    side: g.side ?? null,
    is_plus_one_of: g.is_plus_one_of ?? null,
    language: g.language ?? 'en',
    dietary: g.dietary ?? null,
    accessibility: g.accessibility ?? null,
    notes: g.notes ?? null,
    metadata: (g.metadata as Record<string, unknown> | null) ?? {},
  };
}

const TOKEN_RE = /^[\w-]{6,80}$/;

export async function getGuestByToken(token: string): Promise<PearloomGuest | null> {
  // One table, both token columns — passport_token (every link the
  // product mints) and guest_token (the legacy identity era). The
  // old two-table bridge-and-mint dance is gone with the fork.
  const t = (token ?? '').trim();
  if (!TOKEN_RE.test(t)) return null;
  const { data, error } = await admin()
    .from('guests')
    .select('*')
    .or(`passport_token.eq.${t},guest_token.eq.${t}`)
    .maybeSingle();
  if (error) throw error;
  return data ? toPearloomGuest(data as GuestSpineRow) : null;
}

/** Every guest profile on a site. Accepts the site uuid or its
 *  subdomain (resolved through resolveSiteRef). */
export async function listGuests(siteKey: string): Promise<PearloomGuest[]> {
  const ref = await resolveSiteRef(siteKey);
  if (!ref) return [];
  const { data, error } = await admin()
    .from('guests')
    .select('*')
    .eq('site_id', ref.id)
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as GuestSpineRow[]).map(toPearloomGuest);
}

/** SMS webhook lookup — every guest row carrying this phone. */
export async function findGuestsByPhone(phone: string): Promise<PearloomGuest[]> {
  const p = (phone ?? '').trim();
  if (!p) return [];
  const { data, error } = await admin()
    .from('guests')
    .select('*')
    .eq('phone', p);
  if (error) throw error;
  return ((data ?? []) as GuestSpineRow[]).map(toPearloomGuest);
}

// ── Relationship graph ────────────────────────────────────────

export interface RelationshipEdge {
  id: string;
  site_id: string;
  from_guest_id: string | null;
  to_guest_id: string | null;
  kind: string;
  closeness: number | null;
  story: string | null;
  metadata: Record<string, unknown>;
}

export async function listRelationships(siteId: string): Promise<RelationshipEdge[]> {
  const { data, error } = await admin()
    .from('relationship_graph')
    .select('*')
    .eq('site_id', siteId);
  if (error) throw error;
  return (data ?? []) as RelationshipEdge[];
}

export async function upsertRelationship(edge: Partial<RelationshipEdge> & { site_id: string; kind: string }): Promise<RelationshipEdge> {
  const { data, error } = await admin()
    .from('relationship_graph')
    .upsert(edge, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as RelationshipEdge;
}

// ── Personalization cache ─────────────────────────────────────

export interface GuestPersonalization {
  id: string;
  site_id: string;
  guest_id: string;
  hero_copy: string | null;
  chapter_highlights: Array<{ chapterId: string; whyTheyreMentioned: string }> | null;
  travel_tips: {
    nearestAirport?: string;
    driveTime?: string;
    recommendedHotels?: Array<{ name: string; url?: string; note?: string }>;
  } | null;
  seat_summary: string | null;
  pronunciation_audio_url: string | null;
  generated_by: string;
  generated_at: string;
  expires_at: string | null;
}

export async function getPersonalization(guestId: string): Promise<GuestPersonalization | null> {
  const { data, error } = await admin()
    .from('guest_personalization')
    .select('*')
    .eq('guest_id', guestId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as GuestPersonalization | null;
}

export async function savePersonalization(rec: Omit<GuestPersonalization, 'id' | 'generated_at'>): Promise<GuestPersonalization> {
  const { data, error } = await admin()
    .from('guest_personalization')
    .upsert(
      {
        site_id: rec.site_id,
        guest_id: rec.guest_id,
        hero_copy: rec.hero_copy,
        chapter_highlights: rec.chapter_highlights,
        travel_tips: rec.travel_tips,
        seat_summary: rec.seat_summary,
        pronunciation_audio_url: rec.pronunciation_audio_url,
        generated_by: rec.generated_by,
        expires_at: rec.expires_at,
      },
      { onConflict: 'guest_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as GuestPersonalization;
}

// ── Vendors ───────────────────────────────────────────────────

export interface Vendor {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string | null;
  region: string | null;
  price_tier: string | null;
  min_budget_cents: number | null;
  max_budget_cents: number | null;
  description: string | null;
  portfolio_urls: string[] | null;
  rating_avg: number | null;
  rating_count: number;
  is_verified: boolean;
}

export async function searchVendors(opts: {
  category?: string;
  city?: string;
  minBudget?: number;
  maxBudget?: number;
  limit?: number;
}): Promise<Vendor[]> {
  let q = admin().from('vendors').select('*').eq('is_active', true);
  if (opts.category) q = q.eq('category', opts.category);
  if (opts.city) q = q.ilike('city', `%${opts.city}%`);
  if (typeof opts.maxBudget === 'number') {
    q = q.lte('min_budget_cents', opts.maxBudget);
  }
  if (typeof opts.minBudget === 'number') {
    q = q.gte('max_budget_cents', opts.minBudget);
  }
  const { data, error } = await q.order('rating_avg', { ascending: false, nullsFirst: false }).limit(opts.limit ?? 12);
  if (error) throw error;
  return (data ?? []) as Vendor[];
}

// ── Vendor bookings ───────────────────────────────────────────

export interface VendorBooking {
  id: string;
  site_id: string;
  event_id: string | null;
  vendor_id: string;
  owner_email: string;
  status: 'inquiry' | 'proposal_sent' | 'accepted' | 'deposit_paid' | 'paid' | 'completed' | 'cancelled' | string;
  total_cents: number | null;
  deposit_cents: number | null;
  pearloom_fee_cents: number | null;
  proposal_url: string | null;
  contract_url: string | null;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function createVendorBooking(b: {
  site_id: string;
  event_id?: string | null;
  vendor_id: string;
  owner_email: string;
  total_cents?: number | null;
  deposit_cents?: number | null;
  notes?: string | null;
}): Promise<VendorBooking> {
  const { pearloomFeeCents } = await import('./pricing');
  const pearloomFee = pearloomFeeCents(b.total_cents);
  const { data, error } = await admin()
    .from('vendor_bookings')
    .insert({
      site_id: b.site_id,
      event_id: b.event_id ?? null,
      vendor_id: b.vendor_id,
      owner_email: b.owner_email,
      total_cents: b.total_cents ?? null,
      deposit_cents: b.deposit_cents ?? null,
      pearloom_fee_cents: pearloomFee,
      notes: b.notes ?? null,
      status: 'inquiry',
    })
    .select()
    .single();
  if (error) throw error;
  return data as VendorBooking;
}

export async function listVendorBookings(siteId: string, limit = 50): Promise<VendorBooking[]> {
  const { data, error } = await admin()
    .from('vendor_bookings')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as VendorBooking[];
}

export async function getVendorBooking(id: string): Promise<VendorBooking | null> {
  const { data } = await admin()
    .from('vendor_bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as VendorBooking) ?? null;
}

export async function updateVendorBooking(id: string, patch: Partial<VendorBooking>): Promise<void> {
  const { error } = await admin()
    .from('vendor_bookings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function getVendor(id: string): Promise<(Vendor & { stripe_account_id: string | null; contact_email: string }) | null> {
  const { data } = await admin()
    .from('vendors')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return (data as (Vendor & { stripe_account_id: string | null; contact_email: string })) ?? null;
}

export async function updateVendorStripeAccount(vendorId: string, stripeAccountId: string): Promise<void> {
  const { error } = await admin()
    .from('vendors')
    .update({ stripe_account_id: stripeAccountId })
    .eq('id', vendorId);
  if (error) throw error;
}

// ── Director sessions ─────────────────────────────────────────

export interface DirectorSession {
  id: string;
  site_id: string;
  event_id: string | null;
  owner_email: string;
  budget_cents: number | null;
  target_date: string | null;
  target_city: string | null;
  guest_count_estimate: number | null;
  constraints: Record<string, unknown>;
  plan: Record<string, unknown>;
  checklist: Array<{ id: string; label: string; done: boolean; due?: string }>;
  vendor_shortlist: Array<{ vendorId: string; category: string; note?: string }>;
  conversation: Array<{ role: 'user' | 'assistant'; content: string; ts: string }>;
  status: string;
}

export async function getOrCreateDirectorSession(opts: {
  siteId: string;
  ownerEmail: string;
  eventId?: string;
}): Promise<DirectorSession> {
  const { data: existing } = await admin()
    .from('event_director_sessions')
    .select('*')
    .eq('site_id', opts.siteId)
    .eq('owner_email', opts.ownerEmail)
    .eq('status', 'active')
    .maybeSingle();
  if (existing) return existing as DirectorSession;

  const { data, error } = await admin()
    .from('event_director_sessions')
    .insert({
      site_id: opts.siteId,
      owner_email: opts.ownerEmail,
      event_id: opts.eventId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DirectorSession;
}

export async function updateDirectorSession(id: string, patch: Partial<DirectorSession>): Promise<void> {
  const { error } = await admin()
    .from('event_director_sessions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Day-of announcements ──────────────────────────────────────

export interface DayOfAnnouncement {
  id: string;
  site_id: string;
  event_id: string | null;
  author_email: string;
  body: string;
  kind: string;
  target_audience: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export async function listAnnouncements(siteId: string, limit = 30): Promise<DayOfAnnouncement[]> {
  const { data, error } = await admin()
    .from('day_of_announcements')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DayOfAnnouncement[];
}

export async function postAnnouncement(a: Omit<DayOfAnnouncement, 'id' | 'created_at' | 'sent_at'>): Promise<DayOfAnnouncement> {
  const { data, error } = await admin()
    .from('day_of_announcements')
    .insert({ ...a, sent_at: a.scheduled_for ? null : new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as DayOfAnnouncement;
}

// ── Voice toasts ──────────────────────────────────────────────

export interface VoiceToast {
  id: string;
  site_id: string;
  guest_id: string | null;
  guest_display_name: string | null;
  audio_url: string;
  duration_seconds: number | null;
  transcript: string | null;
  transcript_cleaned: string | null;
  moderation_status: string;
  is_highlight: boolean;
  created_at: string;
}

export async function listVoiceToasts(siteId: string): Promise<VoiceToast[]> {
  const { data, error } = await admin()
    .from('voice_toasts')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VoiceToast[];
}
