// ─────────────────────────────────────────────────────────────
// Pearloom / lib/db.ts
// Supabase Data Access Layer (Multi-Tenant Architecture)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import type { SiteConfig, RsvpResponse } from '@/types';

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
