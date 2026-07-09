// ─────────────────────────────────────────────────────────────
// Wave 3 — signature variants + details overhaul + groupChat.
// Pins:
//   1. Registration — every new variant id lives in LAYOUTS;
//      'logowall' is gone from the picker but legacy manifests
//      still resolve; groupChat is a real Add-Section block.
//   2. Occasion recommendations — pure lookup, never a write.
//   3. Details — content-aware icons + the subline tuple slot.
//   4. Rendering — wardrobe plates / bill-of-fare / storecards /
//      groupChat honor the honesty contract (published + empty
//      renders NOTHING).
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import type { StoryManifest } from '@/types';
import { LAYOUTS, DEFAULT_VARIANT, readVariant, recommendedVariantFor } from './layouts';
import { detailsIconFor } from './details-icons';
import { storeMark } from './section-variants/registry';
import { chatPlatformFor, GroupChatSection } from './section-variants/blocks/group-chat';
import { DressCodeSection } from './section-variants/blocks/dress-code';
import { MenuSection } from './section-variants/blocks/menu';
import { isBlockApplicable } from './EditorRedesign';

const base = { pad: 1, onEditCopy: undefined } as const;

function m(fields: Record<string, unknown>): StoryManifest {
  return { names: ['June', ''], theme: {}, chapters: [], ...fields } as unknown as StoryManifest;
}

describe('Wave 3 registrations', () => {
  it('the signature variants are registered', () => {
    expect(LAYOUTS.hero!.map((v) => v.id)).toContain('crest');
    expect(LAYOUTS.gallery!.map((v) => v.id)).toContain('frames');
    expect(LAYOUTS.details!.map((v) => v.id)).toContain('ledger');
    expect(LAYOUTS.menu!.map((v) => v.id)).toContain('bill-of-fare');
    expect(LAYOUTS.dressCode!.map((v) => v.id)).toContain('wardrobe');
    expect(LAYOUTS.registry!.map((v) => v.id)).toContain('storecards');
    expect(LAYOUTS.groupChat!.map((v) => v.id)).toEqual(['card', 'panel']);
    expect(DEFAULT_VARIANT.groupChat).toBe('card');
  });

  it("registry picker no longer offers 'logowall'; legacy picks still resolve (renderer aliases the id)", () => {
    expect(LAYOUTS.registry!.map((v) => v.id)).not.toContain('logowall');
    /* readVariant returns the stored pick verbatim; RegistryBlock
       dispatches 'logowall' onto the storecards renderer. */
    expect(readVariant({ layouts: { registry: 'logowall' } }, 'registry')).toBe('logowall');
  });

  it("itinerary keeps the 'flow' id (now labelled Thread) so old manifests resolve", () => {
    const flow = LAYOUTS.itinerary!.find((v) => v.id === 'flow');
    expect(flow).toBeTruthy();
    expect(flow!.label).toBe('Thread');
  });

  it('groupChat gates through the EVENT_TYPES registry (bachelor yes, wedding no)', () => {
    expect(isBlockApplicable('groupChat', 'bachelor-party')).toBe(true);
    expect(isBlockApplicable('groupChat', 'bachelorette-party')).toBe(true);
    expect(isBlockApplicable('groupChat', 'wedding')).toBe(false);
  });
});

describe('recommendedVariantFor', () => {
  it('recommends crest for solemn occasions only', () => {
    expect(recommendedVariantFor('hero', 'memorial')).toBe('crest');
    expect(recommendedVariantFor('hero', 'funeral')).toBe('crest');
    expect(recommendedVariantFor('hero', 'wedding')).toBeUndefined();
    expect(recommendedVariantFor('hero', undefined)).toBeUndefined();
  });

  it('recommends frames for weddings and wardrobe for quinceañeras', () => {
    expect(recommendedVariantFor('gallery', 'wedding')).toBe('frames');
    expect(recommendedVariantFor('dressCode', 'quinceanera')).toBe('wardrobe');
    expect(recommendedVariantFor('rsvp', 'wedding')).toBeUndefined();
  });
});

