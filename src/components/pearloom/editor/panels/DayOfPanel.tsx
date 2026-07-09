'use client';

/* eslint-disable no-restricted-syntax */
/* DayOfPanel — host-side composer for day-of broadcasts. The
   audit found `DayOfBanner`, `BroadcastBar`, `GuestPearChat` were
   all guest-facing read-only displays. Hosts had NO surface to
   compose the messages they show. This panel writes through
   POST /api/sites/live-updates (existing) and lists past
   broadcasts so the host can see what already went out. */

import { useEffect, useState } from 'react';
import { Icon } from '../../motifs';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell } from './_section-atoms';
import { FSelect } from './_form-atoms';
import { PhotoUploadSlot } from './_photo-upload';
import { pearErrorMessage } from '../../redesign/PearAssist';

type UpdateType = 'ceremony' | 'reception' | 'cocktail' | 'misc';

interface LiveUpdate {
  id: string;
  message: string;
  photo_url?: string | null;
  type?: UpdateType;
  created_at: string;
  email_broadcast_at?: string | null;
  email_recipient_count?: number | null;
}

const TYPE_OPTIONS = [
  { value: 'misc',      label: 'Update',     hint: 'General note to guests' },
  { value: 'ceremony',  label: 'Ceremony',   hint: 'Just before / during the ceremony' },
  { value: 'cocktail',  label: 'Cocktails',  hint: 'Between ceremony and reception' },
  { value: 'reception', label: 'Reception',  hint: 'Toasts, dancing, late-night moments' },
];

export function DayOfPanel({ siteSlug }: { siteSlug: string }) {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [updateType, setUpdateType] = useState<UpdateType>('misc');
  const [emailToo, setEmailToo] = useState(false);

  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sites/live-updates?subdomain=${encodeURIComponent(siteSlug)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { updates?: LiveUpdate[] };
        if (!cancelled) setUpdates((data.updates ?? []).slice().reverse());
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [siteSlug]);

  async function send() {
    if (!message.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/sites/live-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: siteSlug,
          message: message.trim(),
          photo_url: photoUrl || undefined,
          type: updateType,
          email: emailToo,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[day-of] broadcast failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Couldn’t send the broadcast, try again?');
      }
      const data = await res.json() as { update?: LiveUpdate };
      if (data.update) {
        setUpdates((prev) => [data.update!, ...prev]);
      }
      setMessage(''); setPhotoUrl(''); setEmailToo(false);
    } catch (e) {
      setErr(pearErrorMessage(e, 'Couldn’t send the broadcast, try again?'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header explanation */}
        <div style={{ padding: 12, borderRadius: 10, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.18)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--peach-ink)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Live broadcasts
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Anything you post here appears at the top of your site for guests on the day. Tick "Also email" for guests not currently looking at the page.
          </div>
        </div>

        {/* Composer */}
        <FGroup label="What's happening" hint="Keep it short, guests glance at this on the move.">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Ceremony moved indoors, head to the pavilion when you arrive."
            style={{
              width: '100%', padding: 10, borderRadius: 10,
              border: '1px solid var(--line)', background: 'var(--cream-2)',
              fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
              outline: 'none', resize: 'vertical', lineHeight: 1.5,
            }}
          />
        </FGroup>

        <FGroup label="Photo (optional)" hint="Adds a small image to the broadcast banner.">
          <PhotoUploadSlot
            url={photoUrl}
            onChange={setPhotoUrl}
            aspectRatio="16/9"
            size="sm"
          />
        </FGroup>

        <FGroup label="Moment">
          <FSelect
            value={updateType}
            onChange={(v) => setUpdateType(v as UpdateType)}
            options={TYPE_OPTIONS}
            icon="clock"
          />
        </FGroup>

        <FToggleStandalone
          label="Also email everyone attending"
          sub="For guests not looking at the site right now. 3 broadcasts max per 24h."
          def={emailToo}
          onChange={setEmailToo}
        />

        {err && (
          <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', fontSize: 11.5 }}>
            {err}
          </div>
        )}

        <button
          type="button"
          onClick={send}
          disabled={!message.trim() || busy}
          className="pl-pearl-accent"
          style={{
            padding: '12px 18px', borderRadius: 999,
            fontSize: 13, fontWeight: 700,
            cursor: message.trim() && !busy ? 'pointer' : 'not-allowed',
            opacity: message.trim() && !busy ? 1 : 0.55,
            border: 'none',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {busy ? 'Posting…' : 'Post the broadcast'}
          {!busy && <Icon name="arrow-right" size={13} color="var(--peach-ink)" />}
        </button>

        {/* Past broadcasts */}
        {updates.length > 0 && (
          <FGroup label={`Sent · ${updates.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
              {updates.map((u) => (
                <div
                  key={u.id}
                  style={{
                    padding: 10, borderRadius: 10,
                    background: 'var(--card)', border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {(u.type ?? 'misc')} · {new Date(u.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {u.email_broadcast_at && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--peach-ink)' }}>
                        <Icon name="mail" size={10} color="var(--peach-ink)" />
                        {u.email_recipient_count ?? '—'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
                    {u.message}
                  </div>
                  {u.photo_url && (
                    <div style={{
                      marginTop: 6, aspectRatio: '16/9',
                      borderRadius: 8,
                      background: `var(--cream-3) center / cover no-repeat url("${u.photo_url.replace(/"/g, '%22')}")`,
                    }} />
                  )}
                </div>
              ))}
            </div>
          </FGroup>
        )}
      </div>
    </SectionPanelShell>
  );
}

export default DayOfPanel;
