'use client';
 
/* Itinerary section — multi-day plan, hour by hour.

   Data: manifest.itinerary.days[]  (written by ItineraryPanel)
     { id, label, date?, slots: [{ id, time?, title, detail?, location? }] }
   Legacy fallback: manifest.blocks[] entry of type 'itinerary' with
   config.days in the same slot shape (wizard-seeded sites).

   Variants (layouts.ts): days (implemented) | flow | tickets. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, BlockChip, blockCopy, type BlockSectionProps } from './_shared';

export interface ItinerarySlotData {
  id?: string;
  time?: string;
  title?: string;
  detail?: string;
  location?: string;
}
export interface ItineraryDayData {
  id?: string;
  label?: string;
  date?: string;
  slots?: ItinerarySlotData[];
}

export function readItineraryDays(manifest: BlockSectionProps['manifest']): ItineraryDayData[] {
  const loose = manifest as unknown as {
    itinerary?: { days?: ItineraryDayData[] };
    blocks?: Array<{ type?: string; config?: { days?: ItineraryDayData[] } }>;
  };
  const fromManifest = loose.itinerary?.days;
  if (Array.isArray(fromManifest) && fromManifest.length > 0) return fromManifest;
  const legacy = (loose.blocks ?? []).find((b) => b?.type === 'itinerary')?.config?.days;
  return Array.isArray(legacy) ? legacy : [];
}

export function ItinerarySection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* days | flow | tickets — design agents dispatch here. */
  const days = readItineraryDays(manifest).filter(
    (d) => (d.label ?? '').trim() || (d.slots ?? []).some((s) => (s.title ?? '').trim()),
  );
  const empty = days.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'itineraryEyebrow', 'The plan')}
        title={blockCopy(manifest, 'itineraryTitle', 'The weekend, hour by hour')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('itineraryEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('itineraryTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add days and time slots in the Itinerary panel." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {days.map((day, di) => (
            <div
              key={day.id ?? di}
              style={{
                background: 'var(--t-card)',
                border: '1px solid var(--t-line)',
                borderRadius: 'var(--t-radius-lg, 14px)',
                padding: '20px 22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--t-display)', fontSize: 21, color: 'var(--t-ink)' }}>
                  {day.label?.trim() || `Day ${di + 1}`}
                </div>
                {day.date && (
                  <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {day.date}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(day.slots ?? []).filter((s) => (s.title ?? '').trim() || (s.time ?? '').trim()).map((slot, si) => (
                  <div
                    key={slot.id ?? si}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '86px 1fr',
                      gap: 14,
                      padding: '10px 0',
                      borderTop: si === 0 ? 'none' : '1px solid var(--t-line-soft)',
                      alignItems: 'baseline',
                    }}
                  >
                    <div>{slot.time?.trim() ? <BlockChip>{slot.time}</BlockChip> : null}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--t-ink)' }}>
                        {slot.title}
                      </div>
                      {(slot.detail || slot.location) && (
                        <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 2, lineHeight: 1.5 }}>
                          {[slot.detail, slot.location].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </BlockFrame>
  );
}
