import { describe, it, expect } from 'vitest';
import { daysBetweenCalendarDates, formatDaysAgo } from './date-utils';

describe('daysBetweenCalendarDates', () => {
  it('is 0 for the same calendar day regardless of time-of-day', () => {
    const morning = new Date(2026, 5, 14, 0, 0, 0);
    const night = new Date(2026, 5, 14, 23, 59, 59);
    expect(daysBetweenCalendarDates(morning, night)).toBe(0);
    expect(daysBetweenCalendarDates(night, morning)).toBe(0);
  });

  it('reads negative once the target has passed, however long ago', () => {
    const target = new Date(2026, 5, 1); // June 1
    const threeWeeksLater = new Date(2026, 5, 22); // June 22
    expect(daysBetweenCalendarDates(target, threeWeeksLater)).toBe(-21);
  });

  it('reads positive for an upcoming date', () => {
    const target = new Date(2026, 5, 22);
    const now = new Date(2026, 5, 1);
    expect(daysBetweenCalendarDates(target, now)).toBe(21);
  });

  it('ignores time-of-day on both sides', () => {
    const target = new Date(2026, 5, 1, 23, 0, 0);
    const now = new Date(2026, 4, 31, 1, 0, 0);
    expect(daysBetweenCalendarDates(target, now)).toBe(1);
  });
});

describe('formatDaysAgo', () => {
  it('reads "today" for zero or negative input', () => {
    expect(formatDaysAgo(0)).toBe('today');
    expect(formatDaysAgo(-3)).toBe('today');
  });

  it('reads "yesterday" for exactly one day', () => {
    expect(formatDaysAgo(1)).toBe('yesterday');
  });

  it('reads plain days under two weeks', () => {
    expect(formatDaysAgo(5)).toBe('5 days ago');
    expect(formatDaysAgo(13)).toBe('13 days ago');
  });

  it('reads weeks between two and eight weeks', () => {
    expect(formatDaysAgo(21)).toBe('3 weeks ago');
    expect(formatDaysAgo(59)).toBe('8 weeks ago');
  });

  it('reads months between two months and a year', () => {
    expect(formatDaysAgo(90)).toBe('3 months ago');
    expect(formatDaysAgo(364)).toBe('12 months ago');
  });

  it('reads years beyond a year', () => {
    expect(formatDaysAgo(365)).toBe('a year ago');
    expect(formatDaysAgo(800)).toBe('2 years ago');
  });
});
