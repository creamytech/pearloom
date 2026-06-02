// ──────────────────────────────────────────────────────────────
// Schedule variant: List
// Prototype source: ClaudeDesign/shared/kits.jsx KSchedule 'list'
// variant (lines 202–212) — `92px 1fr` two-column grid. Display
// time + AM/PM on the left, bold name + muted subtitle on the
// right. Hairline border-bottom between rows. Reads like a
// printed program — denser than cards, more editorial than the
// rail-based timeline.
// ──────────────────────────────────────────────────────────────

import { EditableText } from '../../editor/canvas/EditableText';
import { EditableField } from '../../editor/canvas/EditableField';
import {
  type ScheduleVariantProps,
  splitTime,
  makePatchEvent,
} from './types';

export function ScheduleList({ events, onEditField }: ScheduleVariantProps) {
  if (events.length === 0) return null;
  return (
    <div
      style={{
        maxWidth: 620,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {events.map((e, i) => {
        const { t, m } = splitTime(e.time);
        const patch = makePatchEvent(onEditField, e.id, i);
        return (
          <div
            key={e.id ?? i}
            className="pl8-schedule-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '92px 1fr',
              gap: 18,
              alignItems: 'baseline',
              padding: '16px 0',
              borderBottom:
                i < events.length - 1
                  ? '1px solid var(--t-line-soft, var(--line-soft, rgba(14,13,11,0.10)))'
                  : 'none',
            }}
          >
            <div
              className="pl8-schedule-time"
              style={{
                fontFamily: 'var(--t-display, var(--font-display, Fraunces, Georgia, serif))',
                fontWeight: 'var(--t-display-wght, var(--pl-display-wght, 600))',
                fontSize: 24,
                color: 'var(--t-accent-ink, var(--peach-ink, #C6703D))',
              }}
            >
              {t}
              {m && (
                <span
                  style={{
                    fontSize: 11,
                    marginLeft: 3,
                    color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
                  }}
                >
                  {m}
                </span>
              )}
            </div>
            <div>
              <EditableText
                as="div"
                value={e.name}
                onSave={patch('name')}
                ariaLabel={`Schedule item ${i + 1} title`}
                maxLength={120}
                placeholder="Event name"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
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
                  fontSize: 13,
                  color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))',
                  marginTop: 2,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
