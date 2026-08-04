'use client';

// ─────────────────────────────────────────────────────────────
// GuestListDoor — "paste your list" as a first-class step.
//
// The guest list is the asset that makes a celebration real: a
// live site with nobody on it is a stage with no audience, and
// every review of the platform independently named the importer
// as a doorway in its own right.
//
// The capability already existed — but behind a button labelled
// "Import guests from CSV", opening a dialog that talks about
// column names. A host whose list lives in Notes or a group chat
// does not think they have a CSV, so they never open it. This is
// the same backend with the barrier removed: one box, plain
// words, and an honest count BEFORE anything is committed.
//
// The parse runs client-side purely to show that count. The
// server re-parses with the same module and remains the authority
// — nothing here is trusted downstream.
// ─────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react';
import { parseGuestList } from '@/lib/csv/parse-guest-list';
import { summarizeGuestPaste } from '@/lib/csv/paste-summary';

interface Props {
  siteId: string;
  /** Fired after a successful import so the roster refetches. */
  onImported?: () => void;
  /** Solemn occasions say "people", never "guests". */
  solemn?: boolean;
  /** Compact spacing for in-panel mounts. */
  inline?: boolean;
}

export function GuestListDoor({ siteId, onImported, solemn = false, inline = false }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => summarizeGuestPaste(parseGuestList(text)), [text]);
  const noun = solemn ? 'people' : 'guests';

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setText(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(file);
  }

  async function submit() {
    if (summary.count === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/guests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, csv: text, skipDuplicates: true }),
      });
      const json = (await res.json()) as { inserted?: number; error?: string };
      if (!res.ok) {
        setError(json.error || 'That didn’t go through. Try again in a moment.');
        return;
      }
      setAdded(json.inserted ?? 0);
      setText('');
      onImported?.();
    } catch {
      setError('That didn’t go through. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (added !== null) {
    return (
      <div style={{ padding: inline ? '18px 0' : '28px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 15, margin: 0 }}>
          {added === 0
            ? `Everyone on that list was already here.`
            : `${added} ${added === 1 ? (solemn ? 'person' : 'guest') : noun} added.`}
        </p>
        <button
          type="button"
          onClick={() => setAdded(null)}
          style={{
            marginTop: 10, fontSize: 13, fontWeight: 600,
            color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Paste another list
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
      <label
        htmlFor="pl-guest-paste"
        style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 }}
      >
        Paste your list
      </label>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 10px' }}>
        One person per line, however you already have it — a name, an email,
        or both. A spreadsheet export works too.
      </p>

      <textarea
        id="pl-guest-paste"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        placeholder={'Emma Doyle <emma@example.com>\nJames Reyes, james@example.com\nAunt Prue'}
        style={{
          width: '100%',
          padding: '12px 13px',
          borderRadius: 10,
          border: '1px solid var(--line)',
          background: 'var(--cream-2, #F5EFE2)',
          color: 'var(--ink)',
          fontFamily: 'var(--pl-font-body)',
          fontSize: 13.5,
          lineHeight: 1.6,
          resize: 'vertical',
          minHeight: 140,
        }}
      />

      <div
        aria-live="polite"
        style={{ minHeight: 38, fontSize: 13, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.5 }}
      >
        {summary.sentence}
        {summary.sample.length > 0 && (
          <>
            {' '}
            <span style={{ opacity: 0.75 }}>
              {summary.sample.join(', ')}
              {summary.count > summary.sample.length ? '…' : ''}
            </span>
          </>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 8, padding: '9px 11px', borderRadius: 8,
            background: 'color-mix(in oklab, var(--pl-plum, #7A2D2D) 10%, transparent)',
            color: 'var(--pl-plum, #7A2D2D)', fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={submit}
          disabled={summary.count === 0 || busy}
          className="btn btn-primary"
          style={{ opacity: summary.count === 0 || busy ? 0.5 : 1 }}
        >
          {busy
            ? 'One moment…'
            : summary.count > 0
              ? `Add ${summary.count} ${summary.count === 1 ? (solemn ? 'person' : 'guest') : noun}`
              : `Add ${noun}`}
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          style={{
            fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          or upload a file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default GuestListDoor;
