// ─────────────────────────────────────────────────────────────
// Pearloom / lib/db.ts
// Supabase Data Access Layer (Multi-Tenant Architecture)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import type {
  SiteConfig,
  RsvpResponse,
  Venue,
  VenueSpace,
  SeatingTable,
  Seat,
  SeatingConstraint,
  RegistrySource,
  RegistryItem,
} from '@/types';

// Lazy-initialised client: only runs at request time, never at build time
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// ─── Public API ───

export async function getSiteConfig(subdomain: string): Promise<SiteConfig | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sites')
    .select('site_config, ai_manifest, theme_override')
    .eq('subdomain', subdomain)
    .single();

  if (error || !data) return null;

  // Re-assemble the standard template payload with dynamic overrides
  const baseConfig: SiteConfig = data.site_config as SiteConfig;
  baseConfig.manifest = data.ai_manifest;
  
  if (data.theme_override) {
    baseConfig.theme = data.theme_override;
  }

  return baseConfig;
}

export async function publishSite(
  userId: string, 
  subdomain: string, 
  manifest: unknown,
  names: [string, string] = ['', '']
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  try {
    // Check if this subdomain is owned by someone else
    const { data: existing } = await supabase
      .from('sites')
      .select('id, site_config')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (existing) {
      const ownerEmail = (existing.site_config as Record<string, unknown>)?.creator_email;
      if (ownerEmail && ownerEmail !== userId) {
        return { success: false, error: 'Subdomain is already taken by another user.' };
      }

      // Same user re-publishing — update
      const { error } = await supabase
        .from('sites')
        .update({
          ai_manifest: manifest,
          site_config: {
            ...((existing.site_config as Record<string, unknown>) || {}),
            slug: subdomain,
            creator_email: userId,
            names,
            createdAt: new Date().toISOString()
          }
        })
        .eq('subdomain', subdomain);

      if (error) {
        console.error('Publish update error:', error);
        return { success: false, error: `Database update failed: ${error.message}` };
      }
      return { success: true };
    }

    // New site — insert
    const { error } = await supabase
      .from('sites')
      .insert({
        subdomain: subdomain.toLowerCase(),
        ai_manifest: manifest,
        site_config: {
          slug: subdomain,
          creator_email: userId,
          names,
          createdAt: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Publish insert error:', error);
      return { success: false, error: `Database insert failed: ${error.message}` };
    }
    return { success: true };

  } catch (err: unknown) {
    console.error('Publish error:', err);
    return { success: false, error: `Publish failed: ${err instanceof Error ? err.message : 'Unknown error'}` };
  }
}

export async function getRsvps(siteId: string): Promise<RsvpResponse[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('rsvps')
    .select('*')
    .eq('site_id', siteId);
  
  if (error) return [];
  return data as RsvpResponse[];
}

export async function addRsvp(siteId: string, rsvp: RsvpResponse): Promise<RsvpResponse | null> {
  const supabase = getSupabase();
  // Simple upsert based on email per site
  const { data, error } = await supabase
    .from('rsvps')
    .upsert({
       site_id: siteId,
       name: rsvp.guestName,
       email: rsvp.email,
       attending: rsvp.status === 'attending',
       dietary_restrictions: rsvp.dietaryRestrictions || null
    }, { onConflict: 'email' })
    .select()
    .single();

  if (error) return null;
  return data as unknown as RsvpResponse;
}

// ─────────────────────────────────────────────────────────────
// Venue helpers
// ─────────────────────────────────────────────────────────────

function toVenue(row: Record<string, unknown>): Venue {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    siteId: row.site_id as string | undefined,
    name: row.name as string,
    formattedAddress: row.formatted_address as string | undefined,
    placeId: row.place_id as string | undefined,
    lat: row.lat as number | undefined,
    lng: row.lng as number | undefined,
    website: row.website as string | undefined,
    phone: row.phone as string | undefined,
    capacityCeremony: row.capacity_ceremony as number | undefined,
    capacityReception: row.capacity_reception as number | undefined,
    indoorOutdoor: row.indoor_outdoor as Venue['indoorOutdoor'],
    notes: row.notes as string | undefined,
    floorplanUrl: row.floorplan_url as string | undefined,
    createdAt: row.created_at as string,
  };
}

function toVenueSpace(row: Record<string, unknown>): VenueSpace {
  return {
    id: row.id as string,
    venueId: row.venue_id as string,
    name: row.name as string,
    capacity: row.capacity as number | undefined,
    widthFt: row.width_ft as number | undefined,
    lengthFt: row.length_ft as number | undefined,
    shape: row.shape as string | undefined,
    notes: row.notes as string | undefined,
  };
}

export async function getVenuesForSite(siteId: string): Promise<Venue[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('venues')
    .select('*')
    .eq('site_id', siteId);
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toVenue);
}

