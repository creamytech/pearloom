'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/AnniversaryNudgePanel.tsx
// Shows a warm anniversary nudge banner when the couple is near
// their anniversary date, with a "Generate anniversary chapter" CTA.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor } from '@/lib/editor-state';
import {
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';

// ── Helpers ────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function isNearAnniversary(
  weddingDateStr: string,
  today: Date,
  windowDays = 7
): { near: boolean; today: boolean; yearsAgo: number } {
  const wedding = new Date(weddingDateStr);
  if (isNaN(wedding.getTime())) return { near: false, today: false, yearsAgo: 0 };

  const thisYearAnn = new Date(
    today.getFullYear(),
    wedding.getMonth(),
    wedding.getDate()
  );

  const yearsAgo = today.getFullYear() - wedding.getFullYear();
  if (yearsAgo <= 0) return { near: false, today: false, yearsAgo: 0 };

  const diff = daysBetween(today, thisYearAnn);
  return {
    near: diff <= windowDays,
    today: diff < 1,
    yearsAgo,
  };
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Component ──────────────────────────────────────────────────

export function AnniversaryNudgePanel() {
  const { manifest, state } = useEditor();
  const subdomain = state.subdomain;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  // Visibility conditions
  const occasion = manifest?.occasion;
  const weddingDate = manifest?.logistics?.date;

  // Generalised from just wedding/anniversary — any occasion with a
  // date that has passed can show a milestone-recap nudge.
  const isEligible =
    (occasion === 'wedding' ||
      occasion === 'anniversary' ||
      occasion === 'engagement' ||
      occasion === 'birthday') &&
    Boolean(weddingDate);

  const [annInfo, setAnnInfo] = useState<{
    near: boolean;
    today: boolean;
    yearsAgo: number;
  }>({ near: false, today: false, yearsAgo: 0 });

  useEffect(() => {
    if (!weddingDate) return;
    const today = new Date();
    setAnnInfo(isNearAnniversary(weddingDate, today, 7));
  }, [weddingDate]);

  // Only show when wedding date is in the past AND we are near the anniversary
  const visible =
    isEligible &&
    annInfo.yearsAgo > 0 &&
    (annInfo.near || annInfo.yearsAgo > 0) && // always show for post-wedding sites
    !dismissed;

  if (!visible) return null;

  async function generateChapter() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/anniversary/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong.');
      } else if (data.skipped) {
        setError(data.reason || 'Skipped.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const milestoneNoun =
    occasion === 'birthday'
      ? 'birthday'
      : occasion === 'engagement'
        ? 'engagement'
        : 'anniversary';
  const badgeLabel = annInfo.today
    ? `✦ ${ordinal(annInfo.yearsAgo)} ${milestoneNoun} today`
    : annInfo.near
    ? `✦ ${ordinal(annInfo.yearsAgo)} ${milestoneNoun} this week`
    : `✦ ${ordinal(annInfo.yearsAgo)} ${milestoneNoun}`;

  return (
    <AnimatePresence>
      <motion.div
        key="anniversary-nudge"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{
          margin: '0 0 20px',
          padding: '16px 18px',
          background: '#FAFAFA',
          border: '1px solid #E4E4E7',
          borderRadius: 12,
          position: 'relative',
        }}
      >
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            background: 'none',
            border: 'none',
            color: '#71717A',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>

        {/* Badge */}
        <motion.div
          animate={
            annInfo.today || annInfo.near
              ? { opacity: [0.7, 1, 0.7] }
              : {}
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'inline-block',
            marginBottom: 10,
            padding: '3px 10px',
            background: '#F4F4F5',
            border: '1px solid #E4E4E7',
            borderRadius: 20,
            fontSize: panelText.hint,
            letterSpacing: panelTracking.wider,
            textTransform: 'uppercase',
            color: '#71717A',
            fontFamily: 'Georgia, serif',
          }}
        >
          {badgeLabel}
        </motion.div>

        {success ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontSize: panelText.body,
              color: '#3F3F46',
              lineHeight: panelLineHeight.snug,
            }}
          >
            Chapter added! Scroll down to see it.
          </motion.div>
        ) : (
          <>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: panelText.body,
                color: '#3F3F46',
                lineHeight: panelLineHeight.snug,
              }}
            >
              Add an anniversary chapter — a look back at the year and forward
              with hope.
            </p>

            {error && (
              <p
                style={{
                  margin: '0 0 10px',
                  fontSize: panelText.body,
                  color: '#b34747',
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={generateChapter}
              disabled={loading}
              style={{
                padding: '9px 18px',
                background: loading ? '#F4F4F5' : '#18181B',
                border: 'none',
                borderRadius: 8,
                color: loading ? '#71717A' : '#FFFFFF',
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'Georgia, serif',
                transition: 'all var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {loading
                ? `Writing your ${ordinal(annInfo.yearsAgo)}-year chapter…`
                : 'Generate anniversary chapter'}
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
