'use client';

// ─────────────────────────────────────────────────────────────
// Client wrapper that resolves the active site → manifest +
// names, then renders the heavyweight InviteDesigner. Replaces
// the previous server-side redirect to /dashboard/event when no
// ?site= param was set — the sidebar's site picker is now the
// single source of truth, so this wrapper just reads from it.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { StoryManifest } from '@/types';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { StudioApp } from '@/components/pearloom/studio/StudioApp';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { DashEmpty } from '@/components/pearloom/dash/DashEmpty';

interface SiteFetchResult {
  manifest: StoryManifest | null;
  names: [string, string];
}

interface Props {
  /** Optional URL ?site= override — wins over the sidebar pick. */
  initialSlug?: string | null;
}

export function InviteDesignerLoader({ initialSlug }: Props) {
  const { site, loading: sitesLoading } = useSelectedSite();
  const slug = initialSlug ?? site?.domain ?? null;
  const [data, setData] = useState<SiteFetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Captured from the failing fetch so the DashEmpty CTA can
   *  pivot to the right destination (login vs editor vs sites). */
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    (async () => {
      try {
        const r = await fetch(`/api/sites/${encodeURIComponent(slug)}`, { cache: 'no-store' });
        if (!r.ok) {
          if (!cancelled) setErrorStatus(r.status);
          if (r.status === 401) throw new Error('Your session ended — sign in again to keep editing.');
          if (r.status === 403) throw new Error("You're not the owner of this site.");
          if (r.status === 404) throw new Error('That site no longer exists.');
          throw new Error('Could not load site.');
        }
        const body = await r.json() as { manifest?: StoryManifest | null; names?: [string, string] };
        if (cancelled) return;
        setData({
          manifest: body.manifest ?? null,
          names: Array.isArray(body.names) && body.names.length >= 2
            ? [body.names[0], body.names[1]]
            : ['Your', 'Celebration'],
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Empty state — user has no sites at all.
  if (!sitesLoading && !slug) {
    return (
      <DashLayout active="studio">
        <div className="pl8-dash-page-enter" style={{ padding: 'clamp(20px, 4vw, 40px)', maxWidth: 800, margin: '0 auto' }}>
          <DashEmpty
            size="page"
            eyebrow="Invite designer"
            title="No site yet"
            body="Create a site first and Pear will paint a save-the-date or invite that matches its theme."
            actions={[{ label: 'Create a site', href: '/wizard/new', primary: true }]}
          />
        </div>
      </DashLayout>
    );
  }

  if (loading || sitesLoading || !data) {
    return (
      <DashLayout active="studio">
        <div className="pl8-dash-page-enter" style={{ padding: 'clamp(20px, 4vw, 40px)', textAlign: 'center', color: 'var(--ink-muted)' }}>
          Threading the designer…
        </div>
      </DashLayout>
    );
  }

  if (error || !data.manifest) {
    const primaryAction = errorStatus === 401
      ? { label: 'Sign in', href: '/login', primary: true as const }
      : errorStatus === 403 || errorStatus === 404
        ? { label: 'Pick another site', href: '/dashboard/event', primary: true as const }
        : { label: 'Open editor', href: slug ? `/editor/${slug}` : '/dashboard/event', primary: true as const };
    return (
      <DashLayout active="studio">
        <div className="pl8-dash-page-enter" style={{ padding: 'clamp(20px, 4vw, 40px)', maxWidth: 800, margin: '0 auto' }}>
          <DashEmpty
            size="page"
            eyebrow="Invite designer"
            title={
              errorStatus === 401 ? 'Session ended'
              : errorStatus === 403 ? 'Not your site'
              : errorStatus === 404 ? 'Site missing'
              : "Couldn't load that site"
            }
            body={error ?? 'The site exists but its manifest is empty. Open the editor to seed it.'}
            actions={[primaryAction]}
          />
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--ink-muted)' }}>
            Or pick a different site from the sidebar selector. <Link href="/dashboard/event" style={{ color: 'var(--peach-ink)' }}>Manage sites</Link>
          </p>
        </div>
      </DashLayout>
    );
  }

  return <StudioApp siteSlug={slug!} manifest={data.manifest} names={data.names} />;
}
