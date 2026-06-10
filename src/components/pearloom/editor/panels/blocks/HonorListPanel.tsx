'use client';

/* eslint-disable no-restricted-syntax */
/* HonorListPanel — Content tab for the Honor list section (the
   generalized weddingParty: wedding party / court of honor /
   candle-lighters). Edits manifest.weddingParty[] — the EXISTING
   typed StoryManifest field — so legacy wedding-party data appears
   with zero migration.

   Role vs. custom label: the role SELECT drives the canvas's
   derived side grouping (bridesmaid / maid-of-honor → "Her people",
   groomsman / best-man → "His people"); the optional custom label
   wins for DISPLAY ("Dama de honor") without losing the side. New
   rows default to role 'other' — solo occasions never trip the
   two-column grouping. */

import type { StoryManifest, WeddingPartyMember } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { PhotoUploadSlot, collectPhotoPool } from '../_photo-upload';
import { mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

const ROLE_OPTIONS: Array<{ value: WeddingPartyMember['role']; label: string }> = [
  { value: 'other', label: 'No set role' },
  { value: 'maid-of-honor', label: 'Maid of honor' },
  { value: 'best-man', label: 'Best man' },
  { value: 'bridesmaid', label: 'Bridesmaid' },
  { value: 'groomsman', label: 'Groomsman' },
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'flower-girl', label: 'Flower girl' },
  { value: 'ring-bearer', label: 'Ring bearer' },
  { value: 'officiant', label: 'Officiant' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
];

function RoleSelect({ value, onChange }: { value: WeddingPartyMember['role']; onChange: (v: WeddingPartyMember['role']) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as WeddingPartyMember['role'])}
      style={{
        width: '100%', padding: '9px 10px', borderRadius: 10,
        border: '1px solid var(--line)', background: 'var(--cream-2)',
        fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
        outline: 'none', cursor: 'pointer',
      }}
    >
      {ROLE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function HonorListPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'honorList');
  const members: WeddingPartyMember[] = Array.isArray(manifest.weddingParty)
    ? [...manifest.weddingParty].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  /* Photos already uploaded elsewhere on the site — feeds the
     "Pick from gallery" link under each slot. */
  const pool = collectPhotoPool(manifest);

  const write = (next: WeddingPartyMember[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    weddingParty: next.map((m, i) => ({ ...m, order: i })),
  } as unknown as StoryManifest);

  const patchMember = (i: number, p: Partial<WeddingPartyMember>) =>
    write(members.map((m, idx) => (idx === i ? { ...m, ...p } : m)));

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup
          label={`People · ${members.length}`}
          hint="Wedding party, court of honor, candle-lighters — whoever stands beside the honoree. Bride-side + groom-side roles split into two columns on the site."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <RowCard key={m.id ?? i}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {/* Portrait slot — square; the canvas crops to its
                      variant's shape (portrait card / circle / row). */}
                  <div style={{ width: 64, flexShrink: 0 }}>
                    <PhotoUploadSlot
                      url={m.photo ?? ''}
                      onChange={(next) => patchMember(i, { photo: next })}
                      aspectRatio="1 / 1"
                      size="sm"
                      pool={pool}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <FInput value={m.name ?? ''} onChange={(v) => patchMember(i, { name: v })} icon="user" placeholder="Maya Patel" />
                    <RoleSelect value={m.role ?? 'other'} onChange={(v) => patchMember(i, { role: v })} />
                  </div>
                  <RemoveButton label={`Remove ${m.name || 'person'}`} onClick={() => write(members.filter((_, idx) => idx !== i))} />
                </div>
                <FInput
                  value={m.customRole ?? ''}
                  onChange={(v) => patchMember(i, { customRole: v })}
                  placeholder="Custom label — “Dama de honor” (shown instead of the role)"
                />
                <FInput
                  value={m.bio ?? ''}
                  onChange={(v) => patchMember(i, { bio: v })}
                  placeholder="Short line — “Met at summer camp, 1998”"
                />
                <FInput
                  value={m.relationship ?? ''}
                  onChange={(v) => patchMember(i, { relationship: v })}
                  placeholder="Relationship — “Bride's sister”"
                />
              </RowCard>
            ))}
            <AddCard
              label={members.length === 0 ? 'Add the first person' : 'Add a person'}
              onClick={() => write([
                ...members,
                { id: mkId('hl'), name: '', role: 'other', customRole: '', order: members.length },
              ])}
            />
          </div>
        </FGroup>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Honor list" />
      </div>
    </SectionPanelShell>
  );
}

export default HonorListPanel;
