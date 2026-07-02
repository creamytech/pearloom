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

   Side grouping: WeddingPartyMember has NO `side` field — the side
   is implicit in the role union, so we derive it: {bride,
   maid-of-honor, bridesmaid} → her side, {groom, best-man,
   groomsman} → his side. Two columns only appear when BOTH sides
   have members (i.e. a real wedding-party roster); neutral roles
   (officiant, parents, flower girl…) flow in a third ungrouped run
   beneath. Solo occasions — where the panel writes role 'other' +
   customRole — never trip the grouping and get one flow.

   Variants (layouts.ts): cards (default) | circle | rows |
   relationships. `relationships` is the whosWho block from the
   EVENT_TYPES registry — same store, reunion-voiced: the
   relationship line leads ("Your cousin — Reno") so a guest who
   hasn't seen the family in 20 years can put names to faces. The
   registry's 'whosWho' gate id resolves to this section (see
   isBlockApplicable in EditorRedesign.tsx). */

import type { CSSProperties } from 'react';
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
  /* Court of honor (quinceañera) + candle lighters (bar/bat
     mitzvah) — neutral roles, so they never trip the side split. */
  'dama': 'Dama',
  'chambelan': 'Chambelán',
  'candle-lighter': 'Candle lighter',
  'other': '',
};

const MONO = 'var(--t-mono, var(--pl-font-mono, ui-monospace, monospace))';
const ROLE_COLOR = 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)';

export function readHonorList(manifest: BlockSectionProps['manifest']): WeddingPartyMember[] {
  const members = manifest.weddingParty;
  if (!Array.isArray(members)) return [];
  return [...members].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function honorRoleLabel(member: WeddingPartyMember): string {
  return member.customRole?.trim() || ROLE_LABEL[member.role] || '';
}

/* ─── Side grouping (derived — see header comment). ──────────── */

const SIDE_A_ROLES = new Set<WeddingPartyMember['role']>(['bride', 'maid-of-honor', 'bridesmaid']);
const SIDE_B_ROLES = new Set<WeddingPartyMember['role']>(['groom', 'best-man', 'groomsman']);

export interface HonorGroup { label?: string; members: WeddingPartyMember[] }

export function groupHonorMembers(members: WeddingPartyMember[]): HonorGroup[] {
  const a = members.filter((m) => SIDE_A_ROLES.has(m.role));
  const b = members.filter((m) => SIDE_B_ROLES.has(m.role));
  if (a.length === 0 || b.length === 0) return [{ members }];
  const rest = members.filter((m) => !SIDE_A_ROLES.has(m.role) && !SIDE_B_ROLES.has(m.role));
  const groups: HonorGroup[] = [
    { label: 'Her people', members: a },
    { label: 'His people', members: b },
  ];
  if (rest.length > 0) groups.push({ label: 'And beside them', members: rest });
  return groups;
}

/** Mono-caps group header flanked by hairlines. */
function GroupLabel({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--t-line-soft)' }} />
      <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--t-ink-muted)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--t-line-soft)' }} />
    </div>
  );
}

/** Accent-tinted monogram-initial tile — the photo fallback. A thin
 *  accent ring around the initial keeps it in the Monogram family
 *  without mounting the full crest at thumbnail sizes. */
function InitialTile({ name, size, round, fontSize }: { name: string; size: number | string; round?: boolean; fontSize: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || '·';
  const sizeStyle: CSSProperties = typeof size === 'number'
    ? { width: size, height: size }
    : { width: size, aspectRatio: '4 / 5' };
  return (
    <span
      aria-hidden
      style={{
        ...sizeStyle,
        borderRadius: round ? '50%' : 'var(--t-radius, 10px)',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--t-accent-bg, var(--t-section))',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: '58%',
          aspectRatio: '1 / 1',
          maxWidth: 76,
          borderRadius: '50%',
          border: '1px solid color-mix(in oklab, var(--t-accent) 55%, transparent)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--t-display)',
          fontStyle: 'italic',
          fontSize,
          color: 'var(--t-accent-ink, var(--t-ink))',
          lineHeight: 1,
        }}
      >
        {initial}
      </span>
    </span>
  );
}

function MemberName({ name, size = 17 }: { name: string; size?: number }) {
  return (
    <div style={{ fontFamily: 'var(--t-display)', fontSize: size, color: 'var(--t-ink)', lineHeight: 1.2 }}>
      {name}
    </div>
  );
}

function MemberRole({ role, size = 10 }: { role: string; size?: number }) {
  if (!role) return null;
  return (
    <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: ROLE_COLOR }}>
      {role}
    </div>
  );
}

/** Short bio line — member.bio wins, relationship falls back. */
function bioLine(m: WeddingPartyMember): string {
  return m.bio?.trim() || m.relationship?.trim() || '';
}

/* ─── cards — portrait card per person. ──────────────────────── */

