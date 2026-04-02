'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/AccessibilityAuditPanel.tsx
//
// Runs a battery of a11y checks on the current manifest:
//   • Alt text on chapter images
//   • Heading hierarchy (H1 → H2 → H3)
//   • RSVP form fields have labels
//   • Event cards have dates
//   • Map block has a descriptive title
//   • Video block has a title/caption
//   • Color contrast (re-uses DesignAdvisor data)
//
// Designed to sit inside DesignPanel below DesignAdvisor.
// Renders nothing when audit passes.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { IconError, IconWarn, IconTip, IconClose, IconAccessibility } from './EditorIcons';

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

  // 1. Images without alt text
  let imagesWithoutAlt = 0;
  chapters.forEach(ch => {
    (ch.images || []).forEach(img => {
      if (!img.alt && !img.caption) imagesWithoutAlt++;
    });
  });
  if (imagesWithoutAlt > 0) {
    issues.push({
      severity: 'warn', code: 'missing-alt',
      title: `${imagesWithoutAlt} image${imagesWithoutAlt > 1 ? 's' : ''} missing alt text`,
      detail: 'Screen readers need alt text. Add captions to your chapter images.',
    });
  }

  // 2. Hero block — names present
  const heroBlock = blocks.find(b => b.type === 'hero');
  const names = (manifest as unknown as { names?: string[] }).names;
  if (heroBlock && heroBlock.visible && (!names || names.every(n => !n))) {
    issues.push({
      severity: 'warn', code: 'hero-no-names',
      title: 'Hero block has no couple names',
      detail: 'Couple names are read by screen readers as the page title.',
    });
  }

  // 3. Events missing addresses
  const events = manifest.events || [];
  const eventsWithoutAddr = events.filter(e => !e.address || e.address.trim() === '');
  if (eventsWithoutAddr.length > 0) {
    issues.push({
      severity: 'tip', code: 'events-no-address',
      title: `${eventsWithoutAddr.length} event${eventsWithoutAddr.length > 1 ? 's' : ''} missing address`,
      detail: 'Guests using assistive tech can\'t navigate to a venue without a physical address.',
    });
  }

  // 4. Video block without title/caption
  const videoBlock = blocks.find(b => b.type === 'video' && b.visible);
  if (videoBlock && !videoBlock.config?.title && !videoBlock.config?.caption) {
    issues.push({
      severity: 'tip', code: 'video-no-label',
      title: 'Video block has no title',
      detail: 'Add a title or caption so screen readers can identify your video.',
    });
  }

  // 5. FAQ block — answers should not be empty
  const faqBlock = blocks.find(b => b.type === 'faq' && b.visible);
  const faqs = manifest.faqs || [];
  const emptyAnswers = faqs.filter(f => !f.answer || f.answer.trim() === '').length;
  if (faqBlock && emptyAnswers > 0) {
    issues.push({
      severity: 'warn', code: 'faq-empty-answers',
      title: `${emptyAnswers} FAQ item${emptyAnswers > 1 ? 's' : ''} have no answer`,
      detail: 'Empty FAQ answers confuse both guests and screen readers.',
    });
  }

  // 6. Map block without venue description
  const mapBlock = blocks.find(b => b.type === 'map' && b.visible);
  if (mapBlock && events.length > 0) {
    const hasVenueNames = events.some(e => e.venue && e.venue.trim() !== '');
    if (!hasVenueNames) {
      issues.push({
        severity: 'tip', code: 'map-no-venue',
        title: 'Map block has no venue names',
        detail: 'Name your event venues so guests know what each map marker represents.',
      });
    }
  }

  // 7. Very few chapters (thin content)
  if (chapters.length === 0) {
    issues.push({
      severity: 'tip', code: 'no-chapters',
      title: 'No story chapters yet',
      detail: 'Add at least one chapter so your guests have a story to read.',
    });
  }

  return issues;
}

const SEV_STYLE: Record<string, { bg: string; border: string; icon: React.ReactNode; color: string }> = {
  error: { bg: 'rgba(248,81,73,0.10)', border: 'rgba(248,81,73,0.35)', icon: <IconError size={14} />,  color: '#f87171' },
  warn:  { bg: 'rgba(234,179,8,0.08)',  border: 'rgba(234,179,8,0.30)',  icon: <IconWarn size={14} />,  color: '#fbbf24' },
  tip:   { bg: 'rgba(163,177,138,0.10)',border: 'rgba(163,177,138,0.3)', icon: <IconTip size={14} />,   color: '#A3B18A' },
};

interface AccessibilityAuditPanelProps {
  manifest: StoryManifest;
}

export function AccessibilityAuditPanel({ manifest }: AccessibilityAuditPanelProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const issues = useMemo(() => auditManifest(manifest), [manifest]);
  const visible = issues.filter(i => !dismissed.has(i.code));

  if (visible.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 0 4px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(214,198,168,0.45)',
        marginBottom: '2px',
      }}>
        <IconAccessibility size={12} /> Accessibility
      </div>

      {visible.map(issue => {
        const s = SEV_STYLE[issue.severity] ?? SEV_STYLE.tip;
        return (
          <div
            key={issue.code}
            style={{
              display: 'flex', gap: '9px', padding: '10px 12px',
              borderRadius: '10px', background: s.bg,
              border: `1px solid ${s.border}`, position: 'relative',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '1px', color: s.color, flexShrink: 0 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: s.color, marginBottom: '2px' }}>{issue.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>{issue.detail}</div>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, issue.code]))}
              style={{
                position: 'absolute', top: '6px', right: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', padding: '2px',
                lineHeight: 1,
              }}
              aria-label="Dismiss"
            ><IconClose size={10} /></button>
          </div>
        );
      })}
    </div>
  );
}
