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
import {
  validateTypography, temperatureAdvice, detectContentNudges,
  suggestChapterLayouts, checkVisualRhythm, checkResponsiveIssues,
  type TypographyIssue, type ContentNudge,
} from '@/lib/smart-features';
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
  tip:   { bg: 'rgba(24,24,27,0.10)',border: '#E4E4E7', icon: <IconTip size={14} />,   label: 'Suggestion',         color: '#71717A' },
  ok:    { bg: 'rgba(24,24,27,0.04)',border: 'rgba(24,24,27,0.1)', icon: <IconCheck size={14} />, label: 'Looks great',        color: '#71717A' },
};

function IssueCard({ severity, title, detail, onDismiss }: {
  severity: keyof typeof SEV; title: string; detail: string; onDismiss?: () => void;
}) {
  const s = SEV[severity] ?? SEV.tip;
  return (
    <div style={{
      display: 'flex', gap: '9px', padding: '8px 10px',
      borderRadius: '10px', background: s.bg,
      border: `1px solid ${s.border}`,
      position: 'relative',
    }}>
      <span style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '1px', color: s.color, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: s.color, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontSize: '0.7rem', color: '#3F3F46', lineHeight: 1.55 }}>{detail}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute', top: '6px', right: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#71717A', padding: '2px',
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

  // ── Typography validation ────────────────────────────────
  const typoIssues = manifest.vibeSkin?.fonts
    ? validateTypography(manifest.vibeSkin.fonts.heading, manifest.vibeSkin.fonts.body)
        .filter(i => i.severity !== 'ok')
    : [];

  // ── Photo color temperature advice ───────────────────────
  const photoColors = manifest.chapters?.flatMap(ch =>
    (ch.images || []).slice(0, 1)
  ).length ? [] : []; // Placeholder — uses dominantColors when available
  // Use vibeSkin palette colors as proxy for photo temperature
  const tempColors = manifest.vibeSkin?.palette
    ? [manifest.vibeSkin.palette.accent, manifest.vibeSkin.palette.accent2, manifest.vibeSkin.palette.background]
    : [];
  const tempAdvice = tempColors.length ? temperatureAdvice(tempColors) : null;

  // ── Content completeness nudges ──────────────────────────
  const contentNudges = detectContentNudges(manifest);
  const highNudges = contentNudges.filter(n => n.priority === 'high');
  const medNudges = contentNudges.filter(n => n.priority === 'medium').slice(0, 2);

  // ── Layout suggestions ─────────────────────────────────
  const layoutSuggestions = suggestChapterLayouts(manifest.chapters || []).slice(0, 2);

  // ── Visual rhythm ──────────────────────────────────────
  const rhythmIssues = checkVisualRhythm(manifest.blocks || []);

  // ── Responsive warnings ────────────────────────────────
  const responsiveWarnings = checkResponsiveIssues(manifest.blocks || [], manifest.chapters);

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
  const hasAnything = visibleRuleIssues.length > 0 || aiLoading || visibleAiSuggestions.length > 0
    || typoIssues.length > 0 || highNudges.length > 0 || medNudges.length > 0
    || layoutSuggestions.length > 0 || rhythmIssues.length > 0 || responsiveWarnings.length > 0;
  if (!hasAnything) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 0 4px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#71717A',
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

      {/* Typography issues */}
      {typoIssues.map((issue, i) => (
        <IssueCard
          key={`typo-${i}`}
          severity={issue.severity === 'error' ? 'error' : 'warn'}
          title={issue.title}
          detail={`${issue.detail}${issue.suggestion ? ` ${issue.suggestion}` : ''}`}
          onDismiss={() => setDismissed(prev => new Set([...prev, `typo-${i}`]))}
        />
      ))}

      {/* Color temperature advice */}
      {tempAdvice && tempAdvice.suggestion !== 'neutral' && (
        <IssueCard
          severity="tip"
          title={`Your palette feels ${tempAdvice.suggestion}`}
          detail={tempAdvice.description}
          onDismiss={() => setDismissed(prev => new Set([...prev, 'color-temp']))}
        />
      )}

      {/* Content completeness nudges */}
      {[...highNudges, ...medNudges].filter(n => !dismissed.has(n.id)).map(nudge => (
        <IssueCard
          key={nudge.id}
          severity={nudge.priority === 'high' ? 'warn' : 'tip'}
          title={nudge.title}
          detail={nudge.description}
          onDismiss={() => setDismissed(prev => new Set([...prev, nudge.id]))}
        />
      ))}

      {/* Layout suggestions */}
      {layoutSuggestions.filter(s => !dismissed.has(`layout-${s.chapterId}`)).map(s => (
        <IssueCard
          key={`layout-${s.chapterId}`}
          severity="tip"
          title={`Try "${s.suggestedLayout}" layout`}
          detail={s.reason}
          onDismiss={() => setDismissed(prev => new Set([...prev, `layout-${s.chapterId}`]))}
        />
      ))}

      {/* Visual rhythm issues */}
      {rhythmIssues.filter((_, i) => !dismissed.has(`rhythm-${i}`)).map((issue, i) => (
        <IssueCard
          key={`rhythm-${i}`}
          severity={issue.severity}
          title={issue.title}
          detail={`${issue.detail}${issue.suggestion ? ` ${issue.suggestion}` : ''}`}
          onDismiss={() => setDismissed(prev => new Set([...prev, `rhythm-${i}`]))}
        />
      ))}

      {/* Responsive warnings */}
      {responsiveWarnings.filter((_, i) => !dismissed.has(`responsive-${i}`)).map((w, i) => (
        <IssueCard
          key={`responsive-${i}`}
          severity={w.severity}
          title={w.title}
          detail={w.detail}
          onDismiss={() => setDismissed(prev => new Set([...prev, `responsive-${i}`]))}
        />
      ))}

      {/* Loading state — only show while fetching and no results yet */}
      {aiLoading && aiSuggestions.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: '8px',
          background: 'rgba(24,24,27,0.04)',
          border: '1px solid #F4F4F5',
        }}>
          <span style={{ animation: 'pl-spin 1s linear infinite', display: 'flex', alignItems: 'center', color: '#71717A' }}><IconSparkle size={13} /></span>
          <span style={{ fontSize: '0.7rem', color: '#71717A' }}>Analysing your palette…</span>
          <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
