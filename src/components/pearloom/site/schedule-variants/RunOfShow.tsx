// ──────────────────────────────────────────────────────────────
// Schedule variant: Run of show
// A program-style timeline: vertical accent rail with a dot per
// event, but unlike `timeline` (which stacks time on top, name
// below), run-of-show puts each row as a single horizontal line:
// time badge — name — subtitle. Denser, more printable, reads
// like a stage manager's call sheet.
//
// Distinct from `timeline` by:
//  - Single-line row composition (vs. stacked)
//  - Time stamped as a small accent pill on the rail (vs. large
//    display number above the row)
//  - Subtler row spacing for a tighter, programme-card feel
//  - Optional hairline between rows in addition to the rail
// ──────────────────────────────────────────────────────────────

import { EditableText } from '../../editor/canvas/EditableText';
import { EditableField } from '../../editor/canvas/EditableField';
import {
  type ScheduleVariantProps,
  splitTime,
  makePatchEvent,
} from './types';

export function ScheduleRunOfShow({ events, onEditField }: ScheduleVariantProps) {
  if (events.length === 0) return null;
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        position: 'relative',
        paddingLeft: 56,
      }}
    >
      {/* Accent rail down the left edge. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 22,
          top: 10,
          bottom: 10,
          width: 1,
          background: 'var(--t-accent, var(--peach-ink, #C6703D))',
          opacity: 0.45,
        }}
      />
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        const patch = makePatchEvent(onEditField, e.id, i);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 2,
              padding: '12px 0',
              borderBottom:
                i < events.length - 1
                  ? '1px solid var(--t-line-soft, var(--line-soft, rgba(14,13,11,0.08)))'
                  : 'none',
            }}
          >
            {/* Dot on the rail — solid accent disk with paper-color
                ring so it punches against the rail. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: -42,
                top: 18,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--t-accent, var(--peach-ink, #C6703D))',
                border: '2.5px solid var(--t-paper, var(--cream, #F5EFE2))',
                boxShadow: '0 0 0 1px var(--t-accent, var(--peach-ink, #C6703D))',
              }}
            />
            {/* Top line: time badge + name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <span
                className="pl8-schedule-time"
                style={{
                  fontFamily: 'var(--t-mono, "Geist Mono", ui-monospace, monospace)',
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'var(--t-accent-bg, color-mix(in oklab, var(--t-accent, #C6703D) 12%, transparent))',
                  color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {t}
                {m && <span style={{ marginLeft: 4, opacity: 0.75 }}>{m}</span>}
              </span>
              <EditableText
                as="span"
                value={e.name}
                onSave={patch('name')}
                ariaLabel={`Schedule item ${i + 1} title`}
                maxLength={120}
                placeholder="Event name"
                style={{
                  fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
                  fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
                  fontSize: 17,
                  color: 'var(--t-ink, var(--ink, #0E0D0B))',
                  lineHeight: 1.2,
                }}
              />
            </div>
            {/* Subtitle / description */}
            <EditableField
              as="div"
              context={`Schedule item ${i + 1} description`}
              value={e.description ?? ''}
              onSave={patch('description')}
              multiline
              placeholder="Add a detail…"
              ariaLabel={`Schedule item ${i + 1} description`}
              maxLength={240}
              style={{
                fontSize: 13,
                color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
                marginLeft: 2,
                lineHeight: 1.5,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
