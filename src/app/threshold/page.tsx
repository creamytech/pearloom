// ─────────────────────────────────────────────────────────────
// Pearloom / app/threshold/page.tsx — the arrival moment.
//
// Post-login threshold for hosts tending MORE THAN ONE
// celebration: their days laid out as pressed cards — cover
// photo (or a tinted crest tile), the phase line from the one
// cockpit clock, real guest counts — pick one and step inside.
//
// The rules that keep it from taxing anyone:
//   • 0 sites → the wizard begins a thread; 1 site → straight
//     to the dashboard. Only multi-event hosts ever see this.
//   • Deep links bypass entirely (the welcome gate honours
//     ?next= before ever landing here).
//   • Selection writes the same sticky store the dashboard
//     reads, so the pick holds across every tab.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { listSitesForEmail } from '@/lib/sites-list';
import { cockpitPhaseFor, type CockpitPhase } from '@/lib/event-os/cockpit-phase';
import { getEventType } from '@/lib/event-os/event-types';
import { ThresholdClient, type ThresholdCard } from './ThresholdClient';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Welcome back · Pearloom',
  description: 'Choose the day you’re tending.',
};

export const dynamic = 'force-dynamic';

function daysUntil(dateISO: string | null): number | null {
  if (!dateISO) return null;
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** The phase line — the same clock every dashboard card reads. */
function phaseLineFor(phase: CockpitPhase | null, d: number | null): string | null {
  if (phase === null || d === null) return null;
  if (phase === 'the-day') return 'Today.';
  if (phase === 'afterglow') return 'The afterglow';
  if (phase === 'kept') return 'Kept';
  if (d === 1) return 'Tomorrow';
  return `${d} days to go`;
}

export default async function ThresholdPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/login?next=/threshold');

  const sites = await listSitesForEmail(session.user.email);
  // Nothing to choose between — the threshold only earns its
  // moment with 2+ celebrations. Everyone else passes through.
  if (!sites || sites.length < 2) redirect('/dashboard');

  // Real guest counts per card (zero-collapse in the client).
  const counts = new Map<string, number>();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const sb = createClient(url, key, { auth: { persistSession: false } });
      await Promise.all(
        sites.slice(0, 12).map(async (s) => {
          const { count } = await sb
            .from('guests')
            .select('id', { count: 'exact', head: true })
            .eq('site_id', s.id);
          if (count) counts.set(s.id, count);
        }),
      );
    } catch { /* cards render without counts */ }
  }

  const cards: ThresholdCard[] = sites.map((s) => {
    const m = (s.manifest ?? {}) as {
      coverPhoto?: string;
      logistics?: { date?: string; venue?: string };
    };
    const dateISO = m.logistics?.date ?? null;
    const d = daysUntil(dateISO);
    const phase = d === null ? null : cockpitPhaseFor(d);
    const names = (s.names as string[]).map((n) => String(n ?? '').trim()).filter(Boolean);
    const occLabel = (getEventType(s.occasion ?? '')?.label ?? s.occasion ?? 'Celebration').split(' / ')[0];
    const dateLabel = dateISO
      ? new Date(`${dateISO}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;
    return {
      id: s.id,
      title: names.length >= 2 ? `${names[0]} & ${names[1]}` : (names[0] || s.domain),
      initial: (names[0] || s.domain).charAt(0).toUpperCase(),
      occasion: s.occasion ?? null,
      occasionLabel: occLabel,
      dateLabel,
      phaseLine: phaseLineFor(phase, d),
      coverPhoto: m.coverPhoto ?? null,
      guests: counts.get(s.id) ?? 0,
      shared: Boolean(s.coHostRole),
    };
  });

  const firstName = (session.user.name ?? '').trim().split(/\s+/)[0] || '';
  return <ThresholdClient cards={cards} firstName={firstName} />;
}
