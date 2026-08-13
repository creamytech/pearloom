// ─────────────────────────────────────────────────────────────
// Channel handling — the two ways this goes wrong.
//
// 1. THE PREFIX ISN'T STRIPPED. Guest rows hold bare numbers, so
//    "whatsapp:+15551230000" matches nobody, and a real guest gets
//    the unknown-number reply — correct behaviour applied to a
//    wrong fact, which is the hardest kind of bug to see.
//
// 2. THE REPLY GOES BACK THE WRONG WAY. Answering a WhatsApp
//    message over SMS bills the guest, arrives from a number they
//    don't recognise, and in much of the world just fails.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { parseChannelAddress, formatChannelAddress, channelLabel } from './channel';

describe('parsing what Twilio sends', () => {
  it('reads a plain SMS address', () => {
    expect(parseChannelAddress('+15551230000')).toEqual({ channel: 'sms', phone: '+15551230000' });
  });

  it('strips the whatsapp: prefix so guest lookup can match', () => {
    expect(parseChannelAddress('whatsapp:+15551230000'))
      .toEqual({ channel: 'whatsapp', phone: '+15551230000' });
  });

  it('is case-insensitive about the prefix', () => {
    expect(parseChannelAddress('WhatsApp:+15551230000')?.channel).toBe('whatsapp');
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseChannelAddress('  whatsapp:+15551230000  '))
      .toEqual({ channel: 'whatsapp', phone: '+15551230000' });
  });

  it('returns null for nothing, rather than a channel with no number', () => {
    for (const bad of ['', '   ', null, undefined, 'whatsapp:', 'whatsapp:   ']) {
      expect(parseChannelAddress(bad), String(bad)).toBeNull();
    }
  });
});

describe('replies go back the way they came', () => {
  it('re-prefixes a WhatsApp reply', () => {
    expect(formatChannelAddress({ channel: 'whatsapp', phone: '+15551230000' }))
      .toBe('whatsapp:+15551230000');
  });

  it('leaves an SMS reply bare', () => {
    expect(formatChannelAddress({ channel: 'sms', phone: '+15551230000' }))
      .toBe('+15551230000');
  });

  it('round-trips both channels unchanged', () => {
    for (const raw of ['+15551230000', 'whatsapp:+15551230000']) {
      const parsed = parseChannelAddress(raw)!;
      expect(formatChannelAddress(parsed)).toBe(raw);
    }
  });
});

describe('labels', () => {
  it('names the channel in words a host would use', () => {
    expect(channelLabel('whatsapp')).toBe('WhatsApp');
    expect(channelLabel('sms')).toBe('text message');
  });
});
