// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/unsubscribe.test.ts
//
// The signed one-click unsubscribe token is the credential the
// /unsubscribe route trusts with no session — so a round-trip that
// survives, a tamper that's rejected, and a stable URL matter.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { signUnsubToken, verifyUnsubToken, buildUnsubscribeUrl } from './unsubscribe';

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.EMAIL_UNSUB_SECRET = 'test-unsub-secret';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://pearloom.test';
  });

  it('round-trips email + siteId + channel', () => {
    const token = signUnsubToken({ email: 'Guest@Example.com', siteId: 'site-123', channel: 'invite' });
    const target = verifyUnsubToken(token);
    expect(target).toEqual({ email: 'guest@example.com', siteId: 'site-123', channel: 'invite' });
  });

  it('lowercases the email and defaults missing site/channel to null', () => {
    const target = verifyUnsubToken(signUnsubToken({ email: 'A@B.CO' }));
    expect(target).toEqual({ email: 'a@b.co', siteId: null, channel: null });
  });

  it('rejects a tampered payload', () => {
    const token = signUnsubToken({ email: 'guest@example.com', siteId: 'site-1' });
    const [, sig] = token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ e: 'evil@example.com' }), 'utf8').toString('base64url');
    expect(verifyUnsubToken(`${forgedPayload}.${sig}`)).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signUnsubToken({ email: 'guest@example.com' });
    process.env.EMAIL_UNSUB_SECRET = 'a-different-secret';
    expect(verifyUnsubToken(token)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(verifyUnsubToken('')).toBeNull();
    expect(verifyUnsubToken('no-dot')).toBeNull();
    expect(verifyUnsubToken('a.')).toBeNull();
    expect(verifyUnsubToken(null)).toBeNull();
  });

  it('builds a one-click URL that verifies back to the recipient', () => {
    const url = buildUnsubscribeUrl({ email: 'guest@example.com', siteId: 'site-9' });
    expect(url.startsWith('https://pearloom.test/unsubscribe?u=')).toBe(true);
    const u = new URL(url).searchParams.get('u');
    expect(verifyUnsubToken(u)).toMatchObject({ email: 'guest@example.com', siteId: 'site-9' });
  });
});
