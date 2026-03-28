'use client';

import { useState, useEffect, useCallback } from 'react';
import type { StoryManifest } from '@/types';

interface TimeCapsulePanelProps {
  manifest: StoryManifest;
  siteId?: string;
}

interface CapsuleSummary {
  id: string;
  fromName: string;
  toName: string;
  unlockDate: string;
  unlockYears: number;
  delivered: boolean;
  sealed: boolean;
}

type UnlockYears = 1 | 5 | 10;

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function TimeCapsulePanel({ manifest, siteId }: TimeCapsulePanelProps) {
  // ── Pre-fill names from manifest (StoryManifest has no names field directly;
  //    fall back to any runtime-injected shape or just leave blank) ────────────
  const manifestAny = manifest as unknown as { names?: [string, string]; coupleNames?: [string, string] };
  const [name1, name2] = manifestAny.coupleNames ?? manifestAny.names ?? ['', ''];

  const defaultFrom = name1 ?? '';
  const defaultTo = name2 ?? '';

  // ── Form state ─────────────────────────────────────────────────────────────
  const [fromName, setFromName] = useState(defaultFrom);
  const [toName, setToName] = useState(defaultTo);
  const [unlockYears, setUnlockYears] = useState<UnlockYears>(1);
  const [letterText, setLetterText] = useState('');

  // ── Capsule list state ─────────────────────────────────────────────────────
  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // ── Submission state ───────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    date: string;
    token: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Compute unlock date from wedding date ──────────────────────────────────
  const weddingDate =
    manifest.logistics?.date ?? manifest.events?.[0]?.date;

  const computeUnlockDate = useCallback(
    (years: UnlockYears): Date => {
      const base = weddingDate ? new Date(weddingDate) : new Date();
      return addYears(base, years);
    },
    [weddingDate]
  );

  // ── Fetch existing capsules on mount ───────────────────────────────────────
  const fetchCapsules = useCallback(async () => {
    if (!siteId) return;
    setLoadingList(true);
    try {
      const res = await fetch(`/api/time-capsule?siteId=${encodeURIComponent(siteId)}`);
      const json = await res.json();
      if (json.capsules) setCapsules(json.capsules);
    } catch {
      // silently ignore list errors
    } finally {
      setLoadingList(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  // ── Delete a capsule ───────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Delete this letter? This cannot be undone.')) return;
    try {
      await fetch(`/api/time-capsule?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setCapsules((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete. Please try again.');
    }
  }

  // ── Seal & save ────────────────────────────────────────────────────────────
  async function handleSeal() {
    if (!fromName.trim() || !toName.trim()) {
      setError('Please fill in both From and To names.');
      return;
    }
    if (!letterText.trim()) {
      setError('Please write your letter before sealing.');
      return;
    }
    if (letterText.length > 2000) {
      setError('Your letter is over the 2000 character limit.');
      return;
    }

    setError(null);
    setSaving(true);
    setSuccessInfo(null);

    try {
      const unlockDate = computeUnlockDate(unlockYears);

      const res = await fetch('/api/time-capsule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteId ?? 'demo',
          fromName: fromName.trim(),
          toName: toName.trim(),
          letter: letterText.trim(),
          unlockDate: unlockDate.toISOString(),
          unlockYears,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSuccessInfo({ date: json.unlockDate, token: json.token });
      setLetterText('');
      setFromName(defaultFrom);
      setToName(defaultTo);
      setUnlockYears(1);
      await fetchCapsules();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const charCount = letterText.length;
  const unlockLabel = unlockYears === 1 ? '1 Year' : `${unlockYears} Years`;

  // ── Preview of computed unlock date ───────────────────────────────────────
  const previewUnlockDate = formatDate(computeUnlockDate(unlockYears).toISOString());

  return (
    <div style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.waxSeal}>🪢</span>
          <h2 style={styles.title}>Love Letter Time Capsules</h2>
        </div>
        <p style={styles.subtitle}>
          Write letters to each other — sealed until your anniversary.
        </p>
      </div>

      {/* ── Existing capsules ──────────────────────────────────────────────── */}
      {siteId && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Sealed Letters</h3>

          {loadingList && (
            <p style={styles.dimText}>Loading your letters...</p>
          )}

          {!loadingList && capsules.length === 0 && (
            <p style={styles.dimText}>
              No letters sealed yet. Write your first one below.
            </p>
          )}

          {capsules.map((capsule) => (
            <div key={capsule.id} style={styles.capsuleCard}>
              <div style={styles.capsuleInfo}>
                <div style={styles.capsuleNames}>
                  <span>💌</span>
                  <strong style={styles.capsuleNameText}>
                    From: {capsule.fromName} → To: {capsule.toName}
                  </strong>
                </div>
                <div style={styles.capsuleMeta}>
                  Opens: {formatDate(capsule.unlockDate)} ({capsule.unlockYears}{' '}
                  {capsule.unlockYears === 1 ? 'year' : 'years'})
                </div>
                <div style={styles.capsuleStatus}>
                  {capsule.sealed ? (
                    <span style={styles.sealedBadge}>● Sealed</span>
                  ) : (
                    <span style={styles.openBadge}>● Open</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(capsule.id)}
                style={styles.deleteBtn}
                title="Delete this letter"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Success message ────────────────────────────────────────────────── */}
      {successInfo && (
        <div style={styles.successBox}>
          <div style={styles.successTitle}>
            ✉️ Letter sealed! It will be delivered on {formatDate(successInfo.date)}.
          </div>
          <div style={styles.successUrl}>
            <span style={styles.dimText}>Save this link — share it with each other:</span>
            <div style={styles.unlockLink}>
              pearloom.app/time-capsule/{successInfo.token}
            </div>
          </div>
        </div>
      )}

      {/* ── Write a new letter ─────────────────────────────────────────────── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Write a New Letter</h3>

        {/* From / To row */}
        <div style={styles.namesRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>From</label>
            <input
              type="text"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your name"
              style={styles.input}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>To</label>
            <input
              type="text"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
              placeholder="Their name"
              style={styles.input}
            />
          </div>
        </div>

        {/* Seal until dropdown */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Seal until</label>
          <div style={styles.sealRow}>
            <select
              value={unlockYears}
              onChange={(e) => setUnlockYears(Number(e.target.value) as UnlockYears)}
              style={styles.select}
            >
              <option value={1}>1 Year</option>
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
            </select>
            <span style={styles.unlockPreview}>
              Opens {previewUnlockDate}
            </span>
          </div>
        </div>

        {/* Letter textarea */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Your letter</label>
          <textarea
            value={letterText}
            onChange={(e) => setLetterText(e.target.value)}
            placeholder={`Dear ${toName || '[Name]'},\n\n`}
            maxLength={2000}
            rows={12}
            style={styles.textarea}
          />
          <div
            style={{
              ...styles.charCount,
              color: charCount > 1800 ? '#c0856a' : 'rgba(214,198,168,0.45)',
            }}
          >
            {charCount} / 2000 characters
          </div>
        </div>

        {/* Error */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Submit */}
        <button
          onClick={handleSeal}
          disabled={saving}
          style={{
            ...styles.sealBtn,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Sealing...' : `✉️ Seal & Save Letter (${unlockLabel})`}
        </button>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1C1916',
    color: 'rgba(214,198,168,0.9)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '680px',
    margin: '0 auto',
  },

  // Header
  header: {
    marginBottom: '28px',
    borderBottom: '1px solid rgba(214,198,168,0.12)',
    paddingBottom: '20px',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
  },
  waxSeal: {
    fontSize: '22px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#D6C6A8',
    letterSpacing: '0.01em',
  },
  subtitle: {
    margin: '4px 0 0 32px',
    fontSize: '13px',
    color: 'rgba(214,198,168,0.55)',
    lineHeight: 1.5,
  },

  // Section
  section: {
    marginBottom: '28px',
  },
  sectionTitle: {
    margin: '0 0 14px 0',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(214,198,168,0.5)',
  },

  // Capsule card
  capsuleCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(214,198,168,0.06)',
    border: '1px solid rgba(214,198,168,0.14)',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '10px',
  },
  capsuleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  capsuleNames: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  capsuleNameText: {
    color: '#D6C6A8',
    fontWeight: 500,
  },
  capsuleMeta: {
    fontSize: '12px',
    color: 'rgba(214,198,168,0.5)',
    paddingLeft: '24px',
  },
  capsuleStatus: {
    paddingLeft: '24px',
    fontSize: '12px',
  },
  sealedBadge: {
    color: '#8FAF7E',
  },
  openBadge: {
    color: '#C0856A',
  },
  deleteBtn: {
    background: 'transparent',
    border: '1px solid rgba(214,198,168,0.18)',
    borderRadius: '6px',
    color: 'rgba(214,198,168,0.45)',
    fontSize: '12px',
    padding: '5px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },

  // Success
  successBox: {
    background: 'rgba(143,175,126,0.1)',
    border: '1px solid rgba(143,175,126,0.35)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  successTitle: {
    fontSize: '14px',
    color: '#A8C98F',
    fontWeight: 500,
    marginBottom: '10px',
  },
  successUrl: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  unlockLink: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#D6C6A8',
    background: 'rgba(214,198,168,0.06)',
    border: '1px solid rgba(214,198,168,0.14)',
    borderRadius: '4px',
    padding: '6px 10px',
    wordBreak: 'break-all',
  },

  // Form
  namesRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '14px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '14px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'rgba(214,198,168,0.55)',
  },
  input: {
    background: 'rgba(214,198,168,0.06)',
    border: '1px solid rgba(214,198,168,0.18)',
    borderRadius: '6px',
    color: '#D6C6A8',
    fontSize: '14px',
    padding: '9px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  sealRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  select: {
    background: 'rgba(214,198,168,0.06)',
    border: '1px solid rgba(214,198,168,0.18)',
    borderRadius: '6px',
    color: '#D6C6A8',
    fontSize: '14px',
    padding: '9px 12px',
    outline: 'none',
    cursor: 'pointer',
  },
  unlockPreview: {
    fontSize: '12px',
    color: 'rgba(214,198,168,0.45)',
    fontStyle: 'italic',
  },
  textarea: {
    background: 'rgba(214,198,168,0.04)',
    border: '1px solid rgba(214,198,168,0.18)',
    borderRadius: '8px',
    color: '#C8B89A',
    fontFamily: 'Georgia, serif',
    fontSize: '15px',
    lineHeight: 1.75,
    padding: '14px 16px',
    resize: 'vertical',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '220px',
  },
  charCount: {
    fontSize: '11px',
    textAlign: 'right',
    marginTop: '4px',
    transition: 'color 0.2s',
  },

  // Error
  errorBox: {
    background: 'rgba(192,133,106,0.12)',
    border: '1px solid rgba(192,133,106,0.35)',
    borderRadius: '6px',
    color: '#C0856A',
    fontSize: '13px',
    padding: '10px 14px',
    marginBottom: '14px',
  },

  // Seal button
  sealBtn: {
    background: 'linear-gradient(135deg, #8B7355 0%, #6B5A42 100%)',
    border: '1px solid rgba(214,198,168,0.25)',
    borderRadius: '8px',
    color: '#F0E8D8',
    fontSize: '14px',
    fontWeight: 600,
    padding: '12px 24px',
    width: '100%',
    letterSpacing: '0.02em',
    transition: 'opacity 0.2s',
  },

  // Misc
  dimText: {
    fontSize: '13px',
    color: 'rgba(214,198,168,0.4)',
    fontStyle: 'italic',
  },
};
