// ─────────────────────────────────────────────────────────────
// Pearloom / app/g/[token]/page.tsx
//
// Personalized Guest Experience — the Seat-to-Story microsite.
// Every guest receives a link to /g/{guest_token} in their
// invite. Unlike /sites/[domain] which is the public site,
// this page:
//   - Addresses the guest by name in the hero copy
//   - Shows their personalized chapter highlights
//   - Shows their seat assignment + neighbors
//   - Shows travel tips tailored to their home city
//   - Pre-fills RSVP
//
// This is the feature that nobody else in the industry
// delivers today. Each site now has N personalized variants.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getGuestByToken } from '@/lib/event-os/db';
import { getOrGeneratePersonalization } from '@/lib/event-os/personalize';
import type { StoryManifest } from '@/types';
import { PersonalGuestHero } from '@/components/guest-experience/PersonalGuestHero';
import { VoiceToastRecorder } from '@/components/guest-experience/VoiceToastRecorder';

export const metadata: Metadata = {
  title: "You're Invited | Pearloom",
  description: 'Your personalized celebration page.',
};

export const dynamic = 'force-dynamic';

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export default async function PersonalGuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const guest = await getGuestByToken(token);
  if (!guest) notFound();

  const { data: site } = await sb()
    .from('sites')
    .select('id, subdomain, site_config, creator_email')
    .eq('id', guest.site_id)
    .maybeSingle();

  if (!site?.site_config) notFound();

  const manifest = (site.site_config as { manifest?: StoryManifest }).manifest;
  if (!manifest) notFound();

  // Best-effort couple names from coupleId
  const [rawA, rawB] = (manifest.coupleId ?? '').split(/[-_]/);
  const coupleNames: [string, string] = [
    rawA ? rawA.charAt(0).toUpperCase() + rawA.slice(1) : 'Us',
    rawB ? rawB.charAt(0).toUpperCase() + rawB.slice(1) : '',
  ];

  const venueCity =
    manifest.logistics?.venueAddress?.split(',').slice(-2, -1)[0]?.trim();

  let personalization;
  try {
    personalization = await getOrGeneratePersonalization({
      guest,
      manifest,
      coupleNames,
      venueCity,
    });
  } catch (err) {
    // Personalization is nice-to-have — fall through with defaults
    console.error('[guest-experience] personalize failed', err);
    personalization = {
      hero_copy: `${guest.display_name.split(' ')[0]} — we can't wait to celebrate with you.`,
      chapter_highlights: [],
      travel_tips: {},
      seat_summary: 'Your seat will appear here once assigned.',
    };
  }

  const theme = manifest.theme?.colors;
  const headingFont = manifest.theme?.fonts?.heading ?? 'Playfair Display';
  const bodyFont = manifest.theme?.fonts?.body ?? 'Inter';
  const sitePublicUrl = `/sites/${site.subdomain}`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme?.background ?? '#F5F1E8',
        color: theme?.foreground ?? '#2B2B2B',
        fontFamily: bodyFont,
      }}
    >
      <PersonalGuestHero
        guestFirstName={guest.display_name.split(' ')[0]}
        coupleNames={coupleNames}
        heroCopy={personalization.hero_copy}
        accent={theme?.accent ?? '#A3B18A'}
        headingFont={headingFont}
        eventDate={manifest.logistics?.date ?? ''}
        venue={manifest.logistics?.venue ?? ''}
      />

      <section style={{ padding: '3rem 1.5rem', maxWidth: 720, margin: '0 auto' }}>
        {personalization.chapter_highlights.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontFamily: headingFont,
              fontSize: '1.5rem',
              marginBottom: '1rem',
              letterSpacing: '-0.01em',
            }}>
              Chapters with you in them
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
              {personalization.chapter_highlights.map((h) => {
                const chapter = manifest.chapters?.find((c) => c.id === h.chapterId);
                return (
                  <li key={h.chapterId} style={{
                    padding: '1rem 1.25rem',
                    background: theme?.cardBg ?? '#ffffff',
                    borderRadius: '0.75rem',
                    border: `1px solid ${theme?.accentLight ?? '#EEE8DC'}`,
                  }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: theme?.muted ?? '#9A9488', marginBottom: '0.35rem' }}>
                      {chapter?.title || 'A chapter'}
                    </div>
                    <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {h.whyTheyreMentioned}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            background: theme?.cardBg ?? '#ffffff',
            borderRadius: '0.75rem',
            border: `1px solid ${theme?.accentLight ?? '#EEE8DC'}`,
          }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: theme?.muted ?? '#9A9488', marginBottom: '0.35rem' }}>
              Your seat
            </div>
            <div style={{ fontSize: '1rem', lineHeight: 1.55 }}>
              {personalization.seat_summary}
            </div>
          </div>

          {(personalization.travel_tips.nearestAirport || personalization.travel_tips.recommendedHotels?.length) && (
            <div style={{
              padding: '1.25rem 1.5rem',
              background: theme?.cardBg ?? '#ffffff',
              borderRadius: '0.75rem',
              border: `1px solid ${theme?.accentLight ?? '#EEE8DC'}`,
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: theme?.muted ?? '#9A9488', marginBottom: '0.5rem' }}>
                Getting here from {guest.home_city ?? 'home'}
              </div>
              {personalization.travel_tips.nearestAirport && (
                <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Nearest airport: <strong>{personalization.travel_tips.nearestAirport}</strong>
                  {personalization.travel_tips.driveTime && ` — ${personalization.travel_tips.driveTime}`}
                </div>
              )}
              {personalization.travel_tips.recommendedHotels?.length ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                  {personalization.travel_tips.recommendedHotels.map((h, i) => (
                    <li key={i} style={{ margin: '0.25rem 0' }}>
                      {h.url ? <a href={h.url} style={{ color: theme?.accent ?? '#A3B18A' }}>{h.name}</a> : h.name}
                      {h.note && <span style={{ color: theme?.muted ?? '#9A9488' }}> — {h.note}</span>}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>

        <VoiceToastRecorder
          token={token}
          accent={theme?.accent ?? '#A3B18A'}
          headingFont={headingFont}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '2rem' }}>
          <a
            href={`/rsvp?site=${site.subdomain}&g=${token}`}
            style={{
              padding: '0.85rem 1.5rem',
              background: theme?.accent ?? '#A3B18A',
              color: theme?.background ?? '#F5F1E8',
              borderRadius: '999px',
              fontSize: '0.9rem',
              letterSpacing: '0.02em',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            RSVP now →
          </a>
          <a
            href={sitePublicUrl}
            style={{
              padding: '0.85rem 1.5rem',
              background: 'transparent',
              color: theme?.foreground ?? '#2B2B2B',
              borderRadius: '999px',
              fontSize: '0.9rem',
              textDecoration: 'none',
              border: `1px solid ${theme?.accentLight ?? '#EEE8DC'}`,
            }}
          >
            See the full site →
          </a>
        </div>
      </section>

      <footer style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.75rem', color: theme?.muted ?? '#9A9488' }}>
        Personalized for {guest.display_name} · <a href="https://pearloom.com" style={{ color: 'inherit' }}>Pearloom</a>
      </footer>
    </div>
  );
}
