export type Locale = 'en-US' | 'pt-BR';

export const LOCALES: ReadonlyArray<{ value: Locale; label: string; short: string }> = [
  { value: 'en-US', label: 'English', short: 'EN' },
  { value: 'pt-BR', label: 'Português', short: 'PT' },
];

export const DEFAULT_LOCALE: Locale = 'en-US';

/** Where a signed-out visitor's choice lives. Also read by index.html's boot script. */
export const LOCALE_STORAGE_KEY = 'tw-locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'en-US' || value === 'pt-BR';
}

/** First visit: Portuguese for any pt-* browser language, English otherwise. */
export function detectLocale(languages: readonly string[]): Locale {
  return languages.some((language) => language.toLowerCase().startsWith('pt'))
    ? 'pt-BR'
    : DEFAULT_LOCALE;
}
