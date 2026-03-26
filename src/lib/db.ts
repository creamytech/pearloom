// ─────────────────────────────────────────────────────────────
// Pearloom / lib/db.ts
// Supabase Data Access Layer (Multi-Tenant Architecture)
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import type { SiteConfig, RsvpResponse, GalleryPhoto } from '@/types';

// The Service Role key bypasses RLS securely entirely on the backend 
// to instantly route and hydrate subdomain tenants.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Public API ───

export async function getSiteConfig(subdomain: string): Promise<SiteConfig | null> {
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
  manifest: any
): Promise<{ success: boolean; error?: string }> {
  
  try {
    // Check global uniqueness instantly
    const { count } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('subdomain', subdomain);

    if (count && count > 0) {
      return { success: false, error: 'Subdomain is already taken.' };
    }

    // Insert new live site map
    const { error } = await supabase
      .from('sites')
      .insert({
        subdomain: subdomain.toLowerCase(),
        ai_manifest: manifest,
        site_config: {
          slug: subdomain,
          creator_email: userId,
          createdAt: new Date().toISOString()
        }
      });

    if (error) throw error;
    return { success: true };

  } catch (err) {
    console.error('Publish error:', err);
    return { success: false, error: 'Failed to publish site architecture.' };
  }
}

export async function getRsvps(siteId: string): Promise<RsvpResponse[]> {
  const { data, error } = await supabase
    .from('rsvps')
    .select('*')
    .eq('site_id', siteId);
  
  if (error) return [];
  return data as RsvpResponse[];
}

export async function addRsvp(siteId: string, rsvp: RsvpResponse): Promise<RsvpResponse | null> {
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
  return data as any;
}
