// ─────────────────────────────────────────────────────────────
// Pearloom / lib/vendor-packet.ts
//
// The vendor call sheet — everything a hired vendor needs on the
// day, and NOTHING else. One site_vendors row carries an optional
// packet_token (20260703_vendor_packets.sql); the host mints it
// from the Vendor Book and hands /vp/{token} to the vendor.
//
// PRIVACY CONTRACT: the packet exposes only
//   • the event's display name + date
//   • venue name / address (+ cached lat/lng)
//   • the host's DAY-OF contact (manifest.dayOfContact — an
//     explicit, host-authored name + phone; the host's account
//     email is NEVER used as a fallback)
//   • this vendor's own name / category / arrival time
//   • the run of show (event names / times / venues)
// Never money, never notes, never other vendors, never guests.
//
// Consumed by GET /api/vendor-packet/[token] (public, rate-
// limited) and the /vp/[token] server component. The shaping is
// pure (unit-tested); only loadVendorPacketByToken touches
// Supabase (service role — RLS on site_vendors stays deny-anon).
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import type { StoryManifest } from '@/types';
import { isSoloOccasion } from '@/lib/event-os/solo-occasions';

// ── The packet shape ──────────────────────────────────────────

export interface VendorPacket {
  event: {
    /** Display name — "Emma & James", "Marisol", or a title. */
    name: string;
    /** ISO date (YYYY-MM-DD) when the host has set one. */
    date: string | null;
    occasion: string;
  };
  venue: {
    name: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
  };
  /** The day-of contact — only when the host authored one. */
  contact: { name: string; phone: string } | null;
  vendor: {
    name: string;
    category: string;
    arrivalTime: string | null;
  };
  /** The run of show, chronological. */
  schedule: Array<{
    name: string;
    time: string | null;
    venue: string | null;
    day: number;
  }>;
}

// ── Row shapes (what the loader selects) ──────────────────────

export interface PacketVendorRow {
  name: string;
  category: string;
  arrival_time: string | null;
  site_id: string;
}

export interface PacketSiteRow {
  site_config: Record<string, unknown> | null;
  ai_manifest: unknown;
}

// ── Pure helpers ──────────────────────────────────────────────

/** "4:00 PM" / "16:00" / "4:00PM" → minutes since midnight. */
export function parseClockMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (m[3] === 'PM' && h < 12) h += 12;
  if (m[3] === 'AM' && h === 12) h = 0;
  return h * 60 + mm;
}

/** Directions link from what we have — coords beat addresses. */
export function googleMapsUrl(venue: VendorPacket['venue']): string | null {
  if (venue.lat != null && venue.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
  }
  const q = [venue.name, venue.address].filter(Boolean).join(', ');
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Shape the public packet from raw rows. Pure — no I/O. */
export function shapeVendorPacket(
  vendor: PacketVendorRow,
  site: PacketSiteRow,
): VendorPacket {
  const cfg = site.site_config ?? {};
  const manifest = (site.ai_manifest ?? {}) as StoryManifest;
  const loose = manifest as unknown as Record<string, unknown>;

  const occasion = String(
    (cfg.occasion as string | undefined) ?? (loose.occasion as string | undefined) ?? 'wedding',
  );

  // Display name — site_config.names wins, manifest.names next
  // (the /a/[siteSlug] derivation). Solo occasions show one name.
  const rawNames = Array.isArray(cfg.names)
    ? cfg.names
    : Array.isArray(loose.names)
      ? (loose.names as unknown[])
      : [];
  const names = rawNames.map((n) => String(n ?? '').trim()).filter(Boolean);
  const eventName =
    (isSoloOccasion(occasion) ? names[0] : names.join(' & ')) ||
    names.join(' & ') ||
    String((cfg.title as string | undefined) ?? '') ||
    'The celebration';

  const logistics = manifest.logistics ?? {};
  const date =
    (typeof logistics.date === 'string' && logistics.date) ||
    (typeof cfg.event_date === 'string' && cfg.event_date) ||
    null;

  const venue: VendorPacket['venue'] = {
    name: logistics.venue?.trim() || null,
    address: logistics.venueAddress?.trim() || null,
    lat: typeof logistics.venueLat === 'number' ? logistics.venueLat : null,
    lng: typeof logistics.venueLng === 'number' ? logistics.venueLng : null,
  };

  // Day-of contact — host-authored only. Requires BOTH a name and
  // a phone to render as a tap-to-call card; the host's account
  // email is never a fallback (privacy contract above).
  const doc = manifest.dayOfContact;
  const contactName = doc?.name?.trim() ?? '';
  const contactPhone = doc?.phone?.trim() ?? '';
  const contact = contactName && contactPhone ? { name: contactName, phone: contactPhone } : null;

  // Run of show — day, then clock time (unparseable times last).
  const schedule = (Array.isArray(manifest.events) ? manifest.events : [])
    .map((e) => ({
      name: String(e?.name ?? '').trim() || 'Untitled',
      time: (typeof e?.time === 'string' && e.time.trim()) || null,
      venue: (typeof e?.venue === 'string' && e.venue.trim()) || null,
      day: typeof e?.day === 'number' && e.day > 1 ? Math.floor(e.day) : 1,
    }))
    .sort(
      (a, b) =>
        a.day - b.day ||
        (parseClockMinutes(a.time) ?? 9999) - (parseClockMinutes(b.time) ?? 9999),
    )
    .slice(0, 24);

  return {
    event: { name: eventName, date, occasion },
    venue,
    contact,
    vendor: {
      name: vendor.name,
      category: vendor.category,
      arrivalTime: vendor.arrival_time?.trim() || null,
    },
    schedule,
  };
}

// ── The loader (service role) ─────────────────────────────────

const TOKEN_RX = /^[A-Za-z0-9_-]{20,80}$/;

/** True when the string even looks like a packet token — cheap
 *  pre-filter so garbage never reaches the database. */
export function isPlausiblePacketToken(token: string): boolean {
  return TOKEN_RX.test(token);
}

/** Resolve a packet token to the shaped packet. Returns null on
 *  unknown token, malformed token, or missing env — callers 404. */
export async function loadVendorPacketByToken(token: string): Promise<VendorPacket | null> {
  if (!isPlausiblePacketToken(token)) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);

  const { data: vendor } = await supabase
    .from('site_vendors')
    .select('name, category, arrival_time, site_id')
    .eq('packet_token', token)
    .maybeSingle();
  if (!vendor) return null;

  const { data: site } = await supabase
    .from('sites')
    .select('site_config, ai_manifest')
    .eq('id', vendor.site_id)
    .maybeSingle();
  if (!site) return null;

  return shapeVendorPacket(vendor as PacketVendorRow, site as PacketSiteRow);
}
