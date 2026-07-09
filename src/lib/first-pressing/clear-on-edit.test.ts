import { describe, it, expect } from 'vitest';
import {
  clearDraftedPath,
  clearDraftedPaths,
  isDrafted,
  isStoryDraftPath,
  hasDraftedStoryPaths,
  publishNeedsReview,
  acknowledgeReview,
} from './clear-on-edit';
import type { StoryManifest } from '@/types';

const base = (over: Record<string, unknown> = {}): StoryManifest =>
  ({ occasion: 'wedding', ...over } as unknown as StoryManifest);

describe('isStoryDraftPath', () => {
  it('matches story / obituary / tribute paths only', () => {
    expect(isStoryDraftPath('storySection.body')).toBe(true);
    expect(isStoryDraftPath('storySection.headline')).toBe(true);
    expect(isStoryDraftPath('obituary')).toBe(true);
    expect(isStoryDraftPath('tributeIntro')).toBe(true);
    expect(isStoryDraftPath('poetry.heroTagline')).toBe(false);
    expect(isStoryDraftPath('faqs.0.answer')).toBe(false);
    expect(isStoryDraftPath('registryIntro')).toBe(false);
  });
});

describe('isDrafted', () => {
  it('reads the draftedByPear map', () => {
    const m = base({ draftedByPear: { 'storySection.body': true } });
    expect(isDrafted(m, 'storySection.body')).toBe(true);
    expect(isDrafted(m, 'poetry.heroTagline')).toBe(false);
    expect(isDrafted(base(), 'storySection.body')).toBe(false);
  });
});

describe('clearDraftedPath', () => {
  it('removes one path and keeps the others', () => {
    const m = base({ draftedByPear: { 'storySection.body': true, 'poetry.heroTagline': true } });
    const out = clearDraftedPath(m, 'storySection.body') as unknown as Record<string, unknown>;
    expect(out.draftedByPear).toEqual({ 'poetry.heroTagline': true });
  });

  it('drops draftedByPear entirely when the last path is cleared', () => {
    const m = base({ draftedByPear: { 'registryIntro': true } });
    const out = clearDraftedPath(m, 'registryIntro') as unknown as Record<string, unknown>;
    expect(out.draftedByPear).toBeUndefined();
  });

  it('is a same-reference no-op when the path was not flagged', () => {
    const m = base({ draftedByPear: { 'storySection.body': true } });
    expect(clearDraftedPath(m, 'poetry.heroTagline')).toBe(m);
    // no draftedByPear at all → untouched reference
    const m2 = base();
    expect(clearDraftedPath(m2, 'anything')).toBe(m2);
  });

  it('does not mutate the input', () => {
    const m = base({ draftedByPear: { 'storySection.body': true, 'faqs.0.answer': true } });
    const snapshot = JSON.stringify(m);
    clearDraftedPath(m, 'storySection.body');
    expect(JSON.stringify(m)).toBe(snapshot);
  });

  it('clears pearReviewRequired once the last solemn story path is removed', () => {
    const m = base({
      occasion: 'memorial',
      pearReviewRequired: true,
      draftedByPear: { 'storySection.body': true },
    });
    const out = clearDraftedPath(m, 'storySection.body') as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBeUndefined();
    expect(out.draftedByPear).toBeUndefined();
  });

  it('keeps pearReviewRequired while another story path remains', () => {
    const m = base({
      occasion: 'memorial',
      pearReviewRequired: true,
      draftedByPear: { 'storySection.body': true, 'storySection.headline': true },
    });
    const out = clearDraftedPath(m, 'storySection.body') as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBe(true);
    expect(out.draftedByPear).toEqual({ 'storySection.headline': true });
  });

  it('clearing a NON-story path does not disturb pearReviewRequired', () => {
    const m = base({
      occasion: 'memorial',
      pearReviewRequired: true,
      draftedByPear: { 'storySection.body': true, 'registryIntro': true },
    });
    const out = clearDraftedPath(m, 'registryIntro') as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBe(true);
  });
});

describe('clearDraftedPaths', () => {
  it('clears several paths in one pass', () => {
    const m = base({ draftedByPear: { 'poetry.heroTagline': true, 'tagline': true, 'faqs.0.answer': true } });
    const out = clearDraftedPaths(m, ['poetry.heroTagline', 'tagline']) as unknown as Record<string, unknown>;
    expect(out.draftedByPear).toEqual({ 'faqs.0.answer': true });
  });
});

describe('hasDraftedStoryPaths', () => {
  it('is true only when a story path is drafted', () => {
    expect(hasDraftedStoryPaths(base({ draftedByPear: { 'storySection.body': true } }))).toBe(true);
    expect(hasDraftedStoryPaths(base({ draftedByPear: { 'registryIntro': true } }))).toBe(false);
    expect(hasDraftedStoryPaths(base())).toBe(false);
  });
});

describe('publishNeedsReview — the solemn gate', () => {
  it('is true for a memorial with a drafted story + the flag', () => {
    const m = base({ occasion: 'memorial', pearReviewRequired: true, draftedByPear: { 'storySection.body': true } });
    expect(publishNeedsReview(m)).toBe(true);
  });

  it('is false on a non-solemn occasion even with the flag + story draft', () => {
    const m = base({ occasion: 'wedding', pearReviewRequired: true, draftedByPear: { 'storySection.body': true } });
    expect(publishNeedsReview(m)).toBe(false);
  });

  it('is false when the flag is absent', () => {
    const m = base({ occasion: 'memorial', draftedByPear: { 'storySection.body': true } });
    expect(publishNeedsReview(m)).toBe(false);
  });

  it('is false when no drafted story path remains (host edited them)', () => {
    const m = base({ occasion: 'memorial', pearReviewRequired: true, draftedByPear: { 'registryIntro': true } });
    expect(publishNeedsReview(m)).toBe(false);
  });

  it('is false on a clean manifest', () => {
    expect(publishNeedsReview(base({ occasion: 'memorial' }))).toBe(false);
  });
});

describe('acknowledgeReview', () => {
  it('clears the flag and keeps the badges', () => {
    const m = base({ occasion: 'memorial', pearReviewRequired: true, draftedByPear: { 'storySection.body': true } });
    const out = acknowledgeReview(m) as unknown as Record<string, unknown>;
    expect(out.pearReviewRequired).toBeUndefined();
    expect(out.draftedByPear).toEqual({ 'storySection.body': true });
    // and publish is now unblocked
    expect(publishNeedsReview(out as unknown as StoryManifest)).toBe(false);
  });

  it('is a same-reference no-op when the flag is absent', () => {
    const m = base({ occasion: 'memorial' });
    expect(acknowledgeReview(m)).toBe(m);
  });

  it('does not mutate the input', () => {
    const m = base({ occasion: 'memorial', pearReviewRequired: true });
    const snapshot = JSON.stringify(m);
    acknowledgeReview(m);
    expect(JSON.stringify(m)).toBe(snapshot);
  });
});
