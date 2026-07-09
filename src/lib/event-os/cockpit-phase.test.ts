// The boundary matrix for the cockpit's one clock — if any of
// these move, every Home card moves with them (AFTERGLOW-PLAN §3).

import { describe, it, expect } from 'vitest';
import {
  cockpitPhaseFor,
  isPostEventPhase,
  phaseCopyFor,
  postEventEyebrowFor,
  AFTERGLOW_WINDOW_DAYS,
  FINAL_STRETCH_DAYS,
} from './cockpit-phase';

describe('cockpitPhaseFor — boundary matrix', () => {
  it('resolves every boundary day', () => {
    expect(cockpitPhaseFor(null)).toBe('planning');    // no date yet
    expect(cockpitPhaseFor(200)).toBe('planning');
    expect(cockpitPhaseFor(31)).toBe('planning');
    expect(cockpitPhaseFor(30)).toBe('final');
    expect(cockpitPhaseFor(1)).toBe('final');
    expect(cockpitPhaseFor(0)).toBe('the-day');
    expect(cockpitPhaseFor(-1)).toBe('afterglow');
    expect(cockpitPhaseFor(-45)).toBe('afterglow');
    expect(cockpitPhaseFor(-46)).toBe('kept');
    expect(cockpitPhaseFor(-1000)).toBe('kept');
  });

  it('constants match the documented windows', () => {
    expect(FINAL_STRETCH_DAYS).toBe(30);
    expect(AFTERGLOW_WINDOW_DAYS).toBe(45);
  });

  it('isPostEventPhase covers exactly afterglow + kept', () => {
    expect(isPostEventPhase('planning')).toBe(false);
    expect(isPostEventPhase('final')).toBe(false);
    expect(isPostEventPhase('the-day')).toBe(false);
    expect(isPostEventPhase('afterglow')).toBe(true);
    expect(isPostEventPhase('kept')).toBe(true);
  });
});

describe('phaseCopyFor — tense never lies', () => {
  it('planning/final keep the building voice', () => {
    expect(phaseCopyFor('planning', 'celebratory', 'early').label).toBe('Planning');
    expect(phaseCopyFor('planning', 'celebratory', 'mid').label).toBe('Mid-planning');
    expect(phaseCopyFor('final', 'celebratory').label).toBe('Final stretch');
    expect(phaseCopyFor('final', 'celebratory').headerTitle).toBe("You're building");
  });

  it('afterglow speaks in the past — never the planning voice', () => {
    const copy = phaseCopyFor('afterglow', 'celebratory');
    const flat = JSON.stringify(copy);
    expect(copy.label).toBe('The afterglow');
    expect(copy.headerTitle).toBe('You did');
    expect(copy.blessing).toBe('You did something wonderful.');
    expect(flat).not.toContain('Final stretch');
    expect(flat).not.toContain("You're doing");
    expect(flat).not.toContain("You're building");
  });

  it('kept is the quiet keepsake voice', () => {
    const copy = phaseCopyFor('kept', 'celebratory');
    expect(copy.blessing).toBe('It was wonderful.');
    expect(`${copy.headerTitle} ${copy.headerItalic}`).toBe('Something worth keeping.');
  });

  it('solemn occasions keep the remembering register in every phase', () => {
    for (const phase of ['planning', 'final', 'the-day', 'afterglow', 'kept'] as const) {
      const copy = phaseCopyFor(phase, 'solemn');
      expect(copy.blessing).toBe('Held with love and care.');
      expect(JSON.stringify(copy)).not.toContain('wonderful');
    }
    expect(phaseCopyFor('afterglow', 'solemn').label).toBe('The remembering');
  });
});

describe('postEventEyebrowFor — never "Save the date" after the day', () => {
  it('names the big ones', () => {
    expect(postEventEyebrowFor('wedding')).toBe('Just married');
    expect(postEventEyebrowFor('memorial')).toBe('In loving memory');
    expect(postEventEyebrowFor('funeral')).toBe('In loving memory');
    expect(postEventEyebrowFor('graduation')).toBe('They did it');
  });

  it('unknown occasions fall to the quiet generic, never the planning eyebrow', () => {
    expect(postEventEyebrowFor('housewarming')).toBe('The day, kept');
    expect(postEventEyebrowFor('not-a-real-occasion')).toBe('The day, kept');
    for (const occ of ['wedding', 'birthday', 'reunion', 'housewarming', 'memorial']) {
      expect(postEventEyebrowFor(occ)).not.toBe('Save the date');
    }
  });
});
