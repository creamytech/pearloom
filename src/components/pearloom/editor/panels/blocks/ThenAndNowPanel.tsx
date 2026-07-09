'use client';

/* eslint-disable no-restricted-syntax */
/* ThenAndNowPanel — Content tab for the Then & now section
   (before/after photo pairs). Edits manifest.thenAndNow[] (typed
   on StoryManifest):
     { id, then?: url, now?: url, caption? }
   Paired PhotoUploadSlots per row (the HonorListPanel pattern);
   the canvas renders whichever side exists, so a half-filled pair
   is a valid working state while the host hunts the old print. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { moveItem, ReorderHandle } from '../_reorder';
import { PhotoUploadSlot, collectPhotoPool } from '../_photo-upload';
import { mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

type Pair = NonNullable<StoryManifest['thenAndNow']>[number];

function SlotLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 3 }}>
      {children}
    </div>
  );
}

export function ThenAndNowPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'thenAndNow');
  const pairs: Pair[] = Array.isArray(manifest.thenAndNow) ? manifest.thenAndNow : [];
  const pool = collectPhotoPool(manifest);

  const write = (next: Pair[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    thenAndNow: next,
  } as unknown as StoryManifest);

  const patchPair = (i: number, p: Partial<Pair>) =>
    write(pairs.map((pair, idx) => (idx === i ? { ...pair, ...p } : pair)));

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label={`Pairs · ${pairs.length}`}
          hint="A photo from back then beside one from now. A pair with only one side still shows, add the other whenever it turns up."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pairs.map((pair, i) => (
              <RowCard key={pair.id ?? i}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <ReorderHandle
                    index={i}
                    count={pairs.length}
                    label={pair.caption || `pair ${i + 1}`}
                    onMove={(from, to) => write(moveItem(pairs, from, to))}
                  />
                  <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <SlotLabel>Then</SlotLabel>
                      <PhotoUploadSlot
                        url={pair.then ?? ''}
                        onChange={(next) => patchPair(i, { then: next })}
                        aspectRatio="4 / 5"
                        size="sm"
                        pool={pool}
                      />
                    </div>
                    <div>
                      <SlotLabel>Now</SlotLabel>
                      <PhotoUploadSlot
                        url={pair.now ?? ''}
                        onChange={(next) => patchPair(i, { now: next })}
                        aspectRatio="4 / 5"
                        size="sm"
                        pool={pool}
                      />
                    </div>
                  </div>
                  <RemoveButton
                    label={`Remove ${pair.caption || 'pair'}`}
                    onClick={() => write(pairs.filter((_, idx) => idx !== i))}
                  />
                </div>
                <FInput
                  value={pair.caption ?? ''}
                  onChange={(v) => patchPair(i, { caption: v })}
                  placeholder="One line under the pair, “Maya · 1998 / 2026”"
                />
              </RowCard>
            ))}
            <AddCard
              label={pairs.length === 0 ? 'Add the first pair' : 'Add a pair'}
              onClick={() => write([...pairs, { id: mkId('tn') }])}
            />
          </div>
        </FGroup>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Then & now" />
      </div>
    </SectionPanelShell>
  );
}

export default ThenAndNowPanel;
