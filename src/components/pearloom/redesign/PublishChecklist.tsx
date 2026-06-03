'use client';

/* eslint-disable no-restricted-syntax */
/* PublishChecklist — topbar pill + popover that audits the manifest
   for missing essentials. Doesn't block publishing — just warns.

   Mounted in EditorTopbar between save indicator and Publish so
   hosts notice unfilled fields before guests do. */

import { useEffect, useRef, useState, useMemo } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';

interface Check {
  id: string;
  label: string;
  ok: boolean;
  /** Optional hint shown under the label when failed. */
  hint?: string;
}

function buildChecks(manifest: StoryManifest): Check[] {
  const loose = manifest as unknown as Record<string, unknown>;
  const [a, b] = manifest.names ?? ['', ''];
  const subject = (loose.subject as { kind?: string } | undefined);
  const isSolo = subject?.kind === 'solo';
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const coverPhoto = (loose.coverPhoto as string | undefined) ?? '';
  const events = manifest.events ?? [];
  const faqs = manifest.faqs ?? [];
  const detailsCards = (loose.detailsCards as Array<[string, string]> | undefined) ?? [];

  return [
    {
      id: 'names',
      label: isSolo ? 'Honoree name' : 'Both names',
      ok: isSolo ? !!a.trim() : !!a.trim() && !!b.trim(),
      hint: 'Add to the Hero panel.',
    },
    { id: 'date',  label: 'Event date',   ok: !!date.trim(),  hint: 'Hero panel · Date & venue.' },
    { id: 'venue', label: 'Venue',        ok: !!venue.trim(), hint: 'Hero panel · Date & venue.' },
    { id: 'cover', label: 'Cover photo',  ok: !!coverPhoto.trim(), hint: 'Hero panel · Cover photo.' },
    { id: 'schedule', label: 'At least one schedule moment', ok: events.length > 0, hint: 'Schedule panel · Add a moment.' },
    { id: 'details',  label: 'At least one detail card',     ok: detailsCards.length > 0, hint: 'Details panel · Add a detail.' },
    { id: 'faq',      label: 'At least one FAQ',             ok: faqs.length > 0, hint: 'FAQ panel.' },
  ];
}

export function PublishChecklist({ manifest }: { manifest: StoryManifest }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const checks = useMemo(() => buildChecks(manifest), [manifest]);
  const missing = checks.filter((c) => !c.ok);
  const ready = missing.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={ready ? 'Site is ready to publish' : `${missing.length} thing${missing.length === 1 ? '' : 's'} still to do`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          background: ready ? 'var(--sage-bg)' : 'var(--peach-bg)',
          color: ready ? 'var(--sage-deep)' : 'var(--peach-ink)',
          border: '1px solid ' + (ready ? 'rgba(92,107,63,0.18)' : 'rgba(198,112,61,0.18)'),
          fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 140ms, color 140ms, border-color 140ms',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: ready ? 'var(--sage-deep)' : 'var(--peach-ink)',
        }} />
        {ready ? 'Ready' : `${missing.length} to do`}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Publish readiness"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 200,
            width: 280,
            padding: 14,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            {ready ? 'Looking great' : "What's still missing"}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {ready
              ? 'Every essential field is filled in. Ready to publish whenever you are.'
              : 'These aren’t blocking — but they help guests have a complete experience.'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {checks.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '6px 8px', borderRadius: 8,
                  background: c.ok ? 'var(--sage-bg)' : 'var(--cream-2)',
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: c.ok ? 'var(--sage-deep)' : 'transparent',
                  border: c.ok ? 'none' : '1.5px solid var(--ink-muted)',
                  display: 'grid', placeItems: 'center',
                  flexShrink: 0, marginTop: 1,
                }}>
                  {c.ok && <Icon name="check" size={9} color="#fff" />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.ok ? 'var(--sage-deep)' : 'var(--ink)' }}>
                    {c.label}
                  </div>
                  {!c.ok && c.hint && (
                    <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 1 }}>
                      {c.hint}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishChecklist;
