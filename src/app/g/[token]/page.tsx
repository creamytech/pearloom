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
import { BroadcastBar } from '@/components/pearloom/site/BroadcastBar';
import { DayOfBanner } from '@/components/pearloom/site/DayOfBanner';
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

  // ── Guest contributions: photos + gifts + words ──────────
  // Photos: tagged by guest_id when /upload?t=token was used.
  // Claims: matched by claimer_email = guest.email.
  // Words: memory_prompts / whispers / song_requests /
  // time_capsule rows where guest_id = pearloom_guests.id.
  // All feeds power the YourContributionsCard hub.
  type PhotoRow = { id: string; url: string; caption: string | null; status: string; created_at: string };
  type ClaimRow = { id: string; entry_url: string; message: string | null; created_at: string };
  type MemoryRow = { id: string; prompt: string; response: string | null; responded_at: string | null; created_at: string };
  type WhisperRow = { id: string; body: string; created_at: string };
  type SongRow = { id: string; song_title: string; artist: string | null; note: string | null; created_at: string };
  type CapsuleRow = { id: string; body: string; reveal_years: number; created_at: string };
  type GuestbookRow = { id: string; message: string; created_at: string };
  const [photosRes, claimsRes, memoriesRes, whispersRes, songsRes, capsuleRes, gbRes] = await Promise.all([
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
    // Memory prompts only count if the guest actually responded.
    sb().from('memory_prompts')
      .select('id, prompt, response, responded_at, created_at')
      .eq('guest_id', guest.id)
      .not('response', 'is', null)
      .order('responded_at', { ascending: false })
      .limit(12),
    sb().from('whispers')
      .select('id, body, created_at')
      .eq('guest_id', guest.id)
      .order('created_at', { ascending: false })
      .limit(12),
    // Song requests with state != hidden so post-moderation
    // removals don't surface back to the guest as if they were
    // still in the queue.
    sb().from('song_requests')
      .select('id, song_title, artist, note, created_at, state')
      .eq('guest_id', guest.id)
      .neq('state', 'hidden')
      .order('created_at', { ascending: false })
      .limit(12),
    sb().from('time_capsule')
      .select('id, body, reveal_years, created_at')
      .eq('guest_id', guest.id)
      .order('created_at', { ascending: false })
      .limit(8),
    // Guestbook entries the guest signed since the 2026-04-29
    // attribution migration. Older deployments may not have
    // guest_id on guestbook yet — the .eq just returns empty.
    sb().from('guestbook')
      .select('id, message, created_at')
      .eq('guest_id', guest.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);
  const photos = (photosRes.data ?? []) as PhotoRow[];
  const claims = (claimsRes.data ?? []) as ClaimRow[];
  const memories = (memoriesRes.data ?? []) as MemoryRow[];
  const whispers = (whispersRes.data ?? []) as WhisperRow[];
  const songs = ((songsRes.data ?? []) as Array<SongRow & { state?: string }>);
  const capsules = (capsuleRes.data ?? []) as CapsuleRow[];
  const guestbookEntries = (gbRes.data ?? []) as GuestbookRow[];

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

  /* Themed surface — same data-attribute contract as
     ThemedSiteRenderer so all per-edition / per-texture / per-
     kit CSS already shipped applies here. The guest page is the
     personal hub but it should LOOK like the site it belongs
     to. */
  const edition = (manifest as unknown as { edition?: string }).edition ?? 'almanac';
  const texture = (manifest as unknown as { texture?: string }).texture ?? 'smooth';
  const density = (manifest as unknown as { density?: string }).density ?? 'comfortable';
  const kitId = (manifest as unknown as { kitId?: string }).kitId ?? 'classic';
  const peachInk = '#C6703D';
  const inkMuted = '#6F6557';
  const inkSoft = '#3A332C';

  return (
    <div
      className="pl8-guest"
      data-pl-edition={edition}
      data-pl-texture={texture}
      data-pl-density={density}
      data-pl-kit={kitId}
      style={{
        minHeight: '100vh',
        background: theme?.background ?? '#F5EFE2',
        color: theme?.foreground ?? '#0E0D0B',
        fontFamily: bodyFont,
      }}
    >
      {/* Day-of banner + host's broadcast bar at the very top so a
          guest who lands on their personal page during the event
          gets the live state without having to navigate to the
          public site. The day-of banner self-hides when the event
          isn't today; broadcast bar only renders when the host has
          posted a recent live update. */}
      <DayOfBanner manifest={manifest} />
      <BroadcastBar subdomain={site.subdomain} />

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
        // Build the unified "Words you wrote" feed by merging all
        // four guest-keyed text tables into one ContribMoment[]
        // sorted newest-first. Empty bodies (e.g. song requests
        // with no note) still surface — the heading carries the
        // signal in those cases.
        const momentsForCard = [
          ...memories.map((m) => ({
            id: m.id,
            kind: 'memory' as const,
            heading: m.prompt,
            body: m.response ?? '',
            createdAt: m.responded_at ?? m.created_at,
          })),
          ...whispers.map((w) => ({
            id: w.id,
            kind: 'whisper' as const,
            heading: 'You whispered to the couple',
            body: w.body,
            createdAt: w.created_at,
          })),
          ...songs.map((s) => ({
            id: s.id,
            kind: 'song' as const,
            heading: s.artist ? `${s.song_title} — ${s.artist}` : s.song_title,
            body: s.note ?? '',
            createdAt: s.created_at,
          })),
          ...capsules.map((c) => ({
            id: c.id,
            kind: 'timeCapsule' as const,
            heading: `For ${c.reveal_years === 1 ? 'their first anniversary' : `their ${c.reveal_years}-year anniversary`}`,
            body: c.body,
            createdAt: c.created_at,
          })),
          ...guestbookEntries.map((g) => ({
            id: g.id,
            kind: 'guestbook' as const,
            heading: 'You signed the guestbook',
            body: g.message,
            createdAt: g.created_at,
          })),
        ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return (photosForCard.length > 0 || claimsForCard.length > 0 || momentsForCard.length > 0) ? (
          <section style={{ padding: '2rem 1.5rem 0', maxWidth: 720, margin: '0 auto' }}>
            <YourContributionsCard
              photos={photosForCard}
              claims={claimsForCard}
              moments={momentsForCard}
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

      <section style={{ padding: 'calc(48px * var(--pl-density-scale, 1)) 24px', maxWidth: 760, margin: '0 auto' }}>
        {personalization.chapter_highlights.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            {/* Editorial section head — eyebrow + display title with
                italic accent, matching ThemedSectionHead in the
                themed renderer. */}
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div
                className="eyebrow"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: peachInk,
                  marginBottom: 10,
                }}
              >
                Just for you
              </div>
              <h2
                style={{
                  fontFamily: headingFont,
                  fontSize: 'clamp(28px, 4cqw, 40px)',
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.04,
                  letterSpacing: '-0.015em',
                }}
              >
                Chapters with you in{' '}
                <span style={{ fontStyle: 'italic', color: inkSoft }}>them</span>
              </h2>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 14 }}>
              {personalization.chapter_highlights.map((h, i) => {
                const chapter = manifest.chapters?.find((c) => c.id === h.chapterId);
                const numeral = ['I', 'II', 'III', 'IV', 'V', 'VI'][i] ?? String(i + 1);
                return (
                  <li
                    key={h.chapterId}
                    style={{
                      padding: '18px 22px',
                      background: theme?.cardBg ?? '#FBF7EE',
                      borderRadius: 'var(--pl-card-radius, 12px)',
                      border: `1px solid ${theme?.accentLight ?? 'rgba(14,13,11,0.08)'}`,
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr',
                      gap: 14,
                      alignItems: 'baseline',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        fontFamily: headingFont,
                        fontStyle: 'italic',
                        fontWeight: 400,
                        fontSize: 18,
                        color: peachInk,
                        opacity: 0.85,
                      }}
                    >
                      {numeral}.
                    </span>
                    <div>
                      <div
                        className="eyebrow"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: inkMuted,
                          marginBottom: 6,
                        }}
                      >
                        {chapter?.title || 'A chapter'}
                      </div>
                      <div style={{ fontSize: 14.5, lineHeight: 1.65, color: inkSoft }}>
                        {h.whyTheyreMentioned}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18, marginBottom: 44 }}>
          {/* Seat card — peach icon disc + eyebrow + display seat */}
          <div
            style={{
              padding: '22px 22px',
              background: theme?.cardBg ?? '#FBF7EE',
              borderRadius: 'var(--pl-card-radius, 14px)',
              border: `1px solid ${theme?.accentLight ?? 'rgba(14,13,11,0.08)'}`,
              display: 'grid',
              gridTemplateColumns: '52px 1fr',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(198,112,61,0.10)',
                display: 'grid',
                placeItems: 'center',
                fontFamily: headingFont,
                fontStyle: 'italic',
                fontSize: 26,
                color: peachInk,
              }}
            >
              ✦
            </div>
            <div>
              <div
                className="eyebrow"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: peachInk,
                  marginBottom: 6,
                }}
              >
                Your seat
              </div>
              <div
                style={{
                  fontFamily: headingFont,
                  fontSize: 17,
                  fontWeight: 600,
                  color: theme?.foreground ?? '#0E0D0B',
                  lineHeight: 1.45,
                  letterSpacing: '-0.01em',
                }}
              >
                {personalization.seat_summary}
              </div>
            </div>
          </div>

          {(personalization.travel_tips.nearestAirport || personalization.travel_tips.recommendedHotels?.length) && (
            <div
              style={{
                padding: '22px 22px',
                background: theme?.cardBg ?? '#FBF7EE',
                borderRadius: 'var(--pl-card-radius, 14px)',
                border: `1px solid ${theme?.accentLight ?? 'rgba(14,13,11,0.08)'}`,
              }}
            >
              <div
                className="eyebrow"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: peachInk,
                  marginBottom: 10,
                }}
              >
                Getting here from {guest.home_city ?? 'home'}
              </div>
              {personalization.travel_tips.nearestAirport && (
                <div
                  style={{
                    fontFamily: headingFont,
                    fontSize: 17,
                    fontWeight: 600,
                    color: theme?.foreground ?? '#0E0D0B',
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}
                >
                  {personalization.travel_tips.nearestAirport}
                  {personalization.travel_tips.driveTime && (
                    <span style={{ fontStyle: 'italic', color: inkSoft, fontWeight: 400, fontSize: 14 }}>
                      {' — '}{personalization.travel_tips.driveTime}
                    </span>
                  )}
                </div>
              )}
              {personalization.travel_tips.recommendedHotels?.length ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0', fontSize: 13.5, lineHeight: 1.6 }}>
                  {personalization.travel_tips.recommendedHotels.map((h, i) => (
                    <li key={i} style={{ margin: '4px 0', color: inkSoft }}>
                      {h.url ? (
                        <a
                          href={h.url}
                          style={{ color: peachInk, fontWeight: 600, textDecoration: 'none', borderBottom: `1px dotted ${peachInk}` }}
                        >
                          {h.name}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{h.name}</span>
                      )}
                      {h.note && <span style={{ color: inkMuted }}> — {h.note}</span>}
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

      <section style={{ padding: '0 24px 32px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          {/* Primary CTA — peach pill (prototype's primary affordance
              treatment) so it stands out against the host's accent. */}
          <a
            href={`/rsvp?site=${site.subdomain}&g=${token}`}
            style={{
              padding: '13px 26px',
              background: peachInk,
              color: '#FBF7EE',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 700,
              letterSpacing: '0.02em',
              textDecoration: 'none',
            }}
          >
            RSVP now →
          </a>
          <a
            href={sitePublicUrl}
            style={{
              padding: '13px 26px',
              background: 'transparent',
              color: theme?.foreground ?? '#0E0D0B',
              borderRadius: 999,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid rgba(14,13,11,0.16)',
            }}
          >
            See the full site →
          </a>
        </div>
      </section>

      {/* Editorial footer — gold hairline → italic display name →
          colophon. Matches ThemedFooter so the guest page closes
          the same way the public site does. */}
      <footer style={{ padding: '48px 24px 36px', textAlign: 'center', background: theme?.background ?? '#F5EFE2' }}>
        <div
          aria-hidden
          style={{
            width: 180,
            height: 1,
            margin: '0 auto 24px',
            background: 'linear-gradient(90deg, transparent, #B8935A 50%, transparent)',
            opacity: 0.6,
          }}
        />
        <span
          style={{
            fontFamily: headingFont,
            fontStyle: 'italic',
            fontSize: 20,
            fontWeight: 500,
            color: theme?.foreground ?? '#0E0D0B',
            letterSpacing: '-0.01em',
          }}
        >
          Personalized for {guest.display_name}
        </span>
        <div
          style={{
            marginTop: 14,
            fontSize: 11,
            color: inkMuted,
            fontStyle: 'italic',
          }}
        >
          woven on{' '}
          <a href="https://pearloom.com" style={{ color: 'inherit', textDecoration: 'none', borderBottom: '1px dotted currentColor' }}>
            Pearloom
          </a>
        </div>
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