function HonorCards({ members }: { members: WeddingPartyMember[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
      {members.map((m, i) => {
        const bio = bioLine(m);
        return (
          <div
            key={m.id ?? i}
            style={{
              background: 'var(--t-card)',
              border: '1px solid var(--t-line)',
              borderRadius: 'var(--t-radius-lg, 14px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {m.photo?.trim() ? (
              <img
                src={m.photo}
                alt={m.name}
                style={{ width: '100%', aspectRatio: '4 / 5', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <InitialTile name={m.name} size="100%" fontSize={34} />
            )}
            <div style={{ padding: '14px 14px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <MemberName name={m.name} />
              <MemberRole role={honorRoleLabel(m)} />
              {bio && (
                <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--t-ink-muted)', lineHeight: 1.45 }}>
                  {bio}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── circle — round portraits in a centered flowing row. ────── */

function HonorCircle({ members }: { members: WeddingPartyMember[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '28px 22px' }}>
      {members.map((m, i) => (
        <div key={m.id ?? i} style={{ width: 118, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {m.photo?.trim() ? (
            <img
              src={m.photo}
              alt={m.name}
              title={m.relationship?.trim() || undefined}
              style={{
                width: 92, height: 92, borderRadius: '50%', objectFit: 'cover',
                /* StoryLetter's "stamp" framing — paper ring + soft lift. */
                border: '3px solid var(--t-paper)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
          ) : (
            <InitialTile name={m.name} size={92} round fontSize={26} />
          )}
          <div style={{ marginTop: 6 }}>
            <MemberName name={m.name} size={15} />
          </div>
          <MemberRole role={honorRoleLabel(m)} size={9.5} />
        </div>
      ))}
    </div>
  );
}

/* ─── rows — editorial rows for courts / committees. ─────────── */

function HonorRows({ members }: { members: WeddingPartyMember[] }) {
  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      {members.map((m, i) => {
        const bio = bioLine(m);
        return (
          <div
            key={m.id ?? i}
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              gap: 16,
              alignItems: 'center',
              padding: '14px 0',
              borderTop: i === 0 ? 'none' : '1px solid var(--t-line-soft)',
            }}
          >
            {m.photo?.trim() ? (
              <img
                src={m.photo}
                alt={m.name}
                style={{ width: 64, height: 64, borderRadius: 'var(--t-radius, 10px)', objectFit: 'cover' }}
              />
            ) : (
              <InitialTile name={m.name} size={64} fontSize={20} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <MemberName name={m.name} />
                <MemberRole role={honorRoleLabel(m)} size={9.5} />
              </div>
              {bio && (
                <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5, marginTop: 3 }}>
                  {bio}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── relationships — the whosWho voice: who they are TO YOU. ──
   Face + name + relationship as the lead line ("Your cousin from
   Reno"); the formal role steps back to a quiet tag. Built for
   reunions and multi-family gatherings where the roster question
   is "who is that?", not "what's their title?". */

function HonorRelationships({ members }: { members: WeddingPartyMember[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(250px, 100%), 1fr))', gap: '14px 18px', maxWidth: 720, margin: '0 auto' }}>
      {members.map((m, i) => (
        <div key={m.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0' }}>
          {m.photo?.trim() ? (
            <img
              src={m.photo}
              alt={m.name}
              style={{ width: 58, height: 58, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--t-paper)', boxShadow: '0 3px 9px rgba(0,0,0,0.09)' }}
            />
          ) : (
            <InitialTile name={m.name} size={58} round fontSize={17} />
          )}
          <div style={{ minWidth: 0 }}>
            <MemberName name={m.name} size={15.5} />
            {(m.relationship?.trim() || m.bio?.trim()) && (
              <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.4, marginTop: 2 }}>
                {m.relationship?.trim() || m.bio?.trim()}
              </div>
            )}
            <MemberRole role={honorRoleLabel(m)} size={9} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────── */

/* Occasion-voiced fallback head — the reunion shape asks "who's
   who", the default shape honors the people standing beside the
   honoree. Explicit copy overrides always win. */
const WHOS_WHO_OCCASIONS = new Set(['reunion', 'housewarming']);

export function HonorListSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const members = readHonorList(manifest).filter((m) => (m.name ?? '').trim());
  const empty = members.length === 0;
  if (empty && !editable) return null;

  const occasion = (manifest as unknown as { occasion?: string }).occasion;
  const whosWhoVoice = variant === 'relationships' || WHOS_WHO_OCCASIONS.has(occasion ?? '');
  const groups = groupHonorMembers(members);
  const Flow = variant === 'circle' ? HonorCircle
    : variant === 'rows' ? HonorRows
    : variant === 'relationships' ? HonorRelationships
    : HonorCards;
  /* The two side groups sit as columns on wide viewports ("Her
     people" / "His people"); a trailing neutral group spans full
     width beneath. Rows reads better stacked — keep it single-col. */
  const sideGroups = groups.filter((g) => g.label === 'Her people' || g.label === 'His people');
  const restGroups = groups.filter((g) => !sideGroups.includes(g));
  const twoCol = sideGroups.length === 2 && variant !== 'rows';

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'honorListEyebrow', whosWhoVoice ? 'Putting names to faces' : 'With us')}
        title={blockCopy(manifest, 'honorListTitle', whosWhoVoice ? "Who's who" : 'The people beside us')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('honorListEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('honorListTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Add the people standing beside you in the Honor list panel." />
      ) : groups.length === 1 && !groups[0].label ? (
        <Flow members={groups[0].members} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {twoCol ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '32px 36px' }}>
              {sideGroups.map((g) => (
                <div key={g.label}>
                  <GroupLabel label={g.label!} />
                  <Flow members={g.members} />
                </div>
              ))}
            </div>
          ) : (
            sideGroups.map((g) => (
              <div key={g.label}>
                <GroupLabel label={g.label!} />
                <Flow members={g.members} />
              </div>
            ))
          )}
          {restGroups.map((g) => (
            <div key={g.label ?? 'rest'}>
              {g.label && <GroupLabel label={g.label} />}
              <Flow members={g.members} />
            </div>
          ))}
        </div>
      )}
    </BlockFrame>
  );
}