export async function createVenue(data: Omit<Venue, 'id' | 'createdAt'>): Promise<Venue> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('venues')
    .insert({
      user_id: data.userId,
      site_id: data.siteId,
      name: data.name,
      formatted_address: data.formattedAddress,
      place_id: data.placeId,
      lat: data.lat,
      lng: data.lng,
      website: data.website,
      phone: data.phone,
      capacity_ceremony: data.capacityCeremony,
      capacity_reception: data.capacityReception,
      indoor_outdoor: data.indoorOutdoor,
      notes: data.notes,
      floorplan_url: data.floorplanUrl,
    })
    .select()
    .single();
  if (error || !row) throw new Error(`createVenue failed: ${error?.message}`);
  return toVenue(row as Record<string, unknown>);
}

export async function updateVenue(id: string, data: Partial<Venue>): Promise<Venue> {
  const supabase = getSupabase();
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.siteId !== undefined) patch.site_id = data.siteId;
  if (data.formattedAddress !== undefined) patch.formatted_address = data.formattedAddress;
  if (data.placeId !== undefined) patch.place_id = data.placeId;
  if (data.lat !== undefined) patch.lat = data.lat;
  if (data.lng !== undefined) patch.lng = data.lng;
  if (data.website !== undefined) patch.website = data.website;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.capacityCeremony !== undefined) patch.capacity_ceremony = data.capacityCeremony;
  if (data.capacityReception !== undefined) patch.capacity_reception = data.capacityReception;
  if (data.indoorOutdoor !== undefined) patch.indoor_outdoor = data.indoorOutdoor;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.floorplanUrl !== undefined) patch.floorplan_url = data.floorplanUrl;

  const { data: row, error } = await supabase
    .from('venues')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !row) throw new Error(`updateVenue failed: ${error?.message}`);
  return toVenue(row as Record<string, unknown>);
}

export async function getVenueSpaces(venueId: string): Promise<VenueSpace[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('venue_spaces')
    .select('*')
    .eq('venue_id', venueId);
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toVenueSpace);
}

// ─────────────────────────────────────────────────────────────
// Seating helpers
// ─────────────────────────────────────────────────────────────

function toSeatingTable(row: Record<string, unknown>): SeatingTable {
  return {
    id: row.id as string,
    spaceId: row.space_id as string,
    userId: row.user_id as string,
    label: row.label as string,
    shape: row.shape as SeatingTable['shape'],
    capacity: row.capacity as number,
    x: row.x as number,
    y: row.y as number,
    rotation: row.rotation as number,
    isReserved: row.is_reserved as boolean,
    notes: row.notes as string | undefined,
  };
}

function toSeat(row: Record<string, unknown>): Seat {
  return {
    id: row.id as string,
    tableId: row.table_id as string,
    seatNumber: row.seat_number as number,
    guestId: row.guest_id as string | undefined,
    mealPreference: row.meal_preference as string | undefined,
  };
}

function toConstraint(row: Record<string, unknown>): SeatingConstraint {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    siteId: row.site_id as string | undefined,
    type: row.type as SeatingConstraint['type'],
    guestIds: row.guest_ids as string[] | undefined,
    tableId: row.table_id as string | undefined,
    priority: row.priority as 1 | 2,
    description: row.description as string | undefined,
  };
}

export async function getTablesForSpace(spaceId: string): Promise<SeatingTable[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('seating_tables')
    .select('*')
    .eq('space_id', spaceId);
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toSeatingTable);
}

export async function createTable(data: Omit<SeatingTable, 'id' | 'seats'>): Promise<SeatingTable> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('seating_tables')
    .insert({
      space_id: data.spaceId,
      user_id: data.userId,
      label: data.label,
      shape: data.shape,
      capacity: data.capacity,
      x: data.x,
      y: data.y,
      rotation: data.rotation,
      is_reserved: data.isReserved,
      notes: data.notes,
    })
    .select()
    .single();
  if (error || !row) throw new Error(`createTable failed: ${error?.message}`);
  return toSeatingTable(row as Record<string, unknown>);
}

export async function updateTablePosition(id: string, x: number, y: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('seating_tables')
    .update({ x, y })
    .eq('id', id);
  if (error) throw new Error(`updateTablePosition failed: ${error.message}`);
}

