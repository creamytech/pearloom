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

export async function getGuestByToken(token: string): Promise<PearloomGuest | null> {
  const { data, error } = await admin()
    .from('pearloom_guests')
    .select('*')
    .eq('guest_token', token)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as PearloomGuest | null;
}

export async function listGuests(siteId: string): Promise<PearloomGuest[]> {
  const { data, error } = await admin()
    .from('pearloom_guests')
    .select('*')
    .eq('site_id', siteId)
    .order('display_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PearloomGuest[];
}

export async function upsertGuest(input: Partial<PearloomGuest> & { site_id: string; display_name: string }): Promise<PearloomGuest> {
  const { data, error } = await admin()
    .from('pearloom_guests')
    .upsert(input, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as PearloomGuest;
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
