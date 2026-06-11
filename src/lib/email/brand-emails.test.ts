// ─────────────────────────────────────────────────────────────
// brand-emails — the branded lifecycle email catalog.
// Guards: every builder returns full HTML through emailLayout,
// user-supplied strings are escaped, and guest-facing builders
// honor an injected suite-derived theme.
// ─────────────────────────────────────────────────────────────

import { describe, expect, it } from 'vitest';
import {
  BRAND_EMAIL_THEME,
  buildWelcomeEmail,
  buildCoHostInviteEmail,
  buildCoordinatorInviteEmail,
  buildNudgeEmail,
  buildBroadcastEmail,
  buildMemoryPromptEmail,
  buildAnniversaryEmail,
  buildHostRsvpNotificationEmail,
} from './brand-emails';

describe('brand emails', () => {
  it('welcome — full document, CTA, first-name greeting', () => {
    const { subject, html } = buildWelcomeEmail({ name: 'Shauna Scott', dashboardUrl: 'https://pearloom.com/dashboard' });
    expect(subject).toContain('Welcome to Pearloom');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Shauna');
    expect(html).toContain('https://pearloom.com/dashboard');
    expect(html).toContain('Begin a thread');
  });

  it('co-host invite — role copy per role, expiry note', () => {
    const editor = buildCoHostInviteEmail({ coupleDisplay: 'Scott & Shauna', role: 'editor', acceptUrl: 'https://x/co-host/t' });
    expect(editor.subject).toBe('Scott & Shauna invited you to co-host');
    expect(editor.html).toContain('Co-editor');
    expect(editor.html).toContain('14 days');
    const viewer = buildCoHostInviteEmail({ coupleDisplay: 'A & B', role: 'viewer', acceptUrl: 'https://x' });
    expect(viewer.html).toContain('Viewer');
    // Unknown role falls back to editor copy rather than crashing.
    const odd = buildCoHostInviteEmail({ coupleDisplay: 'A & B', role: 'nonsense', acceptUrl: 'https://x' });
    expect(odd.html).toContain('Co-editor');
  });

  it('coordinator invite — inviter is escaped', () => {
    const { html } = buildCoordinatorInviteEmail({
      inviterName: '<script>alert(1)</script>',
      roleLabel: 'coordinator',
      acceptUrl: 'https://x/invite?token=t',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('nudge — host body is escaped and quoted, theme override applies', () => {
    const theme = { ...BRAND_EMAIL_THEME, background: '#FFF8F0', accent: '#224422' };
    const { html } = buildNudgeEmail({
      couple: 'Scott & Shauna',
      bodyText: 'We need a <count> by Friday!',
      ctaUrl: 'https://x/g/tok',
      recipientName: 'Marco Polo',
      theme,
    });
    expect(html).toContain('&lt;count&gt;');
    expect(html).toContain('Marco');
    expect(html).toContain('#224422');
  });

  it('broadcast + memory prompt + anniversary render their content', () => {
    expect(buildBroadcastEmail({ couple: 'A & B', message: 'Ceremony moved to 5pm', ctaUrl: 'https://x' }).html)
      .toContain('Ceremony moved to 5pm');
    expect(buildMemoryPromptEmail({ guestFirstName: 'Kai', names: 'A & B', prompt: 'That night in Kyoto…', passportUrl: 'https://x/g/t' }).html)
      .toContain('That night in Kyoto');
    const ann = buildAnniversaryEmail({ couple: 'A & B', yearsAgo: 1, recapUrl: 'https://x/recap', unsubUrl: 'https://x/unsub' });
    expect(ann.subject).toContain('one year');
    expect(ann.html).toContain('https://x/unsub');
  });

  it('host RSVP notification — verb tracks attendance, rows render', () => {
    const yes = buildHostRsvpNotificationEmail({
      guestName: 'Marco', attending: true, siteLabel: 'scott-and-shauna',
      rows: [{ label: 'Meal', value: 'Veg & "spicy"' }],
      dashboardUrl: 'https://x/dashboard/rsvps',
    });
    expect(yes.subject).toContain('is coming');
    expect(yes.html).toContain('&quot;spicy&quot;');
    const no = buildHostRsvpNotificationEmail({
      guestName: 'Marco', attending: false, siteLabel: 's', rows: [], dashboardUrl: 'https://x',
    });
    expect(no.subject).toContain('can’t make it');
  });
});

describe('notification system emails', () => {
  it('host alert — title as subject, optional body quoted, prefs hint', async () => {
    const { buildHostAlertEmail } = await import('./brand-emails');
    const { subject, html } = buildHostAlertEmail({
      siteLabel: 'Scott & Shauna',
      title: 'Marco can’t make it',
      body: 'So sorry — we will toast from afar <3',
      ctaUrl: 'https://pearloom.com/dashboard/rsvp',
    });
    expect(subject).toBe('Marco can’t make it');
    expect(html).toContain('&lt;3');
    expect(html).toContain('Settings → Notifications');
  });

  it('daily digest — counts headline, item rows, overflow note', async () => {
    const { buildDailyDigestEmail } = await import('./brand-emails');
    const items = Array.from({ length: 14 }, (_, i) => ({
      label: `Guest ${i} is in`,
      href: '/dashboard/rsvp',
    }));
    const { subject, html } = buildDailyDigestEmail({
      coupleDisplay: 'Scott & Shauna',
      siteLabel: 'Scott & Shauna',
      items,
      counts: [{ n: 14, noun: 'replies' }, { n: 0, noun: 'gifts claimed' }],
      dashboardUrl: 'https://pearloom.com/dashboard',
    });
    expect(subject).toContain('14 replies');
    expect(subject).not.toContain('gifts');
    expect(html).toContain('Guest 0 is in');
    expect(html).toContain('…and 2 more');
  });

  it('cadence — host copy escaped + quoted, CTA label honored', async () => {
    const { buildCadenceEmail } = await import('./brand-emails');
    const { html } = buildCadenceEmail({
      couple: 'A & B',
      body: 'Reply by <Friday>!\n\nLove, us',
      ctaLabel: 'Reply on the site',
      ctaUrl: 'https://x/g/tok',
    });
    expect(html).toContain('&lt;Friday&gt;');
    expect(html).toContain('Reply on the site');
    expect(html).toContain('https://x/g/tok');
  });
});
