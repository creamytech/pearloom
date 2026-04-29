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
import { YourRsvpCard } from '@/components/guest-experience/YourRsvpCard';
import { YourContributionsCard } from '@/components/guest-experience/YourContributionsCard';
import { GuestPearChat } from '@/components/pearloom/site/GuestPearChat';
import { PassportSections } from '@/components/pearloom/passport/PassportSections';
import { GuestPhaseStrip } from '@/components/pearloom/passport/GuestPhaseStrip';

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

  // Fetch the guest's existing RSVP from public.guests, if any.
  // pearloom_guests + guests are separate tables — pearloom_guests
  // is the identity/personalization record, guests is the RSVP
  // submission record. They link via (site_id, lower(email)) so
  // a single guest who's both invited and RSVP'd shows up in both.
  type GuestRsvp = {
    status: string | null;
    plus_one: boolean | null;
    plus_one_name: string | null;
    meal_preference: string | null;
    dietary_restrictions: string | null;
    message: string | null;
    responded_at: string | null;
    event_ids: string[] | null;
  };
  let rsvp: GuestRsvp | null = null;
  if (guest.email) {
    const { data: rsvpRow } = await sb()
      .from('guests')
      .select('status, plus_one, plus_one_name, meal_preference, dietary_restrictions, message, responded_at, event_ids')
      .eq('site_id', site.id)
      .eq('email', guest.email)
      .maybeSingle<GuestRsvp>();
    rsvp = rsvpRow ?? null;
  }

  // ── Guest contributions: photos uploaded + gifts claimed ──
  // Photos: tagged by guest_id when /upload?t=token was used.
  // Claims: matched by claimer_email = guest.email.
  // Both feeds power the YourContributionsCard hub.
  type PhotoRow = { id: string; url: string; caption: string | null; status: string; created_at: string };
  type ClaimRow = { id: string; entry_url: string; message: string | null; created_at: string };
  const [photosRes, claimsRes] = await Promise.all([
    sb().from('guest_photos')
      .select('id, url, caption, status, created_at')
      .eq('guest_id', guest.id)
      .order('created_at', { ascending: false })
      .limit(24),
    guest.email
      ? sb().from('registry_link_claims')
          .select('id, entry_url, message, created_at')
          .eq('site_id', site.id)
          .eq('claimer_email', guest.email)
          .is('revoked_at', null)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null as ClaimRow[] | null }),
  ]);
  const photos = (photosRes.data ?? []) as PhotoRow[];
  const claims = (claimsRes.data ?? []) as ClaimRow[];

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
      {/* Year-round phase strip — flips copy + CTAs based on lifecycle
          (upcoming → live → fresh-memory → year-ago → archived). Also
          surfaces day-of push pings + add-to-home-screen + dietary /
          table chips. Mounted above the hero so guests always see
          where they are in the journey. */}
      <GuestPhaseStrip
        eventDateIso={manifest.logistics?.date ?? null}
        firstName={guest.display_name.split(' ')[0]}
        coupleNames={coupleNames.filter(Boolean).join(' & ')}
        venue={manifest.logistics?.venue}
        sitePath={sitePublicUrl}
        rsvpHref={`/rsvp?site=${site.subdomain}&g=${token}`}
        accent={theme?.accent ?? '#5C6B3F'}
        paper={theme?.background ?? '#F5F1E8'}
        ink={theme?.foreground ?? '#0E0D0B'}
        guestToken={token}
        logistics={{
          dietary: Array.isArray(guest.dietary) ? guest.dietary : undefined,
          accessibility: Array.isArray(guest.accessibility) ? guest.accessibility : undefined,
        }}
      />
      <PersonalGuestHero
        guestFirstName={guest.display_name.split(' ')[0]}
        coupleNames={coupleNames}
        heroCopy={personalization.hero_copy}
        accent={theme?.accent ?? '#5C6B3F'}
        headingFont={headingFont}
        eventDate={manifest.logistics?.date ?? ''}
        venue={manifest.logistics?.venue ?? ''}
      />

      {/* "Your RSVP" card + "What you've added" hub. Surfacing
          both at the top makes /g/[token] the personal hub it's
          named for: see what you said, see what you brought. */}
      {(() => {
        // Resolve registry entry URL → label using the manifest's
        // own entries list. Falls back to the URL host when the
        // entry has been removed since the claim landed.
        type RegEntry = { name?: string; label?: string; url?: string };
        const entries: RegEntry[] = (() => {
          const reg = (manifest as unknown as { registry?: unknown }).registry;
          if (Array.isArray(reg)) return reg as RegEntry[];
          if (reg && typeof reg === 'object') {
            const r = reg as { entries?: RegEntry[] };
            return Array.isArray(r.entries) ? r.entries : [];
          }
          return [];
        })();
        const labelFor = (url: string): string => {
          const match = entries.find((e) => e.url === url);
          if (match) return match.name ?? match.label ?? new URL(url).hostname.replace(/^www\./, '');
          try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
        };
        const claimsForCard = claims.map((c) => ({
          id: c.id,
          entryUrl: c.entry_url,
          entryLabel: labelFor(c.entry_url),
          message: c.message,
          createdAt: c.created_at,
        }));
        const photosForCard = photos.map((p) => ({
          id: p.id,
          url: p.url,
          caption: p.caption,
          status: (p.status === 'approved' || p.status === 'rejected' ? p.status : 'pending') as 'approved' | 'rejected' | 'pending',
          createdAt: p.created_at,
        }));
        return (photosForCard.length > 0 || claimsForCard.length > 0) ? (
          <section style={{ padding: '2rem 1.5rem 0', maxWidth: 720, margin: '0 auto' }}>
            <YourContributionsCard
              photos={photosForCard}
              claims={claimsForCard}
              accent={theme?.accent ?? '#5C6B3F'}
              headingFont={headingFont}
            />
          </section>
        ) : null;
      })()}

      <section style={{ padding: '2rem 1.5rem 0', maxWidth: 720, margin: '0 auto' }}>
        <YourRsvpCard
          siteId={site.id}
          guestName={guest.display_name}
          guestEmail={guest.email}
          initialStatus={(rsvp?.status as 'attending' | 'declined' | 'maybe' | 'pending' | null) ?? 'pending'}
          initial={{
            plusOne: rsvp?.plus_one ?? false,
            plusOneName: rsvp?.plus_one_name ?? null,
            mealPreference: rsvp?.meal_preference ?? null,
            dietaryRestrictions: rsvp?.dietary_restrictions ?? null,
            message: rsvp?.message ?? null,
            selectedEventIds: rsvp?.event_ids ?? [],
          }}
          respondedAt={rsvp?.responded_at ?? null}
          events={
            (manifest.events ?? []).map((ev) => ({
              id: ev.id,
              name: ev.name,
              time: ev.time,
            }))
          }
          accent={theme?.accent ?? '#5C6B3F'}
          headingFont={headingFont}
        />
      </section>

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
                      {h.url ? <a href={h.url} style={{ color: theme?.accent ?? '#5C6B3F' }}>{h.name}</a> : h.name}
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
          accent={theme?.accent ?? '#5C6B3F'}
          headingFont={headingFont}
        />
      </section>

      <PassportSections
        token={token}
        accent={theme?.accent ?? '#5C6B3F'}
        headingFont={headingFont}
        occasion={(manifest as unknown as { occasion?: string }).occasion ?? null}
      />

      <section style={{ padding: '0 1.5rem 2rem', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <a
            href={`/rsvp?site=${site.subdomain}&g=${token}`}
            style={{
              padding: '0.85rem 1.5rem',
              background: theme?.accent ?? '#5C6B3F',
              color: theme?.background ?? '#F5F1E8',
              borderRadius: 'var(--pl-radius-full)',
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
              borderRadius: 'var(--pl-radius-full)',
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

      {/* Guest-aware Pear concierge — same chat pill as the public
          site, but Pear now knows the guest's RSVP, seat, and
          dietary so questions like "what time should I get there?"
          land with their personal context baked in. */}
      <GuestPearChat
        manifest={manifest}
        coupleNames={coupleNames}
        guest={{
          name: guest.display_name,
          status: ((rsvp?.status as 'attending' | 'declined' | 'maybe' | null) ?? null) ?? undefined,
          seat: typeof personalization.seat_summary === 'string' && personalization.seat_summary.length < 200
            ? personalization.seat_summary
            : null,
          dietary: Array.isArray(guest.dietary) ? guest.dietary : null,
          selectedEventNames: (() => {
            const ids = rsvp?.event_ids ?? [];
            if (!ids.length) return null;
            const events = manifest.events ?? [];
            return ids
              .map((id) => events.find((e) => e.id === id)?.name)
              .filter((n): n is string => !!n);
          })(),
        }}
      />
    </div>
  );
}
