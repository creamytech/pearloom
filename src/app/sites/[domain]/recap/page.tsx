// ─────────────────────────────────────────────────────────────
// Pearloom / app/sites/[domain]/recap/page.tsx
// Post-event memory book — auto-generated the day after the
// wedding (or any time after). Pulls guest-uploaded photos,
// guestbook entries, and RSVP messages into a single recap.
//
// Accessible at /sites/[domain]/recap. A link appears on the
// public site once the event date has passed.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { AnniversaryRecap } from '@/components/site/AnniversaryRecap';
import type { StoryManifest } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Memory book | Pearloom',
  description: 'A look back at the day.',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

async function fetchRecapData(subdomain: string) {
  const supabase = getSupabase();
  const { data: siteRow } = await supabase
    .from('sites')
    .select('id, subdomain, site_config, ai_manifest')
    .eq('subdomain', subdomain)
    .maybeSingle();
  if (!siteRow) return null;
  const siteId = siteRow.id as string;
  const manifest = siteRow.ai_manifest as StoryManifest | null;

  const [galleryRes, guestbookRes, guestsRes] = await Promise.allSettled([
    supabase
      .from('gallery_photos')
      .select('url, uploaded_by, caption, created_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('guestbook_messages')
      .select('name, message, created_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('guests')
      .select('name, message, status')
      .eq('site_id', siteId)
      .not('message', 'is', null),
  ]);

  const gallery =
    galleryRes.status === 'fulfilled' ? (galleryRes.value.data as Array<{
      url: string;
      uploaded_by?: string;
      caption?: string;
      created_at: string;
    }>) || [] : [];
  const guestbook =
    guestbookRes.status === 'fulfilled' ? (guestbookRes.value.data as Array<{
      name: string;
      message: string;
      created_at: string;
    }>) || [] : [];
  const rsvps =
    guestsRes.status === 'fulfilled' ? (guestsRes.value.data as Array<{
      name: string;
      message: string;
      status: string;
    }>) || [] : [];

  const siteConfig = siteRow.site_config as Record<string, unknown> | null;
  const names: [string, string] = (siteConfig?.names as [string, string]) || ['', ''];

  return { manifest, names, gallery, guestbook, rsvps, subdomain };
}

export default async function RecapPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const data = await fetchRecapData(domain);
  if (!data) notFound();

  const eventDate =
    data.manifest?.logistics?.date ||
    data.manifest?.events?.[0]?.date;

  return (
    <AnniversaryRecap
      names={data.names}
      manifest={data.manifest}
      gallery={data.gallery}
      guestbook={data.guestbook}
      rsvpNotes={data.rsvps.filter(r => r.status === 'attending' && r.message)}
      eventDate={eventDate}
      subdomain={data.subdomain}
    />
  );
}
