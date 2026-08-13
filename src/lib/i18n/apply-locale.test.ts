// ─────────────────────────────────────────────────────────────
// applyLocale — pins the faqs field-name contract.
//
// Regression: applyLocale used to read `manifest.faq`, but the
// manifest field is `faqs` (FaqItem[]), so FAQ translations never
// rendered. The translation ENTRY keeps its historical `faq` key;
// only the manifest side is `faqs`.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { applyLocale, availableLocales } from './apply-locale';
import type { StoryManifest, FaqItem } from '@/types';

function faq(id: string, question: string, answer: string, order = 0): FaqItem {
  return { id, question, answer, order };
}

function baseManifest(overrides: Partial<StoryManifest> = {}): StoryManifest {
  return {
    faqs: [
      faq('f1', 'Can I bring a guest?', 'Check your invitation for a plus-one.'),
      faq('f2', 'Where do I park?', 'The garage on 5th is free after 6pm.'),
    ],
    translations: {
      es: {
        faq: [
          { id: 'f1', question: '¿Puedo llevar acompañante?', answer: 'Revisa tu invitación.' },
          { id: 'f2', question: '¿Dónde estaciono?', answer: 'El garaje de la 5ª es gratis después de las 6.' },
        ],
      },
    },
    ...overrides,
  } as unknown as StoryManifest;
}

describe('applyLocale — FAQ', () => {
  it('translates manifest.faqs from the entry\'s faq key', () => {
    const next = applyLocale(baseManifest(), 'es');
    expect(next.faqs?.[0].question).toBe('¿Puedo llevar acompañante?');
    expect(next.faqs?.[0].answer).toBe('Revisa tu invitación.');
    expect(next.faqs?.[1].question).toBe('¿Dónde estaciono?');
    expect(next.activeLocale).toBe('es');
  });

  it('matches by id, not index, when ids are present', () => {
    const m = baseManifest();
    // Reverse the translation array order — id matching must still win.
    m.translations!.es.faq = [...m.translations!.es.faq!].reverse();
    const next = applyLocale(m, 'es');
    expect(next.faqs?.[0].question).toBe('¿Puedo llevar acompañante?');
    expect(next.faqs?.[1].question).toBe('¿Dónde estaciono?');
  });

  it('keeps the original row when a translation is missing', () => {
    const m = baseManifest();
    m.translations!.es.faq = [{ id: 'f1', question: '¿Puedo llevar acompañante?' }];
    const next = applyLocale(m, 'es');
    // f1 translated question, untranslated answer falls back.
    expect(next.faqs?.[0].question).toBe('¿Puedo llevar acompañante?');
    expect(next.faqs?.[0].answer).toBe('Check your invitation for a plus-one.');
    // f2 untouched.
    expect(next.faqs?.[1]).toEqual(m.faqs?.[1]);
  });

  it('never mutates the input manifest', () => {
    const m = baseManifest();
    const originalFirstQuestion = m.faqs![0].question;
    applyLocale(m, 'es');
    expect(m.faqs![0].question).toBe(originalFirstQuestion);
    expect(m.activeLocale).toBeUndefined();
  });

  it('returns the manifest unchanged for en / unknown locales', () => {
    const m = baseManifest();
    expect(applyLocale(m, 'en')).toBe(m);
    expect(applyLocale(m, 'fr')).toBe(m);
    expect(applyLocale(m, null)).toBe(m);
  });
});

describe('availableLocales', () => {
  it('lists the locales carried on the manifest', () => {
    expect(availableLocales(baseManifest())).toEqual(['es']);
    expect(availableLocales({} as StoryManifest)).toEqual([]);
  });
});
