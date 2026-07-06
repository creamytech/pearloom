// ─────────────────────────────────────────────────────────────
// Pearloom / lib/i18n/locales.ts
//
// Display LABELS for the locales Pearloom translates into. This is
// presentation only — locale RESOLUTION lives in apply-locale.ts
// (applyLocale / availableLocales). The guest switcher reads native
// names; the host's "offer in another language" picker reads the
// English names.
//
// The set below mirrors the languages the /api/translate route can
// name (LOCALE_NAMES there); keep the two in sync if you add one.
// ─────────────────────────────────────────────────────────────

export interface LocaleInfo {
  /** BCP-47-ish short code stored on manifest.translations[code]. */
  code: string;
  /** English name — shown in the host editor picker. */
  english: string;
  /** Endonym — shown to guests in the on-site switcher. */
  native: string;
}

/** The languages the host can offer their site in, in menu order. */
export const TRANSLATABLE_LOCALES: LocaleInfo[] = [
  { code: 'es', english: 'Spanish',    native: 'Español' },
  { code: 'fr', english: 'French',     native: 'Français' },
  { code: 'de', english: 'German',     native: 'Deutsch' },
  { code: 'pt', english: 'Portuguese', native: 'Português' },
  { code: 'it', english: 'Italian',    native: 'Italiano' },
  { code: 'zh', english: 'Mandarin',   native: '中文' },
];

const NATIVE_NAMES: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  he: 'עברית',
  ar: 'العربية',
  ...Object.fromEntries(TRANSLATABLE_LOCALES.map((l) => [l.code, l.native])),
};

const ENGLISH_NAMES: Record<string, string> = {
  en: 'English',
  ja: 'Japanese',
  he: 'Hebrew',
  ar: 'Arabic',
  ...Object.fromEntries(TRANSLATABLE_LOCALES.map((l) => [l.code, l.english])),
};

/** Endonym for a locale code (falls back to the upper-cased code). */
export function localeNativeName(code: string): string {
  return NATIVE_NAMES[code] ?? code.toUpperCase();
}

/** English name for a locale code (falls back to the upper-cased code). */
export function localeEnglishName(code: string): string {
  return ENGLISH_NAMES[code] ?? code.toUpperCase();
}
