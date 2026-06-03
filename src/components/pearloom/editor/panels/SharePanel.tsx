'use client';

/* eslint-disable no-restricted-syntax */
/* SharePanel — shows the host exactly what their share looks like
   in iMessage / WhatsApp / etc, plus a copy-link button, a QR
   code (rendered via the public Google Charts API — no extra
   dependency), and a quick handoff to the invite-bulk dashboard. */

import { useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, SectionPanelShell } from './_section-atoms';
import { buildSiteUrl, formatSiteDisplayUrl, type SiteOccasion } from '@/lib/site-urls';

export function SharePanel({
  manifest, siteSlug,
}: {
  manifest: StoryManifest;
  siteSlug: string;
}) {
  const occasion = ((manifest as unknown as { occasion?: SiteOccasion }).occasion);
  const siteUrl = buildSiteUrl(siteSlug, '', occasion);
  const prettyUrl = formatSiteDisplayUrl(siteSlug, '', occasion);
  const [copiedKind, setCopiedKind] = useState<'url' | 'pretty' | null>(null);
  const [coHostEmail, setCoHostEmail] = useState('');
  const [coHostBusy, setCoHostBusy] = useState(false);
  const [coHostMsg, setCoHostMsg] = useState<string | null>(null);

  async function inviteCoHost() {
    if (!coHostEmail.trim() || coHostBusy) return;
    setCoHostBusy(true); setCoHostMsg(null);
    try {
      /* Existing /api/co-host endpoint mints a token + sends an
         email. Soft-failures don't block — the host always sees a
         success/failure message inline. */
      const res = await fetch('/api/co-host/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, email: coHostEmail.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setCoHostMsg(`Invite sent to ${coHostEmail.trim()}.`);
      setCoHostEmail('');
    } catch (e) {
      setCoHostMsg((e as Error).message || 'Couldn’t send the invite.');
    } finally {
      setCoHostBusy(false);
    }
  }

  /* OG card preview URL — points at the existing /api/og endpoint
     which returns an image. Add a cache-buster keyed to the cover
     photo so it refreshes when the host swaps the hero image. */
  const [a, b] = manifest.names ?? ['', ''];
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const coverPhoto = ((manifest as unknown as { coverPhoto?: string }).coverPhoto) ?? '';
  const ogQuery = new URLSearchParams({
    occasion: occasion ?? 'wedding',
    couple: [a, b].filter(Boolean).join(' & ') || siteSlug,
    date,
    venue,
    ...(coverPhoto ? { photo: coverPhoto } : {}),
  });
  const ogPreviewUrl = `/api/og?${ogQuery.toString()}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(siteUrl)}&size=240x240&margin=8&bgcolor=FBF7EE&color=0E0D0B`;

  function copy(kind: 'url' | 'pretty', value: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value);
    setCopiedKind(kind);
    setTimeout(() => setCopiedKind((cur) => cur === kind ? null : cur), 1800);
  }

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Share-card preview — this is what shows in iMessage/Slack/etc. */}
        <FGroup label="Share card preview" hint="This is what people see when you paste the link into iMessage, WhatsApp, Slack, etc.">
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            border: '1px solid var(--line)',
            background: 'var(--cream-2)',
            aspectRatio: '1200 / 630',
            position: 'relative',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ogPreviewUrl}
              alt="Share-card preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          {/* iMessage-style mock bubble — concrete sense of how it appears in a chat. */}
          <div style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 14,
            background: 'var(--cream-2)',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--lavender-bg)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: '#fff', borderRadius: 14, padding: 8,
                border: '1px solid var(--line-soft)',
              }}>
                <div style={{
                  borderRadius: 10, overflow: 'hidden',
                  aspectRatio: '1200 / 630', marginBottom: 6,
                  background: `var(--cream-3) center / cover no-repeat url("${ogPreviewUrl}")`,
                }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                  {[a, b].filter(Boolean).join(' & ') || 'Your site'} — Pearloom
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 2 }}>
                  {prettyUrl}
                </div>
              </div>
            </div>
          </div>
        </FGroup>

        {/* Copy link */}
        <FGroup label="Site URL">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              type="button"
              onClick={() => copy('pretty', siteUrl)}
              style={{
                padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--line)', background: 'var(--cream-2)',
                fontSize: 13, color: 'var(--ink)', textAlign: 'left',
                cursor: 'pointer', position: 'relative', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'border-color 140ms, background 140ms',
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
                color: copiedKind === 'pretty' ? 'var(--sage-deep)' : 'var(--ink-muted)',
                transition: 'color 200ms',
              }}>
                {copiedKind === 'pretty' ? '✓ Copied' : 'Copy'}
              </span>
            </button>
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
              The full link copies to your clipboard — short enough to text.
            </div>
          </div>
        </FGroup>

        {/* QR code */}
        <FGroup label="QR code" hint="Drop on a printed card, a welcome sign, or a phone wallpaper.">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 14, borderRadius: 12,
            background: 'var(--cream-2)', border: '1px solid var(--line)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="QR code for your site"
              width={180} height={180}
              style={{ borderRadius: 8, background: '#fff' }}
            />
          </div>
          <a
            href={qrUrl}
            download={`${siteSlug}-qr.png`}
            style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 999,
              background: 'transparent', border: '1px solid var(--line)',
              fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)',
              textDecoration: 'none', alignSelf: 'flex-start',
            }}
          >
            <Icon name="arrow-right" size={11} color="var(--ink-soft)" />
            Download as PNG
          </a>
        </FGroup>

        {/* Quick handoff to the bulk invite flow (still dashboard-hosted). */}
        <FGroup label="Send the invite" hint="Use the Guests panel to add people first — then send.">
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

        {/* Co-host invite — extends edit access to a partner / MOH / parent. */}
        <FGroup label="Invite a co-host" hint="Send someone else access to edit this site. They’ll get an email with a magic link.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FInput
              value={coHostEmail}
              onChange={setCoHostEmail}
              icon="mail"
              type="email"
              placeholder="partner@example.com"
            />
            <button
              type="button"
              onClick={inviteCoHost}
              disabled={!coHostEmail.trim() || coHostBusy}
              style={{
                padding: '8px 14px', borderRadius: 999,
                background: 'var(--cream-2)', border: '1px solid var(--line)',
                fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)',
                cursor: coHostEmail.trim() && !coHostBusy ? 'pointer' : 'not-allowed',
                opacity: coHostEmail.trim() && !coHostBusy ? 1 : 0.55,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {coHostBusy ? 'Threading…' : 'Send invite'}
            </button>
            {coHostMsg && (
              <div style={{
                fontSize: 11, color: 'var(--sage-deep)',
                background: 'var(--sage-bg)',
                padding: '6px 10px', borderRadius: 8,
              }}>
                {coHostMsg}
              </div>
            )}
          </div>
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default SharePanel;
