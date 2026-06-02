// ──────────────────────────────────────────────────────────────
// Schedule variant: Cards
// Prototype source: ClaudeDesign/shared/kits.jsx KSchedule default
// (lines 214–224) — a grid of card tiles, each centered with
// display time + AM/PM eyebrow on top, bold name, muted blurb.
// Honors var(--t-paper), var(--t-card), var(--t-accent-ink),
// var(--t-ink-muted) from the active Edition/Kit theme.
// ──────────────────────────────────────────────────────────────

import { EditableText } from '../../editor/canvas/EditableText';
import { EditableField } from '../../editor/canvas/EditableField';
import {
  type ScheduleVariantProps,
  splitTime,
  makePatchEvent,
} from './types';

export function ScheduleCards({ events, onEditField }: ScheduleVariantProps) {
  if (events.length === 0) return null;
  // Cap the column count at 4 so card width stays readable.
  const cols = Math.min(events.length, 4);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 14,
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        const patch = makePatchEvent(onEditField, e.id, i);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-card"
            style={{
              padding: 18,
              textAlign: 'center',
              background: 'var(--t-card, var(--card, #FBF7EE))',
              border: '1px solid var(--t-line-soft, var(--line-soft, rgba(14,13,11,0.10)))',
              borderRadius: 'var(--t-radius-md, 8px)',
              boxShadow: 'var(--t-shadow, 0 1px 3px rgba(14,13,11,0.06))',
            }}
          >
            <div
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
                fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
                fontSize: 26,
                lineHeight: 1,
                color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
              }}
            >
              {t}
              {m && (
                <span
                  style={{
                    fontSize: 12,
                    marginLeft: 3,
                    color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
                  }}
                >
                  {m}
                </span>
              )}
            </div>
            <EditableText
              as="div"
              value={e.name}
              onSave={patch('name')}
              ariaLabel={`Schedule item ${i + 1} title`}
              maxLength={120}
              placeholder="Event name"
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginTop: 8,
                color: 'var(--t-ink, var(--ink, #0E0D0B))',
              }}
            />
            <EditableField
              as="div"
              context={`Schedule item ${i + 1} description`}
              value={e.description ?? ''}
              onSave={patch('description')}
              multiline
              placeholder="What guests can expect…"
              ariaLabel={`Schedule item ${i + 1} description`}
              maxLength={240}
              style={{
                fontSize: 12,
                color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
                marginTop: 2,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
