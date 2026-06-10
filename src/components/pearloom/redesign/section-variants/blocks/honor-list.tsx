'use client';
 
/* Honor list section — the people beside them. The generalized
   weddingParty: wedding party, court of honor (quinceañera),
   candle-lighters (bar/bat mitzvah).

   Data: manifest.weddingParty[]  — the EXISTING typed StoryManifest
   field (WeddingPartyMember[]), written by HonorListPanel. Reusing
   it means legacy wedding sites' party members appear with zero
   migration, and the EVENT_TYPES registry gate ('weddingParty')
   matches the store.
     { id, name, role, customRole?, bio?, photo?, relationship?, order }

   Variants (layouts.ts): cards (implemented) | circle | rows. */

import type { WeddingPartyMember } from '@/types';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, blockCopy, type BlockSectionProps } from './_shared';

const ROLE_LABEL: Record<string, string> = {
  'bride': 'Bride',
  'groom': 'Groom',
  'maid-of-honor': 'Maid of honor',
  'best-man': 'Best man',
  'bridesmaid': 'Bridesmaid',
  'groomsman': 'Groomsman',
  'flower-girl': 'Flower girl',
  'ring-bearer': 'Ring bearer',
  'officiant': 'Officiant',
  'parent': 'Parent',
  'grandparent': 'Grandparent',
  'other': '',
};

export function readHonorList(manifest: BlockSectionProps['manifest']): WeddingPartyMember[] {
  const members = manifest.weddingParty;
  if (!Array.isArray(members)) return [];
  return [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function honorRoleLabel(member: WeddingPartyMember): string {
  return member.customRole?.trim() || ROLE_LABEL[member.role] || '';
}

export function HonorListSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* cards | circle | rows — design agents dispatch here. */
  const members = readHonorList(manifest).filter((m) => (m.name ?? '').trim());
  const empty = members.length === 0;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'honorListEyebrow', 'With us')}
        title={blockCopy(manifest, 'honorListTitle', 'The people beside us')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('honorListEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('honorListTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add the people standing beside you in the Honor list panel." />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          {members.map((m, i) => {
            const role = honorRoleLabel(m);
            return (
              <div
                key={m.id ?? i}
                style={{
                  background: 'var(--t-card)',
                  border: '1px solid var(--t-line)',
                  borderRadius: 'var(--t-radius-lg, 14px)',
                  padding: '20px 16px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {m.photo?.trim() ? (
                   
                  <img
                    src={m.photo}
                    alt={m.name}
                    style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--t-line)' }}
                  />
                ) : (
                  <span
                    aria-hidden
                    style={{
                      width: 72, height: 72, borderRadius: '50%',
                      display: 'grid', placeItems: 'center',
                      background: 'var(--t-accent-bg, var(--t-section))',
                      color: 'var(--t-accent-ink, var(--t-ink))',
                      fontFamily: 'var(--t-display)', fontSize: 26,
                    }}
                  >
                    {m.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <div style={{ fontFamily: 'var(--t-display)', fontSize: 17, color: 'var(--t-ink)', lineHeight: 1.2 }}>
                  {m.name}
                </div>
                {role && (
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)' }}>
                    {role}
                  </div>
                )}
                {m.relationship?.trim() && (
                  <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--t-ink-muted)', lineHeight: 1.45 }}>
                    {m.relationship}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BlockFrame>
  );
}
