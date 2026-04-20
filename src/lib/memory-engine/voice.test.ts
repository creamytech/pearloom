// ─────────────────────────────────────────────────────────────
// Pearloom / lib/memory-engine/voice.test.ts
//
// Guardrail for the per-occasion voice system. If these
// assertions fail it's because someone silently changed the
// voice guidance for a category, which changes the tone of
// every drafted site for that category.
//
// Three things this guards:
//   1. All 5 voice archetypes exist + are non-trivial strings.
//   2. Memorial's banned list rejects cheerful words — a
//      regression would let "party"/"fun"/etc. through.
//   3. Playful's banned list rejects ceremonial words — so
//      bachelor sites don't slip into wedding-tone clichés.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  VOICE_GUIDANCE,
  VOICE_PRONOUNS,
  VOICE_BANNED,
  type PoetryVoice,
} from './claude-passes';

const ALL_VOICES: PoetryVoice[] = [
  'celebratory',
  'intimate',
  'ceremonial',
  'playful',
  'solemn',
];

describe('voice archetypes', () => {
  it('defines guidance, pronouns, and banned list for every voice', () => {
    for (const v of ALL_VOICES) {
      expect(VOICE_GUIDANCE[v]).toBeTruthy();
      expect(VOICE_GUIDANCE[v].length).toBeGreaterThan(30);
      expect(VOICE_PRONOUNS[v]).toBeTruthy();
      expect(VOICE_PRONOUNS[v].length).toBeGreaterThan(10);
      expect(VOICE_BANNED[v].length).toBeGreaterThan(0);
    }
  });

  it('each voice guidance is distinct — no silent duplication', () => {
    const seen = new Set<string>();
    for (const v of ALL_VOICES) {
      expect(seen.has(VOICE_GUIDANCE[v])).toBe(false);
      seen.add(VOICE_GUIDANCE[v]);
    }
  });
});

describe('solemn voice (memorial / funeral)', () => {
  it('bans cheerful / party words', () => {
    const banned = VOICE_BANNED.solemn;
    expect(banned).toContain('party');
    expect(banned).toContain('celebrate');
    expect(banned).toContain('fun');
    expect(banned).toContain('happy');
  });

  it('uses gentle narrator — never first-person-plural', () => {
    const pronouns = VOICE_PRONOUNS.solemn.toLowerCase();
    expect(pronouns).toContain('never first-person');
  });

  it('guidance explicitly flags grief-awareness', () => {
    const g = VOICE_GUIDANCE.solemn.toLowerCase();
    expect(g).toMatch(/respectful|grief|gentle/);
    expect(g).not.toMatch(/upbeat|celebrate|loud/);
  });
});

describe('playful voice (bachelor / bachelorette / sweet sixteen)', () => {
  it('bans ceremonial / wedding words', () => {
    const banned = VOICE_BANNED.playful;
    expect(banned).toContain('sacred');
    expect(banned).toContain('forever');
    expect(banned).toContain('eternity');
  });

  it('explicitly excludes couple voice — bachelor party is not the couple\u2019s site', () => {
    const pronouns = VOICE_PRONOUNS.playful.toLowerCase();
    expect(pronouns).toMatch(/narrator|host/);
    expect(pronouns).toContain('not the couple');
  });
});

describe('ceremonial voice (bar/bat mitzvah, confirmation, wedding)', () => {
  it('bans twee / magical words', () => {
    const banned = VOICE_BANNED.ceremonial;
    expect(banned).toContain('magical');
    expect(banned).toContain('fairytale');
  });
});

describe('baseline banned list applies to every voice', () => {
  it('includes the four overused wedding clichés', () => {
    const expected = ['journey', 'adventure', 'fairy tale', 'soulmate'];
    for (const v of ALL_VOICES) {
      for (const word of expected) {
        expect(VOICE_BANNED[v]).toContain(word);
      }
    }
  });
});
