'use client';

// ──────────────────────────────────────────────────────────────
// GuestImportDialog
//
// CSV upload + preview + commit, two-step:
//   1. User pastes CSV or uploads file. We POST a "preview"
//      (skipDuplicates=true) which actually inserts; the response
//      tells them what was parsed/inserted/skipped/rejected.
//
//   We deliberately don't implement a separate dry-run endpoint —
//   the import is idempotent (dedupe by email + name), so the
//   one-click flow is safe and simpler.
//
// Accepts column orderings from Google Sheets / The Knot / Notion /
// raw Excel. See parse-guests.ts for the full alias list.
// ──────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';

interface Props {
  siteId: string;
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

interface ImportResponse {
  batchId: string;
  parsed: number;
  inserted: number;
  skipped: number;
  rejected: { rowIndex: number; reason: string }[];
  warnings: { rowIndex: number; message: string }[];
  headerMap: Record<string, string>;
  error?: string;
}

export function GuestImportDialog({ siteId, open, onClose, onImported }: Props) {
  const [csv, setCsv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setCsv(text);
    };
    reader.readAsText(file);
  }

  async function submit() {
    if (!csv.trim()) { setError('Paste or upload a CSV first.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/guests/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, csv, skipDuplicates: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Import failed.');
        if (data.rejected) setResult(data);
        return;
      }
      setResult(data);
      onImported?.();
    } catch (e) {
      setError('Network error — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setCsv('');
    setResult(null);
    setError(null);
  }

  return (
    <div onClick={onClose} style={modalBackdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
        <button onClick={onClose} aria-label="Close" style={modalCloseStyle}>×</button>

        {!result ? (
          <>
            <h3 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 24, margin: 0 }}>
              Import guests from CSV
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.55, marginTop: 6 }}>
              Paste from Google Sheets / Excel, or upload a .csv file. We&rsquo;ll match
              common column names (Name, Email, Address, Plus One, etc.) and skip
              anyone who&rsquo;s already on your list.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 8 }}>
              <button type="button" onClick={() => fileInput.current?.click()} style={smallButtonStyle}>
                Upload .csv file
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                style={{ display: 'none' }}
              />
              {csv && (
                <button type="button" onClick={() => setCsv('')} style={smallButtonStyle}>
                  Clear
                </button>
              )}
            </div>

            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="Name, Email, Address, City, State, Postal code, Plus One&#10;Anna Park, anna@example.com, 12 Orchard Lane, Hudson, NY, 12534, Yes"
              rows={10}
              style={{
                ...inputStyle,
                fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
                fontSize: 12.5,
                resize: 'vertical',
                minHeight: 180,
              }}
            />

            {error && (
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(155,52,38,0.08)', color: '#9B3426', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ ...smallButtonStyle, padding: '10px 18px' }}>
                Cancel
              </button>
              <button type="button" onClick={submit} disabled={submitting} style={primaryButtonStyle}>
                {submitting ? 'Importing…' : 'Import guests'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 24, margin: 0 }}>
              Import complete
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
              <ResultRow icon="✓" label="Imported" value={String(result.inserted)} tone="success" />
              <ResultRow icon="—" label="Skipped (duplicates)" value={String(result.skipped)} />
              {result.rejected.length > 0 && (
                <ResultRow icon="!" label="Rejected" value={String(result.rejected.length)} tone="warn" />
              )}
              {result.warnings.length > 0 && (
                <ResultRow icon="?" label="Warnings" value={String(result.warnings.length)} />
              )}
            </div>

            {result.rejected.length > 0 && (
              <details style={{ marginTop: 14 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  Rows we couldn&rsquo;t import
                </summary>
                <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  {result.rejected.map((r) => (
                    <li key={r.rowIndex}>Row {r.rowIndex}: {r.reason}</li>
                  ))}
                </ul>
              </details>
            )}

            {Object.keys(result.headerMap).length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-muted)' }}>
                  Column matching
                </summary>
                <table style={{ marginTop: 8, fontSize: 12, width: '100%' }}>
                  <tbody>
                    {Object.entries(result.headerMap).map(([h, field]) => (
                      <tr key={h} style={{ borderTop: '1px solid var(--line, rgba(61,74,31,0.08))' }}>
                        <td style={{ padding: '4px 6px', fontFamily: 'ui-monospace, monospace' }}>{h}</td>
                        <td style={{ padding: '4px 6px', color: field === 'ignored' ? 'var(--ink-muted)' : 'var(--ink)' }}>
                          → {field}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button type="button" onClick={reset} style={{ ...smallButtonStyle, padding: '10px 18px' }}>
                Import another
              </button>
              <button type="button" onClick={onClose} style={primaryButtonStyle}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  icon, label, value, tone,
}: { icon: string; label: string; value: string; tone?: 'success' | 'warn' }) {
  const color = tone === 'success' ? 'var(--sage-deep)' : tone === 'warn' ? '#9B3426' : 'var(--ink)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--cream-2, #F5EFE2)' }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center', color, fontSize: 13.5 }}>
        <span style={{ fontWeight: 700 }}>{icon}</span>
        {label}
      </span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  background: 'var(--card, #FFFFFF)', fontSize: 14, width: '100%', color: 'var(--ink)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 999, border: 'none',
  background: 'var(--ink, #18181B)', color: 'var(--cream, #FBF7EE)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid var(--line, rgba(61,74,31,0.14))',
  background: 'var(--card, #FFFFFF)', fontSize: 12.5,
  cursor: 'pointer', color: 'var(--ink)',
};

const modalBackdropStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(14,13,11,0.55)',
  backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: 20, zIndex: 1100,
};

const modalCardStyle: React.CSSProperties = {
  background: 'var(--cream, #FDFAF0)', borderRadius: 18,
  padding: 28, maxWidth: 600, width: '100%', position: 'relative',
  maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
};

const modalCloseStyle: React.CSSProperties = {
  position: 'absolute', top: 12, right: 12, background: 'transparent',
  border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--ink-soft)',
};
