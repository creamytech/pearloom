'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/DesignAdvisor.tsx
//
// Inline design coach that surfaces two tiers of feedback:
//
//   1. Instant rules  — WCAG contrast + harmony checks run
//                       synchronously on every palette change.
//   2. AI suggestions — Debounced Gemini call (1.5s) for nuanced
//                       advice the rules can't catch.
//
// Renders nothing when everything looks great.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { detectPaletteIssues, type DesignIssue } from '@/lib/color-utils';
import type { AISuggestion } from '@/app/api/design-advisor/route';
import type { ThemeSchema, StoryManifest } from '@/types';
import { IconError, IconWarn, IconTip, IconCheck, IconClose, IconPalette, IconSparkle } from './EditorIcons';

interface DesignAdvisorProps {
  manifest: StoryManifest;
}

// ── Severity styling ──────────────────────────────────────────
const SEV = {
  error: { bg: 'rgba(248,81,73,0.10)', border: 'rgba(248,81,73,0.35)', icon: <IconError size={14} />, label: 'Accessibility issue', color: '#f87171' },
  warn:  { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.30)',  icon: <IconWarn size={14} />,  label: 'Design tip',         color: '#fbbf24' },
  tip:   { bg: 'rgba(163,177,138,0.10)',border: 'rgba(163,177,138,0.3)', icon: <IconTip size={14} />,   label: 'Suggestion',         color: '#A3B18A' },
  ok:    { bg: 'rgba(163,177,138,0.08)',border: 'rgba(163,177,138,0.2)', icon: <IconCheck size={14} />, label: 'Looks great',        color: '#A3B18A' },
};

function IssueCard({ severity, title, detail, onDismiss }: {
  severity: keyof typeof SEV; title: string; detail: string; onDismiss?: () => void;
}) {
  const s = SEV[severity] ?? SEV.tip;
  return (
    <div style={{
      display: 'flex', gap: '9px', padding: '10px 12px',
      borderRadius: '10px', background: s.bg,
      border: `1px solid ${s.border}`,
      position: 'relative',
    }}>
      <span style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '1px', color: s.color, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: s.color, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{detail}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute', top: '6px', right: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.2)', padding: '2px',
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Dismiss"
        ><IconClose size={10} /></button>
      )}
    </div>
  );
}

export function DesignAdvisor({ manifest }: DesignAdvisorProps) {
  const colors = manifest.theme?.colors;
  const meshPreset = manifest.theme?.effects?.gradientMesh?.preset;
  const occasion = (manifest.occasion as string | undefined) ?? 'wedding';
  const vibeTone = manifest.vibeSkin?.tone;

  // ── Instant rule-based issues ─────────────────────────────
  const [ruleIssues, setRuleIssues] = useState<DesignIssue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!colors) return;
    const issues = detectPaletteIssues({
      background:  colors.background  || '#fff',
      foreground:  colors.foreground  || '#000',
      accent:      colors.accent      || '#000',
      accentLight: colors.accentLight || '#fff',
      muted:       colors.muted       || '#888',
      cardBg:      colors.cardBg      || '#fff',
      meshPreset,
    });
    setRuleIssues(issues);
    // Clear dismissals for codes that no longer exist
    setDismissed(prev => {
      const activeCodes = new Set(issues.map(i => i.code));
      const next = new Set([...prev].filter(c => activeCodes.has(c)));
      return next.size === prev.size ? prev : next;
    });
  }, [colors, meshPreset]);

  const visibleRuleIssues = ruleIssues.filter(i => !dismissed.has(i.code));

  // ── AI suggestions (debounced) ────────────────────────────
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDismissed, setAiDismissed] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last colors we fetched for to avoid redundant calls
  const lastFetchRef = useRef<string>('');

  useEffect(() => {
    if (!colors) return;
    const key = JSON.stringify({ colors, meshPreset });
    if (key === lastFetchRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastFetchRef.current = key;
      setAiLoading(true);
      setAiDismissed(new Set()); // reset dismissals on palette change
      try {
        const res = await fetch('/api/design-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colors, meshPreset, occasion, vibeTone }),
        });
        if (res.ok) {
          const { suggestions } = await res.json();
          setAiSuggestions(Array.isArray(suggestions) ? suggestions : []);
        }
      } catch {
        // AI unavailable — silent fail, rule-based checks still show
      } finally {
        setAiLoading(false);
      }
    }, 1500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, meshPreset, occasion, vibeTone]);

  const visibleAiSuggestions = aiSuggestions.filter((_, i) => !aiDismissed.has(i));

  // ── Render nothing if no issues and AI is quiet ───────────
  const hasAnything = visibleRuleIssues.length > 0 || aiLoading || visibleAiSuggestions.length > 0;
  if (!hasAnything) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 0 4px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(214,198,168,0.45)',
        marginBottom: '2px',
      }}>
        <IconPalette size={12} /> Design Advisor
      </div>

      {/* Rule-based issues */}
      {visibleRuleIssues.map(issue => (
        <IssueCard
          key={issue.code}
          severity={issue.severity}
          title={issue.title}
          detail={issue.detail}
          onDismiss={() => setDismissed(prev => new Set([...prev, issue.code]))}
        />
      ))}

      {/* AI suggestions */}
      {visibleAiSuggestions.map((s, i) => (
        <IssueCard
          key={`ai-${i}`}
          severity={s.severity === 'warn' ? 'warn' : 'tip'}
          title={s.title}
          detail={s.detail}
          onDismiss={() => setAiDismissed(prev => new Set([...prev, i]))}
        />
      ))}

      {/* Loading state — only show while fetching and no results yet */}
      {aiLoading && aiSuggestions.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '8px',
          background: 'rgba(163,177,138,0.05)',
          border: '1px solid rgba(163,177,138,0.12)',
        }}>
          <span style={{ animation: 'pl-spin 1s linear infinite', display: 'flex', alignItems: 'center', color: 'rgba(163,177,138,0.7)' }}><IconSparkle size={13} /></span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>Analysing your palette…</span>
          <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
