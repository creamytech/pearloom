'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/AccessibilityAuditPanel.tsx
//
// Runs a battery of a11y checks on the current manifest and renders
// results in the editorial chrome: mono eyebrows, Fraunces italic
// issue titles, and severity-coded cards on cream paper. Meant to
// slot inside DesignPanel below DesignAdvisor.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { StoryManifest } from '@/types';
import { IconError, IconWarn, IconTip, IconClose, IconAccessibility } from './EditorIcons';
import {
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

interface A11yIssue {
  code: string;
  severity: 'error' | 'warn' | 'tip';
  title: string;
  detail: string;
}

// ── Run checks ────────────────────────────────────────────────
function auditManifest(manifest: StoryManifest): A11yIssue[] {
  const issues: A11yIssue[] = [];
  const blocks = manifest.blocks || [];
  const chapters = manifest.chapters || [];

  let imagesWithoutAlt = 0;
  chapters.forEach((ch) => {
    (ch.images || []).forEach((img) => {
      if (!img.alt && !img.caption) imagesWithoutAlt++;
    });
  });
  if (imagesWithoutAlt > 0) {
    issues.push({
      severity: 'warn',
      code: 'missing-alt',
      title: `${imagesWithoutAlt} image${imagesWithoutAlt > 1 ? 's' : ''} missing alt text`,
      detail: 'Screen readers need alt text. Add captions to your chapter images.',
    });
  }

  const heroBlock = blocks.find((b) => b.type === 'hero');
  const names = (manifest as unknown as { names?: string[] }).names;
  if (heroBlock && heroBlock.visible && (!names || names.every((n) => !n))) {
    issues.push({
      severity: 'warn',
      code: 'hero-no-names',
      title: 'Hero block has no couple names',
      detail: 'Couple names are read by screen readers as the page title.',
    });
  }

  const events = manifest.events || [];
  const eventsWithoutAddr = events.filter((e) => !e.address || e.address.trim() === '');
  if (eventsWithoutAddr.length > 0) {
    issues.push({
      severity: 'tip',
      code: 'events-no-address',
      title: `${eventsWithoutAddr.length} event${eventsWithoutAddr.length > 1 ? 's' : ''} missing address`,
      detail: "Guests using assistive tech can't navigate to a venue without a physical address.",
    });
  }

  const videoBlock = blocks.find((b) => b.type === 'video' && b.visible);
  if (videoBlock && !videoBlock.config?.title && !videoBlock.config?.caption) {
    issues.push({
      severity: 'tip',
      code: 'video-no-label',
      title: 'Video block has no title',
      detail: 'Add a title or caption so screen readers can identify your video.',
    });
  }

  const faqBlock = blocks.find((b) => b.type === 'faq' && b.visible);
  const faqs = manifest.faqs || [];
  const emptyAnswers = faqs.filter((f) => !f.answer || f.answer.trim() === '').length;
  if (faqBlock && emptyAnswers > 0) {
    issues.push({
      severity: 'warn',
      code: 'faq-empty-answers',
      title: `${emptyAnswers} FAQ item${emptyAnswers > 1 ? 's' : ''} have no answer`,
      detail: 'Empty FAQ answers confuse both guests and screen readers.',
    });
  }

  const mapBlock = blocks.find((b) => b.type === 'map' && b.visible);
  if (mapBlock && events.length > 0) {
    const hasVenueNames = events.some((e) => e.venue && e.venue.trim() !== '');
    if (!hasVenueNames) {
      issues.push({
        severity: 'tip',
        code: 'map-no-venue',
        title: 'Map block has no venue names',
        detail: 'Name your event venues so guests know what each map marker represents.',
      });
    }
  }

  if (chapters.length === 0) {
    issues.push({
      severity: 'tip',
      code: 'no-chapters',
      title: 'No story chapters yet',
      detail: 'Add at least one chapter so your guests have a story to read.',
    });
  }

  return issues;
}

// ── Severity palette bound to chrome tokens ──────────────────
const SEV_STYLE: Record<
  A11yIssue['severity'],
  {
    bg: string;
    border: string;
    icon: React.ReactNode;
    color: string;
    label: string;
  }
> = {
  error: {
    bg: 'color-mix(in srgb, var(--pl-chrome-danger) 10%, transparent)',
    border: 'color-mix(in srgb, var(--pl-chrome-danger) 32%, transparent)',
    icon: <IconError size={14} />,
    color: 'var(--pl-chrome-danger)',
    label: 'Error',
  },
  warn: {
    bg: 'color-mix(in srgb, var(--pl-chrome-warning, #d4a53a) 10%, transparent)',
    border: 'color-mix(in srgb, var(--pl-chrome-warning, #d4a53a) 30%, transparent)',
    icon: <IconWarn size={14} />,
    color: 'var(--pl-chrome-warning, #a87f1f)',
    label: 'Review',
  },
  tip: {
    bg: 'color-mix(in srgb, var(--pl-chrome-accent) 5%, transparent)',
    border: 'color-mix(in srgb, var(--pl-chrome-accent) 24%, transparent)',
    icon: <IconTip size={14} />,
    color: 'var(--pl-chrome-accent)',
    label: 'Suggestion',
  },
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: panelFont.mono,
  fontSize: panelText.meta,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.widest,
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-faint)',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  lineHeight: 1,
};