export async function assignGuestToSeat(seatId: string, guestId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('seats')
    .update({ guest_id: guestId })
    .eq('id', seatId);
  if (error) throw new Error(`assignGuestToSeat failed: ${error.message}`);
}

export async function unassignSeat(seatId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('seats')
    .update({ guest_id: null })
    .eq('id', seatId);
  if (error) throw new Error(`unassignSeat failed: ${error.message}`);
}

export async function getSeatsForTable(tableId: string): Promise<Seat[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('seats')
    .select('*')
    .eq('table_id', tableId)
    .order('seat_number');
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toSeat);
}

export async function getConstraintsForSite(siteId: string): Promise<SeatingConstraint[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('seating_constraints')
    .select('*')
    .eq('site_id', siteId);
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toConstraint);
}

export async function createConstraint(data: Omit<SeatingConstraint, 'id'>): Promise<SeatingConstraint> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('seating_constraints')
    .insert({
      user_id: data.userId,
      site_id: data.siteId,
      type: data.type,
      guest_ids: data.guestIds,
      table_id: data.tableId,
      priority: data.priority,
      description: data.description,
    })
    .select()
    .single();
  if (error || !row) throw new Error(`createConstraint failed: ${error?.message}`);
  return toConstraint(row as Record<string, unknown>);
}

// ─────────────────────────────────────────────────────────────
// Registry helpers
// ─────────────────────────────────────────────────────────────

function toRegistrySource(row: Record<string, unknown>): RegistrySource {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    siteId: row.site_id as string | undefined,
    storeName: row.store_name as string,
    registryUrl: row.registry_url as string,
    category: row.category as string | undefined,
    notes: row.notes as string | undefined,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

function toRegistryItem(row: Record<string, unknown>): RegistryItem {
  return {
    id: row.id as string,
    sourceId: row.source_id as string,
    name: row.name as string,
    price: row.price as number | undefined,
    imageUrl: row.image_url as string | undefined,
    itemUrl: row.item_url as string | undefined,
    category: row.category as string | undefined,
    priority: row.priority as RegistryItem['priority'],
    purchased: row.purchased as boolean,
    notes: row.notes as string | undefined,
  };
}

export async function getRegistrySourcesForSite(siteId: string): Promise<RegistrySource[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('registry_sources')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order');
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toRegistrySource);
}

export async function createRegistrySource(data: Omit<RegistrySource, 'id' | 'createdAt'>): Promise<RegistrySource> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('registry_sources')
    .insert({
      user_id: data.userId,
      site_id: data.siteId,
      store_name: data.storeName,
      registry_url: data.registryUrl,
      category: data.category,
      notes: data.notes,
      sort_order: data.sortOrder,
    })
    .select()
    .single();
  if (error || !row) throw new Error(`createRegistrySource failed: ${error?.message}`);
  return toRegistrySource(row as Record<string, unknown>);
}

export async function updateRegistrySource(id: string, data: Partial<RegistrySource>): Promise<RegistrySource> {
  const supabase = getSupabase();
  const patch: Record<string, unknown> = {};
  if (data.storeName !== undefined) patch.store_name = data.storeName;
  if (data.registryUrl !== undefined) patch.registry_url = data.registryUrl;
  if (data.siteId !== undefined) patch.site_id = data.siteId;
  if (data.category !== undefined) patch.category = data.category;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;

  const { data: row, error } = await supabase
    .from('registry_sources')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !row) throw new Error(`updateRegistrySource failed: ${error?.message}`);
  return toRegistrySource(row as Record<string, unknown>);
}

export async function deleteRegistrySource(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('registry_sources')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`deleteRegistrySource failed: ${error.message}`);
}

export async function getRegistryItems(sourceId: string): Promise<RegistryItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('registry_items')
    .select('*')
    .eq('source_id', sourceId);
  if (error) return [];
  return (data as Record<string, unknown>[]).map(toRegistryItem);
}

export async function upsertRegistryItem(data: Omit<RegistryItem, 'id'>): Promise<RegistryItem> {
  const supabase = getSupabase();
  const { data: row, error } = await supabase
    .from('registry_items')
    .upsert({
      source_id: data.sourceId,
      name: data.name,
      price: data.price,
      image_url: data.imageUrl,
      item_url: data.itemUrl,
      category: data.category,
      priority: data.priority,
      purchased: data.purchased,
      notes: data.notes,
    })
    .select()
    .single();
  if (error || !row) throw new Error(`upsertRegistryItem failed: ${error?.message}`);
  return toRegistryItem(row as Record<string, unknown>);
}
