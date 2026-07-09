'use client';

/* eslint-disable no-restricted-syntax */
/* SharePanel — the host's share workspace.
     - Inline ShareCardMock preview (always renders, no /api/og
       round-trip). Mirrors how the link reads in iMessage / Slack.
     - Quick-share row — direct-to-platform intents (iMessage /
       WhatsApp / Email / X / Copy).
     - Branded QR with the couple's initials in the center, theme
       colors, optional circular tile. Replaces the qrserver.com
       image with an inline SVG.
     - Custom share message field — what guests see as the link's
       blurb when pasted.
     - Co-host invite (unchanged from before). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { WeaveLoader } from '@/components/brand/WeaveLoader';
import { availableLocales } from '@/lib/i18n/apply-locale';
import { TRANSLATABLE_LOCALES, localeEnglishName } from '@/lib/i18n/locales';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell } from './_section-atoms';
import { buildSiteUrl, formatSiteDisplayUrl, type SiteOccasion } from '@/lib/site-urls';
import { BrandedQR, useBrandedQrPng } from './BrandedQR';
import { deriveInitials } from '../../site/Monogram';
import { resolveArrivalStyle, type ArrivalStyle } from '../../site/ArrivalReveal';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';
import { pearErrorMessage } from '../../redesign/PearAssist';
import { suiteThemeFromManifest } from '@/lib/suite/theme';
import {
  SHARE_KIT_SIZES,
  drawShareKitCanvas,
  downloadCanvasPng,
  ensureSuiteFonts,
} from './share-kit';

type QrTone = 'ink' | 'accent' | 'gold' | 'plum';

const QR_TONES: Array<{ id: QrTone; label: string; dark: string; accent: string }> = [
  { id: 'ink',    label: 'Ink',    dark: 'var(--ink, #0E0D0B)',     accent: 'var(--peach-ink, #C6703D)' },
  { id: 'accent', label: 'Sage',   dark: 'var(--sage-deep, #3D4A1F)', accent: 'var(--peach-ink, #C6703D)' },
  { id: 'gold',   label: 'Gold',   dark: '#7A5D2A',                  accent: 'var(--peach-ink, #C6703D)' },
  { id: 'plum',   label: 'Plum',   dark: '#5C3A4E',                  accent: 'var(--peach-ink, #C6703D)' },
];

export function SharePanel({
  manifest, siteSlug, focus,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  /** 'cohost' renders ONLY the co-host manager (its own rail tool);
   *  undefined renders the share workspace WITHOUT co-host (it lives
   *  in its own tool now). */
  focus?: 'cohost';
}) {
  const occasion = ((manifest as unknown as { occasion?: SiteOccasion }).occasion);
  /* buildSiteUrl's 3rd param is ORIGIN, occasion is 4th — passing
     occasion as origin yielded 'anniversary/sites/slug' (no scheme,
     wrong path shape) in every share intent, the QR code, and the
     copy button. */
  const siteUrl = buildSiteUrl(siteSlug, '', undefined, occasion);
  const prettyUrl = formatSiteDisplayUrl(siteSlug, '', occasion);
  const [copied, setCopied] = useState<string | null>(null);
  const [coHostEmail, setCoHostEmail] = useState('');
  /* Phone channel — we mint the key, the host texts it from their
     own Messages. No SMS provider, nothing to configure; the link
     is the credential (accept binds to whoever signs in with it). */
  const [coHostChannel, setCoHostChannel] = useState<'email' | 'sms'>('email');
  const [coHostPhone, setCoHostPhone] = useState('');
  const [keyCard, setKeyCard] = useState<{ acceptUrl: string; phone: string; sent: boolean } | null>(null);
  const [coHostRole, setCoHostRole] = useState<'editor' | 'guest-manager' | 'viewer'>('editor');
  const [coHostBusy, setCoHostBusy] = useState(false);
  const [coHostMsg, setCoHostMsg] = useState<string | null>(null);
  /* Account recognition — as the host types an invitee email, probe
     whether it's already a Pearloom user. A match invites them
     directly (in-app notification + dashboard banner); a miss emails
     them to set up an account. Owner-gated server-side. */
  const [coHostMatch, setCoHostMatch] = useState<{ exists: boolean; displayName?: string | null; self?: boolean } | null>(null);
  useEffect(() => {
    if (coHostChannel !== 'email') { setCoHostMatch(null); return; }
    const e = coHostEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setCoHostMatch(null); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/co-host/lookup?email=${encodeURIComponent(e)}&siteSlug=${encodeURIComponent(siteSlug)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { exists?: boolean; displayName?: string | null; self?: boolean } | null) => {
          if (d) setCoHostMatch({ exists: !!d.exists, displayName: d.displayName ?? null, self: !!d.self });
        })
        .catch(() => { /* recognition is a nicety */ });
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [coHostEmail, coHostChannel, siteSlug]);
  /* Collaborator roster — active cohosts + pending invites for the
     manage list below the composer. Owner-gated server-side. */
  const [roster, setRoster] = useState<{
    active: Array<{ email: string; role: string; joined_at?: string }>;
    pending: Array<{ token: string; role: string; invited_email?: string | null; expires_at?: string }>;
  } | null>(null);
  const refreshRoster = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/co-host?subdomain=${encodeURIComponent(siteSlug)}`);
      if (!res.ok) return; // non-owners just don't see the list
      setRoster(await res.json());
    } catch { /* roster is a nicety */ }
  }, [siteSlug]);
  useEffect(() => { void refreshRoster(); }, [refreshRoster]);
  const revoke = useCallback(async (body: { email?: string; token?: string }) => {
    try {
      await fetch('/api/sites/co-host', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, ...body }),
      });
      void refreshRoster();
    } catch { /* refresh next open */ }
  }, [siteSlug, refreshRoster]);

  const [a, b] = manifest.names ?? ['', ''];
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const headline = [a, b].filter(Boolean).join(' & ') || 'Your site';
  /* Solo honoree — one initial on the share card + QR, even when the
     name is a multi-word full name. */
  const { initA, initB } = deriveInitials(headline, { solo: isSoloSubject(manifest) });
  const monogramLetters = `${initA}${initB}`;

  /* SharePanel doesn't accept an onChange prop today — we write
     through window.__plPearApply which EditorRedesign mounts on
     the window. Keeps SharePanel's prop surface narrow while
     still letting the host edit share-card copy + QR tone. */
  const onChange = (next: StoryManifest) => {
    if (typeof window === 'undefined') return;
    const apply = (window as unknown as { __plPearApply?: (m: StoryManifest) => void }).__plPearApply;
    apply?.(next);
  };
  const loose = manifest as unknown as { copy?: Record<string, string> };
  const blurb = loose.copy?.shareBlurb
    ?? defaultBlurb(occasion, headline, date, venue);

  /* QR tone preference (manifest.copy.qrTone) + shape. */
  const qrToneId: QrTone = (loose.copy?.qrTone as QrTone | undefined) ?? 'ink';
  const qrShape: 'square' | 'circle' = (loose.copy?.qrShape as 'square' | 'circle' | undefined) ?? 'square';
  const qrShowMono: boolean = (loose.copy?.qrShowMono as string | undefined) !== '0';
  const qrTone = QR_TONES.find((t) => t.id === qrToneId) ?? QR_TONES[0];

  function setQrTone(id: QrTone) {
    onChange({ ...(manifest as unknown as Record<string, unknown>), copy: { ...(loose.copy ?? {}), qrTone: id } } as unknown as StoryManifest);
  }
  function setQrShape(s: 'square' | 'circle') {
    onChange({ ...(manifest as unknown as Record<string, unknown>), copy: { ...(loose.copy ?? {}), qrShape: s } } as unknown as StoryManifest);
  }
  function setQrShowMono(on: boolean) {
    onChange({ ...(manifest as unknown as Record<string, unknown>), copy: { ...(loose.copy ?? {}), qrShowMono: on ? '1' : '0' } } as unknown as StoryManifest);
  }

  const svgRef = useRef<SVGSVGElement | null>(null);
  const { download, pending: downloading } = useBrandedQrPng(svgRef, 5);

  function copy(key: string, value: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied((cur) => cur === key ? null : cur), 1800);
  }

  /* Pre-built share intent URLs — direct deep-links into each
     platform's "compose message with this link" UI. iMessage uses
     `sms:` (mobile only); we fall through to copying the link on
     desktop so the button isn't a dead-end. WhatsApp uses
     `wa.me`, X uses `x.com/intent/post`. */
  const composed = `${blurb} ${siteUrl}`;
  const composedEnc = encodeURIComponent(composed);
  /* iMessage gets the URL ALONE: iOS only renders the big rich
     link card when the URL is the entire message — text + link in
     one bubble collapses to a bare domain pill. The share card
     already carries the names, date, and photo, so nothing is
     lost. WhatsApp / Email / X unfurl fine alongside the blurb. */
  const intents = useMemo(() => [
    { id: 'imessage',  label: 'iMessage', icon: 'phone' as const, href: `sms:?&body=${encodeURIComponent(siteUrl)}` },
    { id: 'whatsapp',  label: 'WhatsApp', icon: 'send' as const,  href: `https://wa.me/?text=${composedEnc}` },
    { id: 'email',     label: 'Email',    icon: 'mail' as const,  href: `mailto:?subject=${encodeURIComponent(`${headline}`)}&body=${composedEnc}` },
    { id: 'x',         label: 'X',        icon: 'share' as const, href: `https://x.com/intent/post?text=${composedEnc}` },
  ], [composedEnc, headline, siteUrl]);

  async function inviteCoHost() {
    const bySms = coHostChannel === 'sms';
    if (bySms ? coHostPhone.replace(/\D/g, '').length < 7 : !coHostEmail.trim()) return;
    if (coHostBusy) return;
    setCoHostBusy(true); setCoHostMsg(null); setKeyCard(null);
    try {
      const res = await fetch('/api/co-host/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          bySms
            ? { siteSlug, phone: coHostPhone.trim(), role: coHostRole }
            : { siteSlug, email: coHostEmail.trim(), role: coHostRole },
        ),
      });
      const j = await res.json().catch(() => ({})) as { error?: string; acceptUrl?: string; sent?: boolean };
      if (!res.ok) {
        console.error('[share] co-host invite failed:', res.status);
        throw new Error(j.error ?? 'Couldn’t send the invite, try again?');
      }
      if (bySms && j.acceptUrl) {
        setKeyCard({ acceptUrl: j.acceptUrl, phone: coHostPhone.trim(), sent: !!j.sent });
        setCoHostPhone('');
      } else {
        const who = coHostMatch?.exists && coHostMatch.displayName ? coHostMatch.displayName : coHostEmail.trim();
        setCoHostMsg(
          coHostMatch?.exists
            ? `Invited ${who}, they’ll see it on their dashboard.`
            : `We emailed ${coHostEmail.trim()} an invite to join Pearloom.`,
        );
        setCoHostEmail('');
        setCoHostMatch(null);
      }
      void refreshRoster();
    } catch (e) {
      setCoHostMsg(pearErrorMessage(e, 'Couldn’t send the invite, try again?'));
    } finally {
      setCoHostBusy(false);
    }
  }

  /* The prewritten text — names the site, hands over the key. */
  const keySmsBody = keyCard
    ? `You're invited to help shape ${headline}'s site on Pearloom, here's your key: ${keyCard.acceptUrl}`
    : '';

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {focus !== 'cohost' && (<>
        {/* Share card preview — inline mock that always renders.
            Replaces the broken /api/og <img> from the previous
            version. Looks like the real link unfurl in iMessage /
            Slack but doesn't round-trip to the network. */}
        <FGroup label="Share card preview" hint="What people see when you paste the link into iMessage, WhatsApp, Slack, email, anywhere a link unfurls.">
          <ShareCardMock
            headline={headline}
            date={date}
            venue={venue}
            prettyUrl={prettyUrl}
            blurb={blurb}
            monogram={monogramLetters}
          />
        </FGroup>

        {/* Custom share message — host can override the auto-derived
            blurb. Optional; falls back to a per-occasion default. */}
        <FGroup label="Share message" hint="Optional, the blurb that appears alongside your link in chat apps and emails. Default is an auto-line based on your event.">
          <FInput
            value={loose.copy?.shareBlurb ?? ''}
            onChange={(v) => {
              onChange({
                ...(manifest as unknown as Record<string, unknown>),
                copy: {
                  ...(loose.copy ?? {}),
                  ...(v.trim() ? { shareBlurb: v } : { shareBlurb: undefined }),
                },
              } as unknown as StoryManifest);
            }}
            placeholder={defaultBlurb(occasion, headline, date, venue)}
          />
        </FGroup>

        {/* Quick-share row — direct intents to chat / email / X. */}
        <FGroup label="Send it" hint="Drop the link straight into your favorite app, message pre-filled.">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
          }}>
            {intents.map((i) => (
              <a
                key={i.id}
                href={i.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share via ${i.label}`}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 4px',
                  borderRadius: 12,
                  background: 'var(--cream-2)',
                  border: '1px solid var(--line)',
                  fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 140ms, border-color 140ms, transform 140ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--peach-ink)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Icon name={i.icon} size={16} color="var(--ink)" />
                {i.label}
              </a>
            ))}
          </div>
        </FGroup>

        {/* Arrival — how the link opens the first time a guest taps
            it (ArrivalReveal on the published site). */}
        <FGroup
          label="Arrival"
          hint="The first time a guest opens your link, the site can arrive like mail, a sealed envelope they tap open (addressed to them when they use their personal link), or a quiet thread reveal. Once per guest; reduced-motion visitors always skip it."
        >
          <ArrivalPicker manifest={manifest} onChange={onChange} />
        </FGroup>

        {/* Share kit — pre-sized themed images, drawn locally from
            the SuiteTheme contract (Suite Phase 5). No server hop. */}
        <FGroup
          label="Share kit"
          hint="Three ready-to-post images in your site's exact theme, Story for Instagram, Square for the grid, Banner for group chats and emails. Drawn on your device; nothing uploads."
        >
          <ShareKitStrip manifest={manifest} siteSlug={siteSlug} />
        </FGroup>

        {/* Site URL */}
        <FGroup label="Site URL">
          <button
            type="button"
            onClick={() => copy('url', siteUrl)}
            style={{
              padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--line)', background: 'var(--cream-2)',
              fontSize: 13, color: 'var(--ink)', textAlign: 'left',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'border-color 140ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          >
            <Icon name="link" size={13} color="var(--ink-muted)" />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {prettyUrl}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: copied === 'url' ? 'var(--sage-deep)' : 'var(--ink-muted)',
              transition: 'color 200ms',
            }}>
              {copied === 'url' ? '✓ Copied' : 'Copy'}
            </span>
          </button>
        </FGroup>

        {/* Branded QR + tone + shape + monogram toggle. */}
        <FGroup label="QR code" hint="Drop on a printed card, a welcome sign, or as a phone wallpaper. Scans even with your initials over the middle (error correction H).">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 18, borderRadius: 14,
            background: 'var(--cream)',
            border: '1px solid var(--line)',
          }}>
            <BrandedQRWithRef
              ref={svgRef}
              value={siteUrl}
              size={200}
              initials={qrShowMono ? monogramFormatted(initA, initB) : ''}
              dark={qrTone.dark}
              light="var(--cream, #FBF7EE)"
              accent={qrTone.accent}
              shape={qrShape}
            />
          </div>

          {/* Tone row. */}
          <div style={{ marginTop: 10, display: 'flex', gap: 4, padding: 3, background: 'var(--cream-2)', borderRadius: 999 }}>
            {QR_TONES.map((t) => {
              const on = t.id === qrToneId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQrTone(t.id)}
                  aria-pressed={on}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: 999,
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink-soft)',
                    border: 0, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Shape + monogram toggle row. */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--cream-2)', borderRadius: 999 }}>
              {(['square', 'circle'] as const).map((s) => {
                const on = s === qrShape;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQrShape(s)}
                    aria-pressed={on}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 999,
                      background: on ? 'var(--ink)' : 'transparent',
                      color: on ? 'var(--cream)' : 'var(--ink-soft)',
                      border: 0, cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600,
              cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={qrShowMono}
                onChange={(e) => setQrShowMono(e.target.checked)}
                style={{ accentColor: 'var(--peach-ink)' }}
              />
              Show monogram
            </label>
          </div>

          <button
            type="button"
            onClick={() => download(`${siteSlug}-qr.png`)}
            disabled={downloading}
            style={{
              marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              background: 'transparent', border: '1px solid var(--line)',
              fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)',
              cursor: downloading ? 'wait' : 'pointer', alignSelf: 'flex-start',
              fontFamily: 'inherit',
            }}
          >
            <Icon name="arrow-down" size={11} color="var(--ink-soft)" />
            {downloading ? 'Exporting…' : 'Download as PNG'}
          </button>
        </FGroup>

        {/* Guestbook — opt-in section on the published site where
            guests leave a wish. Writes manifest.features.guestbook;
            the renderer mounts GuestbookSection before the footer. */}
        <FGroup label="Guestbook" hint="Add a guestbook to your site, guests leave a wish, everyone reads the wall. You'll get a notification each time someone signs.">
          <FToggleStandalone
            label="Show a guestbook on the site"
            def={((manifest as unknown as { features?: { guestbook?: boolean } }).features?.guestbook) === true}
            onChange={(v) => {
              const loose2 = manifest as unknown as { features?: Record<string, unknown> };
              onChange({
                ...(manifest as unknown as Record<string, unknown>),
                features: { ...(loose2.features ?? {}), guestbook: v },
              } as unknown as StoryManifest);
            }}
          />
        </FGroup>

        {/* Languages — offer the whole site in another language. Pear
            translates the story + details; guests pick their language
            from a switcher on the published site. */}
        <FGroup
          label="Languages"
          hint="Offer your site in another language. Pear translates your story and details; guests switch languages from a small menu on the site. Names and places stay as you wrote them."
        >
          <LanguagesSection manifest={manifest} onChange={onChange} />
        </FGroup>

        {/* Bulk invite handoff. */}
        <FGroup label="Send the invite" hint="Use the Guests panel to add people first, then send.">
          <a
            href={`/dashboard/invite?site=${encodeURIComponent(siteSlug)}`}
            className="pl-pearl-accent"
            style={{
              padding: '12px 18px', borderRadius: 999,
              fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              textDecoration: 'none',
            }}
          >
            Open invite composer <Icon name="arrow-right" size={13} color="var(--peach-ink)" />
          </a>
        </FGroup>

        {/* Co-host invite — extends edit access. Email sends a
            magic link; phone mints "the key" and opens the host's
            own Messages with it prewritten. */}
        </>)}
        {focus === 'cohost' && (<>
        <FGroup label="Invite a co-host" hint="Email sends them a magic link. Text mints the key and opens your Messages, you send it, they tap it.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {([['email', 'By email'], ['sms', 'By text']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setCoHostChannel(id); setCoHostMsg(null); }}
                  aria-pressed={coHostChannel === id}
                  style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    border: coHostChannel === id ? '1px solid var(--ink)' : '1px solid var(--line)',
                    background: coHostChannel === id ? 'var(--ink)' : 'transparent',
                    color: coHostChannel === id ? 'var(--cream)' : 'var(--ink-soft)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {coHostChannel === 'email' ? (
              <>
                <FInput
                  value={coHostEmail}
                  onChange={setCoHostEmail}
                  icon="mail"
                  type="email"
                  placeholder="partner@example.com"
                />
                {coHostMatch && !coHostMatch.self && (
                  <div
                    style={{
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      padding: '7px 10px',
                      borderRadius: 9,
                      background: coHostMatch.exists ? 'var(--sage-tint, rgba(122,138,79,0.12))' : 'var(--cream-2)',
                      border: `1px solid ${coHostMatch.exists ? 'rgba(92,107,63,0.28)' : 'var(--line-soft)'}`,
                      color: 'var(--ink-soft)',
                    }}
                  >
                    {coHostMatch.exists ? (
                      <>
                        <span style={{ fontWeight: 700, color: 'var(--sage-deep, #5C6B3F)' }}>
                          ✓ {coHostMatch.displayName || 'They’re'} on Pearloom.
                        </span>{' '}
                        Invite them directly, they’ll get a notification and a banner on their dashboard.
                      </>
                    ) : (
                      <>New to Pearloom, we’ll email them an invite to set up an account and join.</>
                    )}
                  </div>
                )}
                {coHostMatch?.self && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', padding: '2px 2px' }}>
                    That’s your own address, invite a different email.
                  </div>
                )}
              </>
            ) : (
              <FInput
                value={coHostPhone}
                onChange={setCoHostPhone}
                icon="phone"
                type="tel"
                placeholder="(555) 010-1234"
              />
            )}
            <div style={{ display: 'flex', gap: 5 }}>
              {([['editor', 'Co-editor'], ['guest-manager', 'Guest manager'], ['viewer', 'Viewer']] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCoHostRole(id)}
                  aria-pressed={coHostRole === id}
                  style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    border: coHostRole === id ? '1px solid var(--ink)' : '1px solid var(--line)',
                    background: coHostRole === id ? 'var(--ink)' : 'transparent',
                    color: coHostRole === id ? 'var(--cream)' : 'var(--ink-soft)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {(() => {
              const ready = coHostChannel === 'sms'
                ? coHostPhone.replace(/\D/g, '').length >= 7
                : !!coHostEmail.trim();
              return (
                <button
                  type="button"
                  onClick={inviteCoHost}
                  disabled={!ready || coHostBusy}
                  style={{
                    padding: '8px 14px', borderRadius: 999,
                    background: 'var(--cream-2)', border: '1px solid var(--line)',
                    fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
                    cursor: ready && !coHostBusy ? 'pointer' : 'not-allowed',
                    opacity: ready && !coHostBusy ? 1 : 0.55,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {coHostBusy ? 'Sending…' : coHostChannel === 'sms' ? 'Get a link' : 'Send invite'}
                </button>
              );
            })()}
            {/* THE KEY — a phone invite's handoff moment. Glass
                pane with the link + one tap into Messages with the
                text prewritten. The link expires in 14 days and
                binds to whoever signs in with it. */}
            {keyCard && (
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 14,
                  padding: '14px 14px 12px',
                  background: 'var(--pl-glass)',
                  backgroundImage: 'var(--pl-glass-sheen)',
                  backdropFilter: 'var(--pl-glass-blur, blur(16px) saturate(1.4))',
                  WebkitBackdropFilter: 'var(--pl-glass-blur, blur(16px) saturate(1.4))',
                  border: '1px solid var(--pl-glass-border)',
                  boxShadow: 'var(--pl-glass-shadow)',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  The key · expires in 14 days
                </div>
                <div style={{ fontFamily: 'var(--font-display, Fraunces, serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', margin: '4px 0 2px' }}>
                  {keyCard.sent ? 'Sent, it’s in their messages.' : 'Ready to hand over.'}
                </div>
                {keyCard.sent && (
                  <div style={{ fontSize: 11.5, color: 'var(--sage-deep)', marginBottom: 2 }}>
                    ✓ Texted to {keyCard.phone}, the buttons below are your backup.
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-soft)', wordBreak: 'break-all', marginBottom: 10 }}>
                  {keyCard.acceptUrl}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <a
                    href={`sms:${keyCard.phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(keySmsBody)}`}
                    style={{
                      padding: '8px 16px', borderRadius: 999,
                      background: 'var(--ink)', color: 'var(--cream)',
                      fontSize: 12, fontWeight: 700, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Icon name="phone" size={12} color="var(--cream)" /> Text it now
                  </a>
                  <button
                    type="button"
                    onClick={() => copy('cohost-key', keyCard.acceptUrl)}
                    style={{
                      padding: '8px 14px', borderRadius: 999,
                      background: 'transparent', border: '1px solid var(--line)',
                      fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {copied === 'cohost-key' ? '✓ Copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyCard(null)}
                    style={{
                      padding: '8px 10px', borderRadius: 999, border: 'none',
                      background: 'transparent', fontSize: 12, fontWeight: 600,
                      color: 'var(--ink-muted)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
            {coHostMsg && (
              <div style={{
                fontSize: 11, color: 'var(--sage-deep)',
                background: 'var(--sage-bg)',
                padding: '6px 10px', borderRadius: 8,
              }}>
                {coHostMsg}
              </div>
            )}
            {/* Roster — who already has access + invites in flight. */}
            {roster && (roster.active.length > 0 || roster.pending.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {roster.active.map((c) => (
                  <div key={c.email} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'var(--cream-2)', fontSize: 11.5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{c.email}</span>
                    <span style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>{c.role}</span>
                    <button type="button" onClick={() => void revoke({ email: c.email })} style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Remove
                    </button>
                  </div>
                ))}
                {roster.pending.map((inv) => (
                  <div key={inv.token} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, border: '1px dashed var(--line)', fontSize: 11.5 }}>
                    <span style={{ color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                      {inv.invited_email || 'Invite link'} · awaiting accept
                    </span>
                    <span style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>{inv.role}</span>
                    <button type="button" onClick={() => void revoke({ token: inv.token })} style={{ border: 'none', background: 'transparent', color: 'var(--ink-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FGroup>
        </>)}
      </div>
    </SectionPanelShell>
  );
}

/* ─── ShareKitStrip — three themed downloadables (Square 1080²,
   Story 1080×1920, Banner 1600×900) drawn client-side onto
   canvases from suiteThemeFromManifest. Previews ARE the export
   canvases (full-res, CSS-scaled), so download is instant —
   toBlob on the already-drawn pixels. Redraws on mount + when
   the theme-relevant slice of the manifest changes (debounced).
   No PearThinking — this is instant local work; a tiny
   'Drawing…' veil covers the font-load beat. ───────────────── */
function ShareKitStrip({ manifest, siteSlug }: { manifest: StoryManifest; siteSlug: string }) {
  const suite = useMemo(() => suiteThemeFromManifest(manifest), [manifest]);
  const suiteRef = useRef(suite);
  useEffect(() => { suiteRef.current = suite; }, [suite]);

  /* Only the inputs the painter reads — manifest identity churns
     on every keystroke; this key doesn't. */
  const themeKey = useMemo(() => JSON.stringify([
    suite.palette, suite.fonts.googleHref, suite.names, suite.eventDate,
    suite.venue, suite.occasion, suite.monogram.initials, suite.photos.cover,
  ]), [suite]);

  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [drawing, setDrawing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    /* Debounced redraw — `drawing` starts true on mount; on theme
       changes the veil drops in when the redraw actually starts
       (after the 350ms settle), not synchronously in the effect. */
    const t = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        setDrawing(true);
        const theme = suiteRef.current;
        await ensureSuiteFonts(theme);
        for (const size of SHARE_KIT_SIZES) {
          if (cancelled) return;
          const cv = canvasRefs.current[size.id];
          if (cv) await drawShareKitCanvas(cv, theme, size);
        }
        if (!cancelled) setDrawing(false);
      })();
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [themeKey]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {SHARE_KIT_SIZES.map((size) => (
        <div
          key={size.id}
          style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: 8, borderRadius: 12,
            background: 'var(--cream-2)', border: '1px solid var(--line)',
          }}
        >
          <div style={{
            position: 'relative',
            height: 118,
            display: 'grid', placeItems: 'center',
            borderRadius: 8, overflow: 'hidden',
            background: 'var(--cream)',
            border: '1px solid var(--line-soft)',
          }}>
            <canvas
              ref={(el) => { canvasRefs.current[size.id] = el; }}
              aria-label={`${size.label} share image preview`}
              style={{
                maxWidth: '100%', maxHeight: '100%',
                display: 'block',
                opacity: drawing ? 0.25 : 1,
                transition: 'opacity 200ms',
              }}
            />
            {drawing && (
              <span style={{
                position: 'absolute', inset: 0,
                display: 'grid', placeItems: 'center',
                fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)',
                letterSpacing: '0.14em', textTransform: 'uppercase',
              }}>
                Drawing…
              </span>
            )}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--ink-soft)', textAlign: 'center',
          }}>
            {size.label}
            <span style={{ display: 'block', fontWeight: 500, color: 'var(--ink-muted)', letterSpacing: '0.04em', marginTop: 1 }}>
              {size.w}×{size.h}
            </span>
          </div>
          <button
            type="button"
            disabled={drawing}
            onClick={() => {
              const cv = canvasRefs.current[size.id];
              if (cv) downloadCanvasPng(cv, `${siteSlug}-share-${size.id}.png`);
            }}
            aria-label={`Download ${size.label} share image`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '6px 8px', borderRadius: 999,
              background: 'transparent', border: '1px solid var(--line)',
              fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)',
              cursor: drawing ? 'wait' : 'pointer',
              opacity: drawing ? 0.55 : 1,
              fontFamily: 'inherit',
            }}
          >
            <Icon name="arrow-down" size={10} color="var(--ink-soft)" />
            PNG
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── ShareCardMock — inline 1200×630-aspect preview that mirrors
   the OG image. Renders the same content as the real /api/og
   endpoint but in plain DOM so the editor preview is never
   blocked on an edge fn round-trip. ─────────────────────────── */
function ShareCardMock({
  headline, date, venue, prettyUrl, blurb, monogram,
}: {
  headline: string;
  date: string;
  venue: string;
  prettyUrl: string;
  blurb: string;
  monogram: string;
}) {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: '1px solid var(--line)',
      background: 'var(--cream)',
    }}>
      {/* 1200×630 mock — the actual share-card art. */}
      <div style={{
        aspectRatio: '1200 / 630',
        position: 'relative',
        background: 'linear-gradient(135deg, var(--cream-2) 0%, var(--cream-3) 100%)',
        overflow: 'hidden',
      }}>
        {/* Editorial frame inset — matches the OG endpoint's framed
            layout: 4px gold hairline inset 14px from each edge. */}
        <div aria-hidden style={{
          position: 'absolute', inset: 14,
          border: '1px solid var(--peach-ink)',
          opacity: 0.5,
          pointerEvents: 'none',
        }} />
        {/* Subtle paper-grain via radial-gradient. */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(61,74,31,0.06) 1px, transparent 1.5px)',
          backgroundSize: '10px 10px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', inset: 30,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', gap: 6,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: '0.32em', textTransform: 'uppercase',
            color: 'var(--peach-ink)',
          }}>
            ✦ Pearloom ✦
          </div>
          <div style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 'clamp(20px, 4cqw, 36px)',
            color: 'var(--ink)',
            lineHeight: 1.05,
            margin: '4px 0',
          }}>
            {monogram.length > 0 && (
              <span style={{
                display: 'inline-block',
                fontSize: '1.4em',
                marginRight: 8,
                opacity: 0.6,
              }}>{monogram.split('').join(' · ')}</span>
            )}
          </div>
          <div style={{
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontWeight: 500,
            fontSize: 'clamp(16px, 3.6cqw, 28px)',
            color: 'var(--ink)',
            lineHeight: 1.1,
          }}>
            {headline}
          </div>
          {(date || venue) && (
            <div style={{
              fontSize: 11,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              marginTop: 4,
            }}>
              {[date, venue].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
      </div>
      {/* Unfurl footer — domain + blurb, matches iMessage/Slack. */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)' }}>
        <div style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
          {prettyUrl.split('/')[0]}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
          {headline}, Pearloom
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
          {blurb}
        </div>
      </div>
    </div>
  );
}

/* BrandedQRWithRef — small wrapper so the parent can hold a ref
   to the inner <svg> (BrandedQR returns the svg directly). */
const BrandedQRWithRef = (
  function BrandedQRWithRefInner(props: React.ComponentProps<typeof BrandedQR> & { ref: React.Ref<SVGSVGElement> }) {
    const { ref, ...rest } = props;
    return (
      <div ref={(el) => {
        /* Find the rendered svg inside this wrapper and forward
           to the consumer's ref so useBrandedQrPng can serialize it. */
        if (!el) return;
        const svg = el.querySelector('svg');
        if (svg && typeof ref === 'function') ref(svg as unknown as SVGSVGElement);
        else if (svg && ref && typeof ref === 'object') {
          (ref as React.MutableRefObject<SVGSVGElement | null>).current = svg as unknown as SVGSVGElement;
        }
      }}>
        <BrandedQR {...rest} />
      </div>
    );
  }
);

/* Monogram letter formatting — "E & J" reads richer than "EJ"
   when there are two initials and they're meant to be a couple.
   For solo events we just use the single letter. */
function monogramFormatted(initA: string, initB: string): string {
  if (initA && initB) return `${initA} & ${initB}`;
  return initA || initB || '';
}

/* Per-occasion default blurb. Keeps the share card meaningful
   even when the host hasn't set anything. */
function defaultBlurb(occasion: string | undefined, headline: string, date: string, venue: string): string {
  const head = headline === 'Your site' ? 'Save the day' : `Join ${headline}`;
  const tail = [date, venue].filter(Boolean).join(' · ');
  if (occasion === 'memorial' || occasion === 'funeral') {
    return `Gathering to remember ${headline.replace(/^Join /, '')}.${tail ? ` ${tail}.` : ''}`;
  }
  if (occasion === 'baby-shower' || occasion === 'gender-reveal') {
    return `${head}, there's a baby on the way.${tail ? ` ${tail}.` : ''}`;
  }
  if (occasion === 'bachelor-party' || occasion === 'bachelorette-party') {
    return `${head} for one last hurrah.${tail ? ` ${tail}.` : ''}`;
  }
  return `${head}${tail ? `, ${tail}` : ''}.`;
}

/* Arrival picker — writes manifest.arrival. 'auto' is stored as
   undefined so untouched manifests stay clean and pick up future
   occasion-default changes for free. */
const ARRIVAL_CHOICES: Array<{ id: ArrivalStyle; label: string; desc: string }> = [
  { id: 'auto',     label: 'Matched',  desc: 'Pear picks for the occasion' },
  { id: 'envelope', label: 'Envelope', desc: 'Wax seal, tap to open' },
  { id: 'quiet',    label: 'Quiet',    desc: 'A single thread, a name' },
  { id: 'off',      label: 'Off',      desc: 'The site opens plain' },
];

function ArrivalPicker({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const current = ((manifest as unknown as { arrival?: ArrivalStyle }).arrival) ?? 'auto';
  const autoResolved = resolveArrivalStyle({
    ...(manifest as unknown as Record<string, unknown>),
    arrival: 'auto',
  } as unknown as StoryManifest);
  const set = (v: ArrivalStyle) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    arrival: v === 'auto' ? undefined : v,
  } as unknown as StoryManifest);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {ARRIVAL_CHOICES.map((c) => {
        const on = current === c.id;
        const desc = c.id === 'auto' ? `${c.desc} (${autoResolved})` : c.desc;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => set(c.id)}
            aria-pressed={on}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
              padding: '10px 12px', borderRadius: 12, textAlign: 'left',
              background: on ? 'var(--ink)' : 'var(--cream-2)',
              color: on ? 'var(--cream)' : 'var(--ink)',
              border: on ? '1px solid var(--ink)' : '1px solid var(--line)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>{c.label}</span>
            <span style={{ fontSize: 10.5, opacity: on ? 0.75 : 0.65, lineHeight: 1.35 }}>{desc}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── LanguagesSection — the host's "offer this site in another
   language" control. Chapters go through /api/translate's chapter
   mode; the hero lines + event details go through its segment mode.
   The merged result is written to manifest.translations[locale] and
   persisted through the panel's normal onChange (autosave) path —
   no bespoke endpoint. Guests then get the on-site switcher.
   ───────────────────────────────────────────────────────────── */
type LocaleEntry = NonNullable<StoryManifest['translations']>[string];

const POETRY_KEYS = ['heroTagline', 'closingLine', 'rsvpIntro', 'welcomeStatement'] as const;

function LanguagesSection({
  manifest, onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const liveSet = new Set(availableLocales(manifest).filter((l) => l && l !== 'en'));
  // Every offerable language, plus any already-live locale that isn't
  // in the standard set (so a host can still remove an older one).
  const codes = [
    ...TRANSLATABLE_LOCALES.map((l) => l.code),
    ...[...liveSet].filter((c) => !TRANSLATABLE_LOCALES.some((l) => l.code === c)),
  ];

  async function offer(locale: string) {
    if (busy) return;
    setBusy(locale);
    setError(null);
    try {
      const chapters = manifest.chapters ?? [];
      const names = manifest.names ?? ['', ''];
      const entry: LocaleEntry = { updatedAt: new Date().toISOString() };

      // Chapters — the route's chapter mode (auth-gated; the host is).
      if (chapters.length > 0) {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapters,
            targetLocale: locale,
            coupleNames: [names[0] ?? '', names[1] ?? ''],
          }),
        });
        const j = await res.json().catch(() => ({} as { error?: string; translations?: unknown }));
        if (!res.ok) throw new Error((j as { error?: string }).error || 'Translation failed, try again');
        const tr = Array.isArray((j as { translations?: unknown }).translations)
          ? (j as { translations: Array<{ title?: string; subtitle?: string; description?: string }> }).translations
          : [];
        entry.chapters = chapters.map((c, i) => ({
          id: c.id,
          title: tr[i]?.title,
          subtitle: tr[i]?.subtitle,
          description: tr[i]?.description,
        }));
      }

      // Hero lines + event names/descriptions — the route's segment
      // mode. Best-effort: if it fails, we still keep the chapters.
      const plan: Array<{ t: 'poetry'; k: (typeof POETRY_KEYS)[number] } | { t: 'evName' | 'evDesc'; i: number }> = [];
      const segs: string[] = [];
      const poetry = (manifest.poetry ?? {}) as Record<string, unknown>;
      for (const k of POETRY_KEYS) {
        const v = poetry[k];
        if (typeof v === 'string' && v.trim()) { plan.push({ t: 'poetry', k }); segs.push(v); }
      }
      const events = manifest.events ?? [];
      events.forEach((e, i) => {
        if (e.name && e.name.trim()) { plan.push({ t: 'evName', i }); segs.push(e.name); }
        if (e.description && e.description.trim()) { plan.push({ t: 'evDesc', i }); segs.push(e.description); }
      });
      if (segs.length > 0) {
        try {
          const res2 = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ segments: segs, targetLocale: locale }),
          });
          const j2 = await res2.json().catch(() => ({} as { segments?: unknown }));
          const out = (j2 as { segments?: unknown }).segments;
          if (res2.ok && Array.isArray(out) && out.length === segs.length) {
            const poetryTr: NonNullable<LocaleEntry['poetry']> = {};
            const eventsTr: NonNullable<LocaleEntry['events']> = events.map((e) => ({ id: e.id }));
            plan.forEach((p, idx) => {
              const val = String(out[idx] ?? '');
              if (!val) return;
              if (p.t === 'poetry') poetryTr[p.k] = val;
              else if (p.t === 'evName') eventsTr[p.i].name = val;
              else eventsTr[p.i].description = val;
            });
            if (Object.keys(poetryTr).length > 0) entry.poetry = poetryTr;
            if (eventsTr.some((e) => e.name || e.description)) entry.events = eventsTr;
          }
        } catch { /* hero/details are a bonus; chapters carry the site */ }
      }

      if (!entry.chapters?.length && !entry.poetry && !entry.events) {
        throw new Error('Add your story or schedule first, there’s nothing to translate yet.');
      }

      onChange({
        ...(manifest as unknown as Record<string, unknown>),
        translations: { ...(manifest.translations ?? {}), [locale]: entry },
      } as unknown as StoryManifest);
    } catch (e) {
      setError(pearErrorMessage(e, 'Translation failed, try again'));
    } finally {
      setBusy(null);
    }
  }

  function remove(locale: string) {
    const nextTr: Record<string, LocaleEntry> = { ...(manifest.translations ?? {}) };
    delete nextTr[locale];
    const patch: Record<string, unknown> = {
      ...(manifest as unknown as Record<string, unknown>),
      translations: nextTr,
    };
    // If the removed language was the site's default, fall back to English.
    if (manifest.activeLocale === locale) patch.activeLocale = undefined;
    onChange(patch as unknown as StoryManifest);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {codes.map((code) => {
        const live = liveSet.has(code);
        const working = busy === code;
        return (
          <div
            key={code}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 10,
              background: 'var(--cream-2)',
              border: `1px solid ${live ? 'rgba(92,107,63,0.28)' : 'var(--line)'}`,
            }}
          >
            <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
              {localeEnglishName(code)}
            </span>
            {live ? (
              <>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sage-deep)' }}>
                  ✓ Live
                </span>
                <button
                  type="button"
                  onClick={() => remove(code)}
                  disabled={working}
                  style={{
                    border: 'none', background: 'transparent', color: 'var(--ink-muted)',
                    fontSize: 11, fontWeight: 600, cursor: working ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </>
            ) : working ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
                <WeaveLoader size="xs" inline color="var(--ink-soft)" color2="var(--peach-ink)" ariaLabel="Threading" />
                One moment…
              </span>
            ) : (
              <button
                type="button"
                onClick={() => offer(code)}
                disabled={!!busy}
                style={{
                  padding: '5px 12px', borderRadius: 999,
                  background: 'transparent', border: '1px solid var(--line)',
                  fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1,
                  fontFamily: 'inherit', flexShrink: 0,
                }}
              >
                Offer in {localeEnglishName(code)}
              </button>
            )}
          </div>
        );
      })}
      {error && (
        <div style={{ fontSize: 11, color: 'var(--plum-ink, #A14A2C)', lineHeight: 1.4, padding: '2px 2px' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default SharePanel;
