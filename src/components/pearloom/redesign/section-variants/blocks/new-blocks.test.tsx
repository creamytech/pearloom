// ─────────────────────────────────────────────────────────────
// Wave 2 — the promised-but-missing blocks (nameVote / rooms /
// thenAndNow / whosWho-as-honorList). Pins:
//   1. Registration — every new SectionKind has a layout registry
//      + default variant, and the occasion gate resolves them
//      (including the whosWho → honorList alias).
//   2. Rendering — real manifest data renders; empty published
//      sections render NOTHING (the honesty contract); empty
//      editable sections show the plain empty-state.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { StoryManifest } from '@/types';
import { NameVoteSection } from './name-vote';
import { RoomsSection } from './rooms';
import { ThenAndNowSection } from './then-and-now';
import { HonorListSection } from './honor-list';
import { LAYOUTS, DEFAULT_VARIANT } from '../../layouts';
import { BLOCK_SECTION_IDS, isBlockApplicable } from '../../EditorRedesign';

const base = { pad: 1, onEditCopy: undefined } as const;

function m(fields: Record<string, unknown>): StoryManifest {
  return { names: ['June', ''], theme: {}, chapters: [], ...fields } as unknown as StoryManifest;
}

describe('registration', () => {
  it('every Add-Section block id has a layout registry + default variant', () => {
    for (const id of BLOCK_SECTION_IDS) {
      expect(LAYOUTS[id], id).toBeTruthy();
      expect(DEFAULT_VARIANT[id], id).toBeTruthy();
    }
  });

  it('honorList ships the whosWho `relationships` variant', () => {
    expect(LAYOUTS.honorList!.map((v) => v.id)).toContain('relationships');
  });

  it('occasion gate: nameVote for baby-shower/gender-reveal, rooms + thenAndNow for reunion — none for wedding', () => {
    expect(isBlockApplicable('nameVote', 'baby-shower')).toBe(true);
    expect(isBlockApplicable('nameVote', 'gender-reveal')).toBe(true);
    expect(isBlockApplicable('rooms', 'reunion')).toBe(true);
    expect(isBlockApplicable('rooms', 'bachelor-party')).toBe(true);
    expect(isBlockApplicable('thenAndNow', 'reunion')).toBe(true);
    expect(isBlockApplicable('nameVote', 'wedding')).toBe(false);
    expect(isBlockApplicable('rooms', 'wedding')).toBe(false);
    expect(isBlockApplicable('thenAndNow', 'wedding')).toBe(false);
  });

  it("whosWho alias: reunions (which hide 'weddingParty') still get the honorList section", () => {
    expect(isBlockApplicable('honorList', 'reunion')).toBe(true);
    expect(isBlockApplicable('honorList', 'wedding')).toBe(true); // via weddingParty
  });
});

describe('NameVoteSection', () => {
  it('renders the host-authored names; published + empty renders NOTHING', () => {
    const html = renderToString(
      <NameVoteSection {...base} editable={false} variant="ballot"
        manifest={m({ nameVote: { question: 'Help us pick', options: ['Juniper', 'Wren'] }, subdomain: 'demo' })} />,
    );
    expect(html).toContain('Juniper');
    expect(html).toContain('Wren');
    expect(html).toContain('Help us pick');

    const empty = renderToString(
      <NameVoteSection {...base} editable={false} variant="ballot" manifest={m({})} />,
    );
    expect(empty).toBe('');
  });

  it('empty + editable shows the plain empty-state', () => {
    const html = renderToString(
      <NameVoteSection {...base} editable variant="ballot" manifest={m({})} />,
    );
    expect(html).toContain('Nothing here yet.');
  });
});

describe('RoomsSection', () => {
  const manifest = m({ bachelor: { rooms: [
    { id: 'r1', name: 'Master suite', guests: 'Jane, Maya' },
    { id: 'r2', name: 'Garden room', guests: '' },
  ] } });

  it('assignments: room cards with guest chips; open rooms say so', () => {
    const html = renderToString(<RoomsSection {...base} editable={false} variant="assignments" manifest={manifest} />);
    expect(html).toContain('Master suite');
    expect(html).toContain('Jane');
    expect(html).toContain('Maya');
    expect(html).toContain('Still open');
  });

  it('board variant renders the ruled list; published + empty renders NOTHING', () => {
    const html = renderToString(<RoomsSection {...base} editable={false} variant="board" manifest={manifest} />);
    expect(html).toContain('Garden room');
    expect(renderToString(<RoomsSection {...base} editable={false} variant="board" manifest={m({})} />)).toBe('');
  });
});

describe('ThenAndNowSection', () => {
  it('renders pairs with THEN / NOW tags + caption; half pairs still show', () => {
    const html = renderToString(
      <ThenAndNowSection {...base} editable={false} variant="pairs"
        manifest={m({ thenAndNow: [
          { id: 't1', then: 'https://x/then.jpg', now: 'https://x/now.jpg', caption: 'Maya · 1998 / 2026' },
          { id: 't2', then: 'https://x/only-then.jpg' },
        ] })} />,
    );
    expect(html).toContain('Then');
    expect(html).toContain('Now');
    expect(html).toContain('Maya · 1998 / 2026');
    expect(html).toContain('only-then.jpg');
  });

  it('published + empty (including caption-only rows) renders NOTHING', () => {
    expect(renderToString(
      <ThenAndNowSection {...base} editable={false} variant="pairs" manifest={m({ thenAndNow: [{ id: 'x', caption: 'no photos yet' }] })} />,
    )).toBe('');
  });
});

describe('HonorListSection — whosWho voice', () => {
  const members = [
    { id: 'p1', name: 'Maya Patel', role: 'other', relationship: 'Your cousin from Reno', order: 0 },
  ];

  it('relationships variant leads with the relationship line', () => {
    const html = renderToString(
      <HonorListSection {...base} editable={false} variant="relationships" manifest={m({ weddingParty: members })} />,
    );
    expect(html).toContain('Maya Patel');
    expect(html).toContain('Your cousin from Reno');
    expect(html).toContain('Who&#x27;s who');
  });

  it('reunion occasion gets the who’s-who head even on other variants; weddings keep the honoree voice', () => {
    const reunion = renderToString(
      <HonorListSection {...base} editable={false} variant="cards" manifest={m({ weddingParty: members, occasion: 'reunion' })} />,
    );
    expect(reunion).toContain('Who&#x27;s who');
    const wedding = renderToString(
      <HonorListSection {...base} editable={false} variant="cards" manifest={m({ weddingParty: members, occasion: 'wedding' })} />,
    );
    expect(wedding).toContain('The people beside us');
  });
});
