'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/TimeCapsulePanel.tsx
// Love-letter time capsules — write, seal, deliver on an
// anniversary. Rewritten in the editorial chrome: Fraunces
// italic section titles, mono meta eyebrows, cream-paper cards,
// gold hairlines, underlined inputs. Slots into the editor's
// Extras rail.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MailCheck, Trash2, Lock, Unlock, AlertTriangle } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { parseLocalDate } from '@/lib/date';
import {
  PanelRoot,
  PanelSection,
  PanelField,
  PanelInput,
  PanelTextarea,
  PanelSelect,
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

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
    return parseLocalDate(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const pillMono: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  fontFamily: panelFont.mono,
  fontSize: panelText.meta,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.widest,
  textTransform: 'uppercase',
  transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
  lineHeight: 1,
};

export default function TimeCapsulePanel({ manifest, siteId }: TimeCapsulePanelProps) {
  const manifestAny = manifest as unknown as {
    names?: [string, string];
    coupleNames?: [string, string];
  };
  const [name1, name2] = manifestAny.coupleNames ?? manifestAny.names ?? ['', ''];

  const defaultFrom = name1 ?? '';
  const defaultTo = name2 ?? '';

  const [fromName, setFromName] = useState(defaultFrom);
  const [toName, setToName] = useState(defaultTo);
  const [unlockYears, setUnlockYears] = useState<UnlockYears>(1);
  const [letterText, setLetterText] = useState('');

  const [capsules, setCapsules] = useState<CapsuleSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ date: string; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weddingDate = manifest.logistics?.date ?? manifest.events?.[0]?.date;

  const computeUnlockDate = useCallback(
    (years: UnlockYears): Date => {
      const base = weddingDate ? parseLocalDate(weddingDate) : new Date();
      return addYears(base, years);
    },
    [weddingDate],
  );

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

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/time-capsule?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || 'Failed to delete. Please try again.');
        return;
      }
      setCapsules((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeleteConfirmId(null);
    }
  }

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
  const charOverLimit = charCount > 1800;
  const previewUnlockDate = formatDate(computeUnlockDate(unlockYears).toISOString());

  return (
    <PanelRoot>
      {/* Intro card — editorial opening spread */}
      <PanelSection
        title="Love-letter time capsules"
        eyebrow="Sealed for later"
        icon={MailCheck}
        hint="Write a letter to each other — sealed until your anniversary, delivered with a share link when the day arrives."
        collapsible={false}
      >
        {/* subtle decorative rule already supplied by PanelSection */}
        <p
          style={{
            margin: 0,
            fontFamily: panelFont.body,
            fontSize: panelText.body,
            color: 'var(--pl-chrome-text)',
            lineHeight: panelLineHeight.normal,
          }}
        >
          A tiny ritual: seal a few words today, open them years from now. Each letter
          lives behind a private share link — keep it somewhere you&apos;ll remember.
        </p>
      </PanelSection>

      {/* Sealed letters list */}
      {siteId && (
        <PanelSection
          title="Sealed letters"
          eyebrow="Archive"
          icon={Lock}
          badge={capsules.length || undefined}
        >
          {loadingList && (
            <div
              style={{
                fontFamily: panelFont.mono,
                fontSize: panelText.meta,
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.widest,
                textTransform: 'uppercase',
                color: 'var(--pl-chrome-text-muted)',
                textAlign: 'center',
                padding: '8px',
              }}
            >
              Loading
            </div>
          )}

          {!loadingList && capsules.length === 0 && (
            <div
              style={{
                padding: '18px 14px',
                textAlign: 'center',
                fontFamily: panelFont.body,
                fontStyle: 'italic',
                fontSize: panelText.hint,
                color: 'var(--pl-chrome-text-muted)',
                border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--pl-chrome-accent) 3%, transparent)',
                lineHeight: panelLineHeight.normal,
              }}
            >
              No letters sealed yet. Write your first one below.
            </div>
          )}

          <AnimatePresence>
            {capsules.map((capsule, i) => {
              const sealed = capsule.sealed;
              const isConfirming = deleteConfirmId === capsule.id;
              return (
                <motion.div
                  key={capsule.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isConfirming
                      ? 'color-mix(in srgb, var(--pl-chrome-danger) 6%, var(--pl-chrome-surface))'
                      : 'var(--pl-chrome-surface)',
                    border: '1px solid var(--pl-chrome-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: panelFont.mono,
                            fontSize: panelText.meta,
                            fontWeight: panelWeight.bold,
                            letterSpacing: panelTracking.widest,
                            color: 'var(--pl-chrome-accent)',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          style={{
                            fontFamily: panelFont.mono,
                            fontSize: panelText.meta,
                            letterSpacing: panelTracking.wider,
                            textTransform: 'uppercase',
                            color: 'var(--pl-chrome-text-faint)',
                          }}
                        >
                          {capsule.unlockYears} {capsule.unlockYears === 1 ? 'year' : 'years'}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: panelFont.display,
                          fontStyle: 'italic',
                          fontSize: panelText.itemTitle,
                          fontWeight: panelWeight.regular,
                          color: 'var(--pl-chrome-text)',
                          letterSpacing: '-0.01em',
                          lineHeight: panelLineHeight.tight,
                        }}
                      >
                        {capsule.fromName} → {capsule.toName}
                      </div>
                      <div
                        style={{
                          fontFamily: panelFont.body,
                          fontSize: panelText.hint,
                          color: 'var(--pl-chrome-text-muted)',
                          marginTop: '2px',
                        }}
                      >
                        Opens {formatDate(capsule.unlockDate)}
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '99px',
                        fontFamily: panelFont.mono,
                        fontSize: panelText.meta,
                        fontWeight: panelWeight.bold,
                        letterSpacing: panelTracking.widest,
                        textTransform: 'uppercase',
                        background: sealed
                          ? 'color-mix(in srgb, var(--pl-chrome-accent) 10%, transparent)'
                          : 'color-mix(in srgb, var(--pl-chrome-warning, #d4a53a) 10%, transparent)',
                        color: sealed ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-warning, #a87f1f)',
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      {sealed ? <Lock size={9} strokeWidth={2} /> : <Unlock size={9} strokeWidth={2} />}
                      {sealed ? 'Sealed' : 'Open'}
                    </span>
                  </div>

                  {isConfirming ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid color-mix(in srgb, var(--pl-chrome-danger) 28%, transparent)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: panelFont.body,
                          fontSize: panelText.hint,
                          fontStyle: 'italic',
                          color: 'var(--pl-chrome-danger)',
                        }}
                      >
                        Delete this letter forever?
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(capsule.id)}
                          style={{
                            ...pillMono,
                            padding: '6px 12px',
                            borderRadius: '99px',
                            border: '1px solid var(--pl-chrome-danger)',
                            background: 'var(--pl-chrome-danger)',
                            color: '#FFF',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          style={{
                            ...pillMono,
                            padding: '6px 12px',
                            borderRadius: '99px',
                            border: '1px solid var(--pl-chrome-border)',
                            background: 'transparent',
                            color: 'var(--pl-chrome-text-soft)',
                            cursor: 'pointer',
                          }}
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(capsule.id)}
                        title="Delete this letter"
                        aria-label="Delete this letter"
                        style={{
                          ...pillMono,
                          padding: '5px 10px',
                          borderRadius: '99px',
                          border: '1px solid var(--pl-chrome-border)',
                          background: 'transparent',
                          color: 'var(--pl-chrome-text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={10} strokeWidth={1.75} />
                        Delete
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {deleteError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--pl-chrome-danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--pl-chrome-danger) 28%, transparent)',
                color: 'var(--pl-chrome-danger)',
                fontFamily: panelFont.body,
                fontSize: panelText.hint,
                lineHeight: panelLineHeight.snug,
              }}
            >
              <AlertTriangle size={13} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span style={{ flex: 1 }}>{deleteError}</span>
              <button
                type="button"
                onClick={() => setDeleteError(null)}
                aria-label="Dismiss"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--pl-chrome-danger)',
                  fontSize: '14px',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          )}
        </PanelSection>
      )}

      {/* Success message */}
      <AnimatePresence>
        {successInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              margin: '0 10px 8px',
              padding: '14px 16px',
              background: 'color-mix(in srgb, var(--pl-chrome-accent) 8%, var(--pl-chrome-surface))',
              border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 32%, transparent)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: panelFont.display,
                fontStyle: 'italic',
                fontSize: panelText.itemTitle,
                fontWeight: panelWeight.regular,
                color: 'var(--pl-chrome-text)',
                letterSpacing: '-0.01em',
                lineHeight: panelLineHeight.tight,
              }}
            >
              <MailCheck size={14} strokeWidth={1.75} color="var(--pl-chrome-accent)" />
              Letter sealed — delivery set for {formatDate(successInfo.date)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span
                style={{
                  fontFamily: panelFont.mono,
                  fontSize: panelText.meta,
                  fontWeight: panelWeight.bold,
                  letterSpacing: panelTracking.widest,
                  textTransform: 'uppercase',
                  color: 'var(--pl-chrome-text-faint)',
                }}
              >
                Save this link — share it with each other
              </span>
              <div
                style={{
                  fontFamily: panelFont.mono,
                  fontSize: panelText.hint,
                  color: 'var(--pl-chrome-text)',
                  background: 'var(--pl-chrome-bg)',
                  border: '1px solid var(--pl-chrome-border)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  wordBreak: 'break-all',
                }}
              >
                pearloom.com/time-capsule/{successInfo.token}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Write a new letter */}
      <PanelSection title="Write a new letter" eyebrow="Compose" icon={MailCheck}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
          }}
        >
          <PanelField label="From">
            <PanelInput value={fromName} onChange={setFromName} placeholder="Your name" />
          </PanelField>
          <PanelField label="To">
            <PanelInput value={toName} onChange={setToName} placeholder="Their name" />
          </PanelField>
        </div>

        <PanelField
          label="Seal until"
          hint={`Opens ${previewUnlockDate}`}
        >
          <PanelSelect
            value={String(unlockYears)}
            onChange={(v) => setUnlockYears(Number(v) as UnlockYears)}
            options={[
              { value: '1', label: '1 year after the wedding' },
              { value: '5', label: '5 years after the wedding' },
              { value: '10', label: '10 years after the wedding' },
            ]}
          />
        </PanelField>

        <PanelField label="Your letter">
          <PanelTextarea
            value={letterText}
            onChange={setLetterText}
            placeholder={`Dear ${toName || '[Name]'},\n\n`}
            rows={12}
          />
          <div
            style={{
              marginTop: '6px',
              fontFamily: panelFont.mono,
              fontSize: panelText.meta,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.wider,
              textAlign: 'right',
              color: charOverLimit ? 'var(--pl-chrome-warning, #a87f1f)' : 'var(--pl-chrome-text-muted)',
              transition: 'color 0.18s ease',
            }}
          >
            {charCount} / 2000
          </div>
        </PanelField>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'color-mix(in srgb, var(--pl-chrome-danger) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--pl-chrome-danger) 28%, transparent)',
              color: 'var(--pl-chrome-danger)',
              fontFamily: panelFont.body,
              fontSize: panelText.hint,
              lineHeight: panelLineHeight.snug,
            }}
          >
            <AlertTriangle size={13} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        <motion.button
          type="button"
          onClick={handleSeal}
          disabled={saving}
          whileHover={saving ? {} : { y: -1 }}
          whileTap={saving ? {} : { scale: 0.98 }}
          style={{
            ...pillMono,
            width: '100%',
            padding: '12px 20px',
            borderRadius: '99px',
            background: 'var(--pl-chrome-accent)',
            color: 'var(--pl-chrome-accent-ink)',
            border: '1px solid var(--pl-chrome-accent)',
            opacity: saving ? 0.6 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {saving ? (
            'Sealing'
          ) : (
            <>
              <MailCheck size={12} strokeWidth={1.75} />
              Seal &amp; save letter ({unlockYears === 1 ? '1 year' : `${unlockYears} years`})
            </>
          )}
        </motion.button>
      </PanelSection>
    </PanelRoot>
  );
}
