'use client';

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
import { FSelect } from '../_form-atoms';
import { moveItem, ReorderHandle } from '../_reorder';
import { PhotoUploadSlot, collectPhotoPool } from '../_photo-upload';
import { mkId, readOccasion, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

type RoleOption = { value: WeddingPartyMember['role']; label: string };

/* Role presets route by occasion — the registry mounts this section
   on wedding-shaped events (wedding party), quinceañeras (court of
   honor) and bar/bat mitzvahs (candle lighters). Same typed field,
   different vocabulary. */
const WEDDING_ROLE_OPTIONS: RoleOption[] = [
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

const COURT_ROLE_OPTIONS: RoleOption[] = [
  { value: 'other', label: 'No set role' },
  { value: 'dama', label: 'Dama' },
  { value: 'chambelan', label: 'Chambelán' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
];

const CANDLE_ROLE_OPTIONS: RoleOption[] = [
  { value: 'other', label: 'No set role' },
  { value: 'candle-lighter', label: 'Candle lighter' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
];

interface OccasionCopy {
  roleOptions: RoleOption[];
  hint: string;
  relationshipPlaceholder: string;
}

function copyFor(occasion?: string): OccasionCopy {
  if (occasion === 'quinceanera') {
    return {
      roleOptions: COURT_ROLE_OPTIONS,
      hint: 'The court of honor — damas, chambelanes, and the family beside her.',
      relationshipPlaceholder: 'Relationship — “Her cousin”',
    };
  }
  if (occasion === 'bar-mitzvah' || occasion === 'bat-mitzvah') {
    return {
      roleOptions: CANDLE_ROLE_OPTIONS,
      hint: 'Candle lighters and honored family — they appear on the site in this order.',
      relationshipPlaceholder: 'Relationship — “Grandmother”',
    };
  }
  return {
    roleOptions: WEDDING_ROLE_OPTIONS,
    hint: 'Wedding party, court of honor, candle-lighters — whoever stands beside the honoree. Bride-side + groom-side roles split into two columns on the site.',
    relationshipPlaceholder: "Relationship — “Bride's sister”",
  };
}

/* Custom dropdown (was a native <select> — banned). FSelect is the
   house dropdown used by every other panel. A row whose saved role
   isn't in the occasion's preset list (e.g. a legacy wedding role on
   a quinceañera site) keeps its option appended so it never reads
   blank. */
function RoleSelect({ value, onChange, options }: {
  value: WeddingPartyMember['role'];
  onChange: (v: WeddingPartyMember['role']) => void;
  options: RoleOption[];
}) {
  const opts = options.some((o) => o.value === value)
    ? options
    : [...options, ...WEDDING_ROLE_OPTIONS.filter((o) => o.value === value)];
  return (
    <FSelect
      value={value}
      onChange={(v) => onChange(v as WeddingPartyMember['role'])}
      options={opts}
      placeholder="Pick a role"
    />
  );
}

export function HonorListPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'honorList');
  const copy = copyFor(readOccasion(manifest));
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
          hint={copy.hint}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map((m, i) => (
              <RowCard key={m.id ?? i}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {/* Processional order — write() reindexes `order`
                      from array position, so a move IS the order. */}
                  <ReorderHandle
                    index={i}
                    count={members.length}
                    label={m.name || 'person'}
                    onMove={(from, to) => write(moveItem(members, from, to))}
                  />
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
                    <RoleSelect value={m.role ?? 'other'} onChange={(v) => patchMember(i, { role: v })} options={copy.roleOptions} />
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
                  placeholder={copy.relationshipPlaceholder}
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
