// ─────────────────────────────────────────────────────────────
// The forbidden-strings test (AFTERGLOW-PLAN §5): build the Home's
// derived copy for a wedding ELEVEN DAYS PAST and assert the
// planning voice is gone. This is the regression fence for the
// five screenshot lies — "FINAL STRETCH", the prep checklist,
// "The big day · 0 days out", "Save the date", "You're doing".
// The +90-day case pins that pre-day output didn't move.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { cockpitPhaseFor, phaseCopyFor, postEventEyebrowFor } from '@/lib/event-os/cockpit-phase';
import { stageFromDaysUntil, buildMilestones, buildChecklist } from './welcome-home-copy';

const AFTERGLOW_DAYS = -11;
const PLANNING_DAYS = 90;

function pipelineFor(rawDaysUntil: number, occasion = 'wedding') {
  const daysUntil = Math.max(0, rawDaysUntil);
  const phase = cockpitPhaseFor(rawDaysUntil);
  const stage = stageFromDaysUntil(daysUntil);
  const solemn = occasion === 'memorial' || occasion === 'funeral';
  const copy = phaseCopyFor(phase, solemn ? 'solemn' : 'celebratory', stage);
  const milestones = buildMilestones({
    phase, stage,
    eventDate: new Date('2026-06-27T00:00:00'),
    eventDateShort: 'Jun 27, 2026',
    daysUntil, rawDaysUntil,
    guestCounts: { invited: 96, yes: 74, no: 12, maybe: 2, pending: 8 },
    cadence: null,
    occasion,
    createdAt: '2026-03-02T12:00:00Z',
    publishedAt: '2026-03-09T12:00:00Z',
    published: true,
  });
  const checklist = buildChecklist(phase, solemn, { vendorBalancesOpen: true });
  return { phase, copy, milestones, checklist };
}

describe('the afterglow speaks past tense — forbidden strings (wedding, 11 days after)', () => {
  const { phase, copy, milestones, checklist } = pipelineFor(AFTERGLOW_DAYS);
  const flat = JSON.stringify({ copy, milestones, checklist });

  it('resolves to the afterglow phase', () => {
    expect(phase).toBe('afterglow');
  });

  it('never says the planning words', () => {
    expect(flat).not.toContain('Final stretch');
    expect(flat).not.toContain('days out');
    expect(flat).not.toContain('Save the date');
    expect(flat).not.toContain('save-the-date');
    expect(flat).not.toContain('Confirm vendor arrival');
    expect(flat).not.toContain("You're doing");
    expect(flat).not.toContain("You're building");
    expect(flat).not.toContain('Book vendors');
    expect(flat).not.toContain('RSVP cutoff');
    expect(postEventEyebrowFor('wedding')).not.toBe('Save the date');
  });

  it('the story rail is all done, with real stamps and "days ago"', () => {
    expect(milestones.every((m) => m.status === 'done' || m.status === 'distant')).toBe(true);
    expect(milestones.map((m) => m.label)).toContain('74 said yes');
    const day = milestones[milestones.length - 1];
    expect(day.label).toBe('The big day');
    expect(day.sub).toBe('11 days ago');
    // Real stamps: pressed + published carry short dates.
    expect(milestones[0].date).toBe('Mar 2');
    expect(milestones[1].date).toBe('Mar 9');
  });

  it('the checklist is the afterglow list', () => {
    const titles = checklist.map((c) => c.t);
    expect(titles).toContain('Send the thank-yous');
    expect(titles).toContain('Settle vendor balances');
    expect(titles).not.toContain('Pack welcome gifts');
  });
});

describe('kept phase (a year past) asks nothing', () => {
  it('checklist is empty; the header is the keepsake voice', () => {
    const { phase, copy, checklist } = pipelineFor(-400);
    expect(phase).toBe('kept');
    expect(checklist).toEqual([]);
    expect(copy.blessing).toBe('It was wonderful.');
  });
});

describe('solemn afterglow reads as the remembering, not the wrap-up', () => {
  it('gentle list, gentle labels', () => {
    const { copy, checklist, milestones } = pipelineFor(AFTERGLOW_DAYS, 'memorial');
    expect(copy.label).toBe('The remembering');
    expect(copy.blessing).toBe('Held with love and care.');
    const flat = JSON.stringify(checklist);
    expect(flat).not.toContain('thank-you');
    expect(flat).toContain('tribute wall');
    expect(milestones[milestones.length - 1].label).toBe('The gathering');
  });
});

describe('pre-day output did not move (+90 days — zero regressions)', () => {
  const { phase, copy, milestones, checklist } = pipelineFor(PLANNING_DAYS);

  it('is planning, in the building voice', () => {
    expect(phase).toBe('planning');
    expect(copy.label).toBe('Mid-planning');
    expect(copy.headerTitle).toBe("You're building");
    expect(copy.blessing).toBe("You're doing something wonderful.");
  });

  it('keeps the planning ladder and prep checklist', () => {
    const flat = JSON.stringify(milestones);
    expect(flat).toContain('days out');
    expect(milestones[milestones.length - 1].label).toBe('The big day');
    expect(checklist.map((c) => c.t)).toContain('Confirm vendor arrival times');
  });

  it('30 days out is the final stretch — 31 is not', () => {
    expect(phaseCopyFor(cockpitPhaseFor(30), 'celebratory').label).toBe('Final stretch');
    expect(phaseCopyFor(cockpitPhaseFor(31), 'celebratory', 'mid').label).toBe('Mid-planning');
  });
});
