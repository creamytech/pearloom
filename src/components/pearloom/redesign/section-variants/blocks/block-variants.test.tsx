// ─────────────────────────────────────────────────────────────
// Block layout variants — second variants for the single-variant
// blocks (nameVote / thenAndNow / groupChat) + third variants for
// obituary (memorial card) and livestream (marquee). Pins:
//   1. Registration — every Add-Section block now has ≥2 variants,
//      every DEFAULT_VARIANT id resolves inside its own registry,
//      and the new ids are present.
//   2. Occasion recommendations — pure lookup (obituary→card for
//      memorial, nameVote→tiles for gender-reveal).
//   3. Rendering — each new variant renders real host data; empty +
//      published renders NOTHING (the honesty contract).
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { StoryManifest } from '@/types';
import { LAYOUTS, DEFAULT_VARIANT, recommendedVariantFor } from '../../layouts';
import { BLOCK_SECTION_IDS } from '../../EditorRedesign';
import { NameVoteSection } from './name-vote';
import { ThenAndNowSection } from './then-and-now';
import { GroupChatSection } from './group-chat';
import { ObituarySection } from './obituary';
import { LivestreamSection } from './livestream';
import { countdownTiles } from './livestream';

const base = { pad: 1, onEditCopy: undefined } as const;

function m(fields: Record<string, unknown>): StoryManifest {
  return { names: ['June', ''], theme: {}, chapters: [], ...fields } as unknown as StoryManifest;
}

describe('block variant registration', () => {
  it('every Add-Section block ships ≥2 variants and its default resolves inside its own registry', () => {
    for (const id of BLOCK_SECTION_IDS) {
      const variants = LAYOUTS[id];
      expect(variants, id).toBeTruthy();
      expect(variants!.length, id).toBeGreaterThanOrEqual(2);
      const ids = variants!.map((v) => v.id);
      expect(ids, id).toContain(DEFAULT_VARIANT[id]);
    }
  });

  it('the new second/third variant ids are registered', () => {
    expect(LAYOUTS.nameVote!.map((v) => v.id)).toEqual(['ballot', 'tiles']);
    expect(LAYOUTS.thenAndNow!.map((v) => v.id)).toEqual(['pairs', 'stack']);
    expect(LAYOUTS.groupChat!.map((v) => v.id)).toEqual(['card', 'panel']);
    expect(LAYOUTS.obituary!.map((v) => v.id)).toEqual(['letter', 'columns', 'card']);
    expect(LAYOUTS.livestream!.map((v) => v.id)).toEqual(['card', 'cinema', 'marquee']);
  });

  it('recommendedVariantFor is a lookup, keyed to the right occasions', () => {
    expect(recommendedVariantFor('obituary', 'memorial')).toBe('card');
    expect(recommendedVariantFor('obituary', 'funeral')).toBe('card');
    expect(recommendedVariantFor('obituary', 'wedding')).toBeUndefined();
    expect(recommendedVariantFor('nameVote', 'gender-reveal')).toBe('tiles');
    expect(recommendedVariantFor('nameVote', 'baby-shower')).toBeUndefined();
  });
});

describe('NameVoteSection — tiles', () => {
  const manifest = m({ nameVote: { question: 'Help us pick', options: ['Juniper', 'Wren', 'August'] }, subdomain: 'demo' });

  it('renders every name as a tile; ballot stays the default', () => {
    const tiles = renderToString(<NameVoteSection {...base} editable={false} variant="tiles" manifest={manifest} />);
    expect(tiles).toContain('Juniper');
    expect(tiles).toContain('Wren');
    expect(tiles).toContain('August');
    expect(tiles).toContain('Help us pick');
  });

  it('tiles + published + empty renders NOTHING', () => {
    expect(renderToString(<NameVoteSection {...base} editable={false} variant="tiles" manifest={m({})} />)).toBe('');
  });
});

