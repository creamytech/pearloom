import { describe, it, expect } from 'vitest';
import { mergeDraft } from './merge';
import type { DraftResult } from './schema';
import type { StoryManifest } from '@/types';

const base = (over: Record<string, unknown> = {}): StoryManifest =>
  ({ occasion: 'wedding', ...over } as unknown as StoryManifest);

describe('mergeDraft — fill-only', () => {
  it('fills a blank story headline + body and records the paths', () => {
    const m = base();
    const d: DraftResult = { storyHeadline: 'How we began', storyBody: 'It started on a rainy Tuesday in Lisbon.' };
    const out = mergeDraft(m, d) as unknown as Record<string, unknown>;
    const story = out.storySection as { headline?: string; body?: string };
    expect(story.headline).toBe('How we began');
    expect(story.body).toBe('It started on a rainy Tuesday in Lisbon.');
    expect(out.draftedByPear).toMatchObject({
      'storySection.headline': true,
      'storySection.body': true,
    });
  });

  it('NEVER clobbers host-authored story content', () => {
    const m = base({ storySection: { headline: 'Mine', body: 'My own words.' } });
    const d: DraftResult = { storyHeadline: 'Pear headline', storyBody: 'Pear body.' };
    const out = mergeDraft(m, d) as unknown as Record<string, unknown>;
    const story = out.storySection as { headline?: string; body?: string };
    expect(story.headline).toBe('Mine');
    expect(story.body).toBe('My own words.');
    // nothing written → no draft trail
    expect(out.draftedByPear).toBeUndefined();
  });

  it('does not mutate the input manifest', () => {
    const m = base({ storySection: {} });
    const snapshot = JSON.stringify(m);
    mergeDraft(m, { storyBody: 'new body' });
    expect(JSON.stringify(m)).toBe(snapshot);
  });

  it('declined slots (omitted by the model) stay honest-empty', () => {
    const m = base({ storySection: {} });
    const out = mergeDraft(m, {}) as unknown as Record<string, unknown>;
    expect(out.storySection).toEqual({});
    expect(out.tagline).toBeUndefined();
    expect(out.draftedByPear).toBeUndefined();
  });

  it('fills hero tagline into both poetry.heroTagline and manifest.tagline (fill-only)', () => {
    const m = base();
    const out = mergeDraft(m, { heroTagline: 'of all the days, this one' }) as unknown as Record<string, unknown>;
    expect((out.poetry as { heroTagline?: string }).heroTagline).toBe('of all the days, this one');
    expect(out.tagline).toBe('of all the days, this one');
    expect(out.draftedByPear).toMatchObject({ 'poetry.heroTagline': true });
  });

  it('does not overwrite a template/host hero tagline', () => {
    const m = base({ poetry: { heroTagline: 'template line' }, tagline: 'template line' });
    const out = mergeDraft(m, { heroTagline: 'pear line' }) as unknown as Record<string, unknown>;
    expect((out.poetry as { heroTagline?: string }).heroTagline).toBe('template line');
    expect(out.tagline).toBe('template line');
    expect(out.draftedByPear).toBeUndefined();
  });

  it('requires exactly 3 chips', () => {
    const two = mergeDraft(base({ storySection: {} }), { storyChips: ['a', 'b'] }) as unknown as Record<string, unknown>;
    expect((two.storySection as { chips?: unknown }).chips).toBeUndefined();
    const three = mergeDraft(base({ storySection: {} }), { storyChips: ['a', 'b', 'c'] }) as unknown as Record<string, unknown>;
    expect((three.storySection as { chips?: string[] }).chips).toEqual(['a', 'b', 'c']);
  });

  it('fills a blank FAQ answer matched by question, leaves answered ones', () => {
    const m = base({
      faqs: [
        { question: 'Can I bring a plus-one?', answer: '' },
        { question: 'Is there parking?', answer: 'Yes, valet at the door.' },
      ],
    });
    const d: DraftResult = {
      faqAnswers: [
        { question: 'can i bring a plus-one?', answer: 'Your invitation names your seats.' },
        { question: 'Is there parking?', answer: 'SHOULD NOT WIN' },
      ],
    };
    const out = mergeDraft(m, d) as unknown as Record<string, unknown>;
    const faqs = out.faqs as Array<{ answer?: string }>;
    expect(faqs[0].answer).toBe('Your invitation names your seats.');
    expect(faqs[1].answer).toBe('Yes, valet at the door.');
    expect(out.draftedByPear).toMatchObject({ 'faqs.0.answer': true });
    expect((out.draftedByPear as Record<string, boolean>)['faqs.1.answer']).toBeUndefined();
  });

  it('fills a blank event description (schedule blurb) matched by name', () => {
    const m = base({ events: [{ name: 'Cocktails', description: '' }, { name: 'Dinner', description: 'Seated, 3 courses.' }] });
    const out = mergeDraft(m, {
      scheduleBlurbs: [
        { name: 'Cocktails', blurb: 'Raise a glass on the terrace.' },
        { name: 'Dinner', blurb: 'SHOULD NOT WIN' },
      ],
    }) as unknown as Record<string, unknown>;
    const events = out.events as Array<{ description?: string }>;
    expect(events[0].description).toBe('Raise a glass on the terrace.');
    expect(events[1].description).toBe('Seated, 3 courses.');
    expect(out.draftedByPear).toMatchObject({ 'events.0.description': true });
  });

  it('fills a blank details subline (3rd tuple slot) matched by label', () => {
    const m = base({ detailsCards: [['Dress code', 'Garden formal'], ['Parking', 'Lot B', 'existing subline']] });
    const out = mergeDraft(m, {
      detailsSublines: [
        { label: 'Dress code', subline: 'Linen and light colors.' },
        { label: 'Parking', subline: 'SHOULD NOT WIN' },
      ],
    }) as unknown as Record<string, unknown>;
    const cards = out.detailsCards as Array<[string, string, string?]>;
    expect(cards[0]).toEqual(['Dress code', 'Garden formal', 'Linen and light colors.']);
    expect(cards[1][2]).toBe('existing subline');
    expect(out.draftedByPear).toMatchObject({ 'detailsCards.0.2': true });
  });

  it('fills a blank registry intro', () => {
    const out = mergeDraft(base(), { registryIntro: 'Your presence is the gift.' }) as unknown as Record<string, unknown>;
    expect(out.registryIntro).toBe('Your presence is the gift.');
    expect(out.draftedByPear).toMatchObject({ registryIntro: true });
  });
});

describe('mergeDraft — solemn guardrail', () => {
  it('sets pearReviewRequired when a story field is drafted on a memorial', () => {
    const out = mergeDraft(base({ occasion: 'memorial', storySection: {} }), {
      storyBody: 'She loved the sea.',
    }) as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBe(true);
  });

  it('does NOT set pearReviewRequired for a non-story draft on a memorial', () => {
    const out = mergeDraft(base({ occasion: 'memorial' }), { heroTagline: 'gathered to remember' }) as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBeUndefined();
  });

  it('does NOT set pearReviewRequired for a story draft on a wedding', () => {
    const out = mergeDraft(base({ occasion: 'wedding', storySection: {} }), { storyBody: 'We met at a wedding.' }) as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBeUndefined();
  });
});

describe('mergeDraft — null/undefined draft', () => {
  it('is a no-op on empty/null draft', () => {
    const m = base({ storySection: { body: 'x' } });
    expect(mergeDraft(m, null)).toEqual(m);
    expect(mergeDraft(m, undefined)).toEqual(m);
  });
});
