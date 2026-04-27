// ─────────────────────────────────────────────────────────────
// Pearloom / lib/i18n/apply-locale.ts
//
// Server- and client-safe: takes a manifest + a target locale and
// returns a new manifest with translated copy applied. If the
// translations object doesn't carry that locale, returns the
// original manifest unchanged.
//
// This is the replacement for the old runtime DOM-walk translate
// hack — translations live on the manifest now, so server-rendered
// HTML ships in the right language and SEO works.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

export function applyLocale(manifest: StoryManifest, locale?: string | null): StoryManifest {
  if (!locale || locale === 'en') return manifest;
  const tr = manifest.translations?.[locale];
  if (!tr) return manifest;
  // Build per-id lookups so we don't depend on chapter index alignment.
  const chById = new Map<string, { title?: string; subtitle?: string; description?: string }>();
  const chByIdx = new Map<number, { title?: string; subtitle?: string; description?: string }>();
  (tr.chapters ?? []).forEach((c, i) => {
    if (c.id) chById.set(c.id, c);
    chByIdx.set(i, c);
  });

  const next: StoryManifest = {
    ...manifest,
    chapters: (manifest.chapters ?? []).map((c, i) => {
      const t = (c.id && chById.get(c.id)) || chByIdx.get(i);
      if (!t) return c;
      return {
        ...c,
        title: t.title ?? c.title,
        subtitle: t.subtitle ?? c.subtitle,
        description: t.description ?? c.description,
      };
    }),
    activeLocale: locale,
  };

  // Poetry
  const poetryRaw = (manifest as unknown as { poetry?: Record<string, string> }).poetry;
  if (poetryRaw && tr.poetry) {
    (next as unknown as { poetry: Record<string, string> }).poetry = {
      ...poetryRaw,
      ...tr.poetry,
    };
  }

  // FAQ
  const faq = (manifest as unknown as { faq?: Array<{ id?: string; question?: string; answer?: string }> }).faq;
  if (Array.isArray(faq) && tr.faq?.length) {
    const faqMap = new Map<string, { question?: string; answer?: string }>();
    tr.faq.forEach((f, i) => { if (f.id) faqMap.set(f.id, f); else faqMap.set(`__idx_${i}`, f); });
    (next as unknown as { faq: typeof faq }).faq = faq.map((f, i) => {
      const t = (f.id && faqMap.get(f.id)) || faqMap.get(`__idx_${i}`);
      if (!t) return f;
      return { ...f, question: t.question ?? f.question, answer: t.answer ?? f.answer };
    });
  }

  // Events
  if (manifest.events && tr.events?.length) {
    const evMap = new Map<string, { name?: string; description?: string }>();
    tr.events.forEach((e, i) => { if (e.id) evMap.set(e.id, e); else evMap.set(`__idx_${i}`, e); });
    next.events = manifest.events.map((e, i) => {
      const t = (e.id && evMap.get(e.id)) || evMap.get(`__idx_${i}`);
      if (!t) return e;
      return { ...e, name: t.name ?? e.name, description: t.description ?? e.description };
    });
  }

  return next;
}

/** List of locales for which the manifest has full translations. */
export function availableLocales(manifest: StoryManifest): string[] {
  return Object.keys(manifest.translations ?? {});
}