describe('ThenAndNowSection — stack', () => {
  const manifest = m({ thenAndNow: [
    { id: 't1', then: 'https://x/then.jpg', now: 'https://x/now.jpg', caption: 'Maya · 1998 / 2026' },
  ] });

  it('stacks then over now with both tags + caption', () => {
    const html = renderToString(<ThenAndNowSection {...base} editable={false} variant="stack" manifest={manifest} />);
    expect(html).toContain('Then');
    expect(html).toContain('Now');
    expect(html).toContain('then.jpg');
    expect(html).toContain('now.jpg');
    expect(html).toContain('Maya · 1998 / 2026');
  });

  it('stack + published + empty renders NOTHING', () => {
    expect(renderToString(
      <ThenAndNowSection {...base} editable={false} variant="stack" manifest={m({ thenAndNow: [{ id: 'x', caption: 'no photos' }] })} />,
    )).toBe('');
  });
});

describe('GroupChatSection — panel', () => {
  it('renders the chat-window frame with the platform + join link', () => {
    const html = renderToString(
      <GroupChatSection {...base} editable={false} variant="panel"
        manifest={m({ bachelor: { groupChatUrl: 'https://chat.whatsapp.com/AbC' } })} />,
    );
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Group thread');
    expect(html).toContain('https://chat.whatsapp.com/AbC');
  });

  it('panel + published + empty renders NOTHING', () => {
    expect(renderToString(<GroupChatSection {...base} editable={false} variant="panel" manifest={m({})} />)).toBe('');
  });
});

describe('ObituarySection — memorial card', () => {
  const body = 'She kept every letter I ever sent her.\n\nWe write the way she taught us.';

  it('renders the remembrance + a portrait when a cover photo is set', () => {
    const html = renderToString(
      <ObituarySection {...base} editable={false} variant="card"
        manifest={m({ occasion: 'memorial', coverPhoto: 'https://x/grandma.jpg', memorial: { obituary: { dates: '1942 — 2026', body } } })} />,
    );
    expect(html).toContain('grandma.jpg');
    expect(html).toContain('the way she taught us');
    expect(html).toContain('1942');
  });

  it('falls back to the sprig medallion (no img) when there is no cover photo', () => {
    const html = renderToString(
      <ObituarySection {...base} editable={false} variant="card"
        manifest={m({ occasion: 'memorial', memorial: { obituary: { body } } })} />,
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('the way she taught us');
  });

  it('card + published + empty renders NOTHING', () => {
    expect(renderToString(<ObituarySection {...base} editable={false} variant="card" manifest={m({})} />)).toBe('');
  });
});

describe('LivestreamSection — marquee', () => {
  it('renders the host time + join link (countdown mounts client-side)', () => {
    const html = renderToString(
      <LivestreamSection {...base} editable={false} variant="marquee"
        manifest={m({ livestream: { url: 'https://zoom.us/j/123', startsAt: 'Saturday at 4pm', note: 'We saved you a seat.' } })} />,
    );
    expect(html).toContain('Saturday at 4pm');
    expect(html).toContain('https://zoom.us/j/123');
    expect(html).toContain('We saved you a seat.');
  });

  it('marquee + published + empty renders NOTHING', () => {
    expect(renderToString(<LivestreamSection {...base} editable={false} variant="marquee" manifest={m({})} />)).toBe('');
  });

  it('countdownTiles drops leading zero units but keeps the minutes', () => {
    // 2 days, 3 hrs, 5 mins
    expect(countdownTiles((2 * 1440 + 3 * 60 + 5) * 60_000).map((t) => t.n)).toEqual([2, 3, 5]);
    // 0 days, 4 hrs, 10 mins → days dropped
    expect(countdownTiles((4 * 60 + 10) * 60_000).map((t) => t.n)).toEqual([4, 10]);
    // 0 days, 0 hrs, 7 mins → only minutes
    expect(countdownTiles(7 * 60_000).map((t) => t.n)).toEqual([7]);
  });
});
