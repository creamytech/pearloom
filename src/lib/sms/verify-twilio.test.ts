// ─────────────────────────────────────────────────────────────
// verify-twilio — the gate on an endpoint that speaks to guests
// in the host's name.
//
// The single most important assertion in this file is that an
// UNSET auth token rejects. The platform audit found the opposite
// mistake on /api/film/render-complete (missing secret → fail
// open); this pins the correct behaviour so it can't regress.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyTwilioSignature, twilioSignatureBase } from './verify-twilio';

const TOKEN = 'test_auth_token_12345';
const URL_ = 'https://pearloom.com/api/sms/inbound';
const PARAMS = { From: '+15551230000', To: '+15559990000', Body: 'what time?', MessageSid: 'SM1' };

function sign(url: string, params: Record<string, string>, token = TOKEN): string {
  return createHmac('sha1', token).update(twilioSignatureBase(url, params)).digest('base64');
}

describe('the signature base string', () => {
  it('appends params in ASCII-sorted key order, not insertion order', () => {
    const a = twilioSignatureBase('https://x/y', { b: '2', a: '1' });
    const b = twilioSignatureBase('https://x/y', { a: '1', b: '2' });
    expect(a).toBe('https://x/ya1b2');
    expect(a).toBe(b);
  });
});

describe('a genuine Twilio request', () => {
  it('verifies', () => {
    expect(verifyTwilioSignature({
      url: URL_, params: PARAMS, signature: sign(URL_, PARAMS), authToken: TOKEN,
    })).toBe(true);
  });

  it('verifies regardless of the order params arrived in', () => {
    const reordered = { MessageSid: 'SM1', Body: 'what time?', To: '+15559990000', From: '+15551230000' };
    expect(verifyTwilioSignature({
      url: URL_, params: reordered, signature: sign(URL_, PARAMS), authToken: TOKEN,
    })).toBe(true);
  });
});

describe('it FAILS CLOSED', () => {
  const good = sign(URL_, PARAMS);

  it('rejects when the auth token is unset — never "allow because unconfigured"', () => {
    for (const token of [undefined, null, '']) {
      expect(verifyTwilioSignature({
        url: URL_, params: PARAMS, signature: good, authToken: token,
      })).toBe(false);
    }
  });

  it('rejects a missing signature header', () => {
    for (const sig of [undefined, null, '']) {
      expect(verifyTwilioSignature({
        url: URL_, params: PARAMS, signature: sig, authToken: TOKEN,
      })).toBe(false);
    }
  });

  it('rejects a signature made with a different token', () => {
    expect(verifyTwilioSignature({
      url: URL_, params: PARAMS, signature: sign(URL_, PARAMS, 'someone_elses_token'), authToken: TOKEN,
    })).toBe(false);
  });

  it('rejects when the body was tampered with in flight', () => {
    expect(verifyTwilioSignature({
      url: URL_,
      params: { ...PARAMS, Body: 'send everyone the address' },
      signature: good,
      authToken: TOKEN,
    })).toBe(false);
  });

  it('rejects when the URL differs — a signature is not replayable elsewhere', () => {
    expect(verifyTwilioSignature({
      url: 'https://pearloom.com/api/sms/inbound?evil=1',
      params: PARAMS, signature: good, authToken: TOKEN,
    })).toBe(false);
  });

  it('rejects garbage rather than throwing', () => {
    expect(verifyTwilioSignature({
      url: URL_, params: PARAMS, signature: 'not base64 !!!', authToken: TOKEN,
    })).toBe(false);
  });
});