describe('detailsIconFor — content-aware, positional fallback', () => {
  it('maps labels semantically', () => {
    expect(detailsIconFor('Parking', 2)).toBe('car');
    expect(detailsIconFor('Shuttle times', 0)).toBe('car');
    expect(detailsIconFor('Dress code', 0)).toBe('hanger');
    expect(detailsIconFor('Kids welcome', 2)).toBe('users');
    expect(detailsIconFor('Gifts', 0)).toBe('gift');
    expect(detailsIconFor('Hotel block', 1)).toBe('home');
    expect(detailsIconFor('Unplugged ceremony photos', 0)).toBe('camera');
  });

  it('unmatched labels keep the legacy positional trio', () => {
    expect(detailsIconFor('Something else', 0)).toBe('sparkles');
    expect(detailsIconFor('Something else', 1)).toBe('users');
    expect(detailsIconFor('Something else', 2)).toBe('gift');
    expect(detailsIconFor('', 1)).toBe('users');
  });
});

describe('storeMark — typographic store plates', () => {
  it('builds at most two initials, skipping articles', () => {
    expect(storeMark('Crate & Barrel')).toBe('CB');
    expect(storeMark('Zola')).toBe('Z');
    expect(storeMark('The Citizenry')).toBe('C');
    expect(storeMark('')).toBe('·');
  });
});

describe('chatPlatformFor', () => {
  it('names the platform from the invite URL', () => {
    expect(chatPlatformFor('https://chat.whatsapp.com/AbC')).toBe('WhatsApp');
    expect(chatPlatformFor('https://signal.group/#xyz')).toBe('Signal');
    expect(chatPlatformFor('https://groupme.com/join_group/1')).toBe('GroupMe');
    expect(chatPlatformFor('https://discord.gg/abc')).toBe('Discord');
    expect(chatPlatformFor('https://t.me/+abc')).toBe('Telegram');
    expect(chatPlatformFor('https://example.com/thread')).toBe('the group thread');
  });
});

describe('GroupChatSection', () => {
  it('renders the platform + join link from manifest.bachelor.groupChatUrl', () => {
    const html = renderToString(
      <GroupChatSection {...base} editable={false} variant="card"
        manifest={m({ bachelor: { groupChatUrl: 'https://chat.whatsapp.com/AbC' } })} />,
    );
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Join the thread');
    expect(html).toContain('https://chat.whatsapp.com/AbC');
  });

  it('published + empty renders NOTHING; editable shows the plain empty-state', () => {
    expect(renderToString(
      <GroupChatSection {...base} editable={false} variant="card" manifest={m({})} />,
    )).toBe('');
    expect(renderToString(
      <GroupChatSection {...base} editable variant="card" manifest={m({})} />,
    )).toContain('Nothing here yet.');
  });
});

describe('DressCodeSection — wardrobe', () => {
  const manifest = m({
    dressCodeSection: {
      code: 'Garden formal',
      examples: [
        { label: 'Linen suits', photo: 'https://x/suit.jpg' },
        { label: 'No white' },
      ],
    },
  });

  it('photographed examples become plates; photo-less ones stay chips', () => {
    const html = renderToString(
      <DressCodeSection {...base} editable={false} variant="wardrobe" manifest={manifest} />,
    );
    expect(html).toContain('suit.jpg');
    expect(html).toContain('Linen suits');
    expect(html).toContain('No white');
  });

  it('the centered variant ignores photos (no <img>)', () => {
    const html = renderToString(
      <DressCodeSection {...base} editable={false} variant="centered" manifest={manifest} />,
    );
    expect(html).not.toContain('suit.jpg');
    expect(html).toContain('Linen suits');
  });
});

describe('MenuSection — bill of fare', () => {
  it('opens courses with roman numerals', () => {
    const html = renderToString(
      <MenuSection {...base} editable={false} variant="bill-of-fare"
        manifest={m({ menuSection: { courses: [
          { id: 'c1', name: 'To begin', items: [{ id: 'd1', name: 'Garden greens' }] },
          { id: 'c2', name: 'The main', items: [{ id: 'd2', name: 'Roast chicken' }] },
        ] } })} />,
    );
    expect(html).toContain('>I<');
    expect(html).toContain('>II<');
    expect(html).toContain('Garden greens');
    expect(html).toContain('Roast chicken');
  });
});
