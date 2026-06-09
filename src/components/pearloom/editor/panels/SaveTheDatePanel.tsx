'use client';

/* eslint-disable no-restricted-syntax */
/* SaveTheDatePanel — the lighter pre-invite. Audit found no
   save-the-date surface anywhere. This panel composes a small
   announcement (date + venue teaser + photo + short message)
   and sends it through the existing /api/save-the-date/send
   route to every guest with an email on the list.

   Writes manifest.saveTheDate = { message, photoUrl, sentAt }
   so the host can see "Sent 2026-04-05" and re-send a reminder
   if needed. */

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, SectionPanelShell } from './_section-atoms';
import { FDate } from './_form-atoms';
import { PhotoUploadSlot, collectPhotoPool } from './_photo-upload';
import { PearInlineRewrite, pearErrorMessage } from '../../redesign/PearAssist';

interface SaveTheDate {
  message?: string;
  photoUrl?: string;
  sentAt?: string;
  /** Optional override of the canvas date — for cases where the
   *  save-the-date goes out 9 months early and the host hasn't
   *  pinned the exact day yet. Stored as ISO or long date. */
  dateOverride?: string;
}

export function SaveTheDatePanel({
  manifest, onChange, siteSlug,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  siteSlug: string;
}) {
  const loose = manifest as unknown as { saveTheDate?: SaveTheDate; coverPhoto?: string };
  const std: SaveTheDate = loose.saveTheDate ?? {};
  const heroDate = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const [n1, n2] = manifest.names ?? ['', ''];
  const couple = n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'Save the date');
  const photoPool = collectPhotoPool(manifest);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState<number | null>(null);

  /* Eligible-recipient count — number of guests with an email. */
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/guests?siteSlug=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { guests?: Array<{ email?: string | null }> };
        if (!cancelled) setRecipientCount((data.guests ?? []).filter((g) => g.email).length);
      } catch { /* ignore — falls through to null */ }
    })();
    return () => { cancelled = true; };
  }, [siteSlug]);

  const patchStd = (next: Partial<SaveTheDate>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    saveTheDate: { ...std, ...next },
  } as unknown as StoryManifest);

  const setMessage = (v: string) => patchStd({ message: v });
  const setPhotoUrl = (v: string) => patchStd({ photoUrl: v || undefined });
  const setDateOverride = (v: string) => patchStd({ dateOverride: v });

  const displayDate = std.dateOverride || heroDate;
  const photo = std.photoUrl || loose.coverPhoto || '';
  const defaultMessage = `${couple} are getting married! Save the date — ${displayDate || 'date coming soon'}${venue ? ` · ${venue}` : ''}.`;
  const message = std.message ?? '';

  async function send() {
    if (!siteSlug || busy) return;
    setBusy(true); setErr(null); setSentCount(null);
    try {
      const res = await fetch('/api/save-the-date/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteSlug,
          message: message.trim() || defaultMessage,
          photoUrl: photo || undefined,
          dateDisplay: displayDate,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[save-the-date] send failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Couldn’t send — try again?');
      }
      const data = await res.json() as { sent?: number };
      setSentCount(data.sent ?? 0);
      patchStd({ sentAt: new Date().toISOString() });
    } catch (e) {
      setErr(pearErrorMessage(e, 'Couldn’t send — try again?'));
    } finally {
      setBusy(false);
    }
  }

  const sentDateLabel = std.sentAt
    ? new Date(std.sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Preview card — small approximation of what the email + on-site card looks like. */}
        <div style={{
          padding: 16, borderRadius: 14,
          background: 'var(--cream-2)', border: '1px solid var(--line)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          {photo && (
            <div style={{
              width: '100%', aspectRatio: '4/3',
              borderRadius: 10, marginBottom: 14,
              background: `var(--cream-3) center / cover no-repeat url("${photo.replace(/"/g, '%22')}")`,
            }} />
          )}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 6 }}>
            Save the date
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 6 }}>
            {couple}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-soft)', marginBottom: 4 }}>
            {displayDate || 'Date coming soon'}
          </div>
          {venue && <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{venue}</div>}
        </div>

        {/* Sent banner */}
        {sentDateLabel && (
          <div style={{
            padding: '8px 12px', borderRadius: 10,
            background: 'var(--sage-bg)', border: '1px solid rgba(92,107,63,0.18)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11.5, color: 'var(--sage-deep)', fontWeight: 600,
          }}>
            <Icon name="check" size={12} color="var(--sage-deep)" />
            Save-the-date sent {sentDateLabel}{sentCount !== null && ` · ${sentCount} recipient${sentCount === 1 ? '' : 's'}`}
          </div>
        )}

        {/* Photo picker */}
        <FGroup label="Cover photo" hint="Falls back to your hero cover if left blank.">
          <PhotoUploadSlot
            url={std.photoUrl ?? ''}
            onChange={setPhotoUrl}
            aspectRatio="4/3"
            size="md"
            pool={photoPool}
          />
        </FGroup>

        {/* Date override */}
        <FGroup label="Date shown on the card" hint="Use the hero date by default, or set a softer 'Summer 2027' here.">
          <FDate value={std.dateOverride ?? ''} onChange={setDateOverride} placeholder={heroDate || 'Pick a day'} />
        </FGroup>

        {/* Message */}
        <FGroup label="Message" hint="Pear writes a friendly default — feel free to rewrite.">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder={defaultMessage}
            style={{
              width: '100%', padding: 10, borderRadius: 10,
              border: '1px solid var(--line)', background: 'var(--cream-2)',
              fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
              outline: 'none', resize: 'vertical', lineHeight: 1.5,
            }}
          />
          {(message.trim().length >= 12) && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                value={message}
                onCommit={setMessage}
                context="save the date announcement message"
              />
            </div>
          )}
          {/* Live preview — the effective text that actually goes
              out (host's message, or Pear's default when blank). */}
          <div style={{
            marginTop: 8, padding: '9px 11px',
            borderRadius: 9,
            background: 'var(--sage-tint)',
            border: '1px solid rgba(92,107,63,0.18)',
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              color: 'var(--sage-deep)', marginBottom: 4,
            }}>
              Preview
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
              {message.trim() || defaultMessage}
            </div>
          </div>
        </FGroup>

        {/* Recipient count — surfaced before the send action so the
            host knows the blast radius before they commit. */}
        {recipientCount !== null && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="mail" size={12} color="var(--ink-muted)" />
            {recipientCount > 0
              ? `Sends to ${recipientCount} guest${recipientCount === 1 ? '' : 's'} with emails.`
              : 'No guests with emails yet — add some in the Guests panel first.'}
          </div>
        )}

        {/* Send action */}
        {err && (
          <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', fontSize: 11.5 }}>
            {err}
          </div>
        )}
        <button
          type="button"
          onClick={send}
          disabled={busy || !recipientCount}
          className="pl-pearl-accent"
          style={{
            padding: '12px 18px', borderRadius: 999,
            fontSize: 13, fontWeight: 700,
            cursor: !busy && recipientCount ? 'pointer' : 'not-allowed',
            opacity: !busy && recipientCount ? 1 : 0.55,
            border: 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {busy
            ? 'Threading…'
            : recipientCount === null
              ? 'Send the save-the-date'
              : recipientCount === 0
                ? 'Add guests with emails first'
                : sentDateLabel
                  ? `Send a reminder · ${recipientCount}`
                  : `Send to ${recipientCount} guest${recipientCount === 1 ? '' : 's'}`}
          {!busy && recipientCount ? <Icon name="arrow-right" size={13} color="var(--peach-ink)" /> : null}
        </button>
      </div>
    </SectionPanelShell>
  );
}

export default SaveTheDatePanel;