interface AccessibilityAuditPanelProps {
  manifest: StoryManifest;
}

export function AccessibilityAuditPanel({ manifest }: AccessibilityAuditPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const issues = useMemo(() => auditManifest(manifest), [manifest]);
  const visible = issues.filter((i) => !dismissed.has(i.code));

  if (visible.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={eyebrowStyle}>
          <IconAccessibility size={11} /> Accessibility
        </div>
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'color-mix(in srgb, var(--pl-chrome-accent) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 28%, transparent)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--pl-chrome-accent)',
              color: 'var(--pl-chrome-accent-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Check size={14} strokeWidth={2} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: panelFont.display,
                fontStyle: 'italic',
                fontSize: panelText.itemTitle,
                fontWeight: panelWeight.regular,
                color: 'var(--pl-chrome-text)',
                lineHeight: panelLineHeight.tight,
                letterSpacing: '-0.01em',
              }}
            >
              All clear
            </div>
            <div
              style={{
                fontFamily: panelFont.body,
                fontSize: panelText.hint,
                color: 'var(--pl-chrome-text-muted)',
                marginTop: '3px',
                lineHeight: panelLineHeight.snug,
              }}
            >
              Your site passes the built-in accessibility checks.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={eyebrowStyle}>
          <IconAccessibility size={11} /> Accessibility
        </div>
        <span
          style={{
            fontFamily: panelFont.mono,
            fontSize: panelText.meta,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.wider,
            color: 'var(--pl-chrome-text-muted)',
            padding: '3px 9px',
            borderRadius: '99px',
            background: 'var(--pl-chrome-accent-soft)',
          }}
        >
          {String(visible.length).padStart(2, '0')}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visible.map((issue) => {
          const s = SEV_STYLE[issue.severity] ?? SEV_STYLE.tip;
          return (
            <div
              key={issue.code}
              style={{
                display: 'flex',
                gap: '10px',
                padding: '12px 14px 12px 12px',
                borderRadius: '10px',
                background: s.bg,
                border: `1px solid ${s.border}`,
                position: 'relative',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingTop: '2px',
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0, paddingRight: '14px' }}>
                <div
                  style={{
                    fontFamily: panelFont.mono,
                    fontSize: panelText.meta,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: s.color,
                    marginBottom: '4px',
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: panelFont.display,
                    fontStyle: 'italic',
                    fontSize: panelText.itemTitle,
                    fontWeight: panelWeight.regular,
                    color: 'var(--pl-chrome-text)',
                    lineHeight: panelLineHeight.tight,
                    letterSpacing: '-0.01em',
                    marginBottom: '4px',
                  }}
                >
                  {issue.title}
                </div>
                <div
                  style={{
                    fontFamily: panelFont.body,
                    fontSize: panelText.hint,
                    color: 'var(--pl-chrome-text-muted)',
                    lineHeight: panelLineHeight.normal,
                  }}
                >
                  {issue.detail}
                </div>
              </div>
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, issue.code]))}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--pl-chrome-text-muted)',
                  padding: '2px',
                  lineHeight: 1,
                  borderRadius: '4px',
                }}
                aria-label="Dismiss"
              >
                <IconClose size={10} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
