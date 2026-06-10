'use client';

 
/* HonorListPanel — Content tab for the Honor list section (the
   generalized weddingParty: wedding party / court of honor /
   candle-lighters). Edits manifest.weddingParty[] — the EXISTING
   typed StoryManifest field — so legacy wedding-party data appears
   with zero migration. New rows are written with role: 'other' +
   customRole carrying the display label, which renders identically
   for non-wedding occasions. */

import type { StoryManifest, WeddingPartyMember } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

const ROLE_LABEL: Record<string, string> = {
  'bride': 'Bride', 'groom': 'Groom',
  'maid-of-honor': 'Maid of honor', 'best-man': 'Best man',
  'bridesmaid': 'Bridesmaid', 'groomsman': 'Groomsman',
  'flower-girl': 'Flower girl', 'ring-bearer': 'Ring bearer',
  'officiant': 'Officiant', 'parent': 'Parent', 'grandparent': 'Grandparent',
  'other': '',
};

export function HonorListPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'honorList');
  const members: WeddingPartyMember[] = Array.isArray(manifest.weddingParty)
    ? [...manifest.weddingParty].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

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
          hint="Wedding party, court of honor, candle-lighters — whoever stands beside the honoree."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <RowCard key={m.id ?? i}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <FInput value={m.name ?? ''} onChange={(v) => patchMember(i, { name: v })} icon="user" placeholder="Maya Patel" />
                    <FInput
                      value={m.customRole ?? ROLE_LABEL[m.role] ?? ''}
                      onChange={(v) => patchMember(i, { customRole: v, role: 'other' })}
                      placeholder="Role — “Maid of honor” / “Dama de honor”"
                    />
                    <FInput
                      value={m.relationship ?? ''}
                      onChange={(v) => patchMember(i, { relationship: v })}
                      placeholder="Relationship — “Bride's sister”"
                    />
                  </div>
                  <RemoveButton label={`Remove ${m.name || 'person'}`} onClick={() => write(members.filter((_, idx) => idx !== i))} />
                </div>
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
