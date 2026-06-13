// Defaults are the contract: email is for what changes the host's
// plans (declines / gifts / cohost instant), volume goes to the
// daily digest, nothing pushes until the host opts in.

import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, isNotificationCategory, NOTIFICATION_CATEGORIES } from './prefs';

describe('notification prefs', () => {
  it('defaults match the flow spec', () => {
    expect(DEFAULT_PREFS.replies.emailMode).toBe('digest');
    expect(DEFAULT_PREFS.declines.emailMode).toBe('instant');
    expect(DEFAULT_PREFS.gifts.emailMode).toBe('instant');
    expect(DEFAULT_PREFS.content.emailMode).toBe('digest');
    expect(DEFAULT_PREFS.cohost.emailMode).toBe('instant');
    for (const c of Object.values(DEFAULT_PREFS)) expect(c.pushEnabled).toBe(false);
  });

  it('category catalog and defaults stay in sync', () => {
    expect(NOTIFICATION_CATEGORIES.map((c) => c.id).sort()).toEqual(Object.keys(DEFAULT_PREFS).sort());
    expect(isNotificationCategory('gifts')).toBe(true);
    expect(isNotificationCategory('spam')).toBe(false);
  });
});
