'use client';

import { useState } from 'react';
import { AIHint, AISuggestButton, useAICall } from '../editor/ai';
import { Icon } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

type Note = { guest: string; message: string };

export function ThankYouGenerator() {
  const { site } = useSelectedSite();
  const [guestList, setGuestList] = useState<string>('');
  const [tone, setTone] = useState<'warm' | 'short' | 'heartfelt'>('warm');
  const [notes, setNotes] = useState<Note[]>([]);

  const { state, error, run } = useAICall(async () => {
    const guests = guestList
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!guests.length) throw new Error('Paste at least one guest name');
    const res = await fetch('/api/ai-thankyou', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: site?.id, guests, tone }),
    });
    if (!res.ok) throw new Error(`Pear couldn't draft (${res.status})`);
    const data = (await res.json()) as { notes?: Note[] };
    if (!data.notes?.length) throw new Error('No notes returned');
    setNotes(data.notes);
    return data.notes;
  });

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 18,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>After the event</div>
      <h3 className="display" style={{ margin: 0, fontSize: 26 }}>
        Thank-you notes, <span className="display-italic">drafted.</span>
      </h3>
      <AIHint>
        Paste a list of guest names (one per line). Pear drafts a personalized note for each, referencing the event and what they brought.
      </AIHint>

      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Guest list</label>
      <textarea
        rows={4}
        value={guestList}
        onChange={(e) => setGuestList(e.target.value)}
        placeholder="Clara Rodriguez&#10;David Mendoza&#10;Priya Joshi"
        style={{
          padding: 12,
          background: 'var(--paper)',
          border: '1.5px solid var(--line)',
          borderRadius: 12,
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          outline: 'none',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Tone:</span>
        {(['warm', 'short', 'heartfelt'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTone(t)}
            className="chip"
            style={{
              padding: '5px 12px',
              fontSize: 12,
              background: tone === t ? 'var(--sage-tint)' : 'var(--cream-2)',
              color: tone === t ? 'var(--sage-deep)' : 'var(--ink-soft)',
              border: `1px solid ${tone === t ? 'var(--sage-deep)' : 'var(--line)'}`,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <AISuggestButton
        label={`Draft ${guestList.split('\n').filter(Boolean).length || 0} notes`}
        runningLabel="Writing notes…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />

      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map((n, i) => (
            <div
              key={i}
              style={{
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{n.guest}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.message}</div>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(n.message).catch(() => {})}
                style={{
                  marginTop: 8,
                  padding: '4px 10px',
                  fontSize: 11,
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                  color: 'var(--ink-soft)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <Icon name="copy" size={10} /> Copy
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
