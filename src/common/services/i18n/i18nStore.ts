import { createStore } from '../state';
import {
  detectLocale,
  isLocale,
  LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  type Locale,
} from './locales';
import { en, type Messages } from './messages/en';
import { ptBR } from './messages/ptBR';

const CATALOGS: Record<Locale, Messages> = { 'en-US': en, 'pt-BR': ptBR };

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // Storage blocked: fall back to the browser's language.
  }
  return detectLocale(navigator.languages ?? [navigator.language]);
}

/** Mirror the language onto <html lang>, for screen readers, hyphenation and spellcheck. */
function applyLocale(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

type I18nState = {
  locale: Locale;
  /** Switch the interface language and remember it on this device. */
  setLocale: (locale: Locale) => void;
};

export const useI18nStore = createStore<I18nState>()((set) => {
  const initial = readStoredLocale();
  applyLocale(initial);
  return {
    locale: initial,
    setLocale: (locale) => {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // Not remembered on this device; the profile still has it when signed in.
      }
      applyLocale(locale);
      set({ locale });
    },
  };
});

/** The active language's strings; re-renders when the language changes. */
export function useT(): Messages {
  return CATALOGS[useI18nStore((state) => state.locale)];
}

export function useLocale(): Locale {
  return useI18nStore((state) => state.locale);
}

/** The strings outside React: stores, notifications, generated text. */
export function getT(): Messages {
  return CATALOGS[useI18nStore.getState().locale];
}

export function getLocale(): Locale {
  return useI18nStore.getState().locale;
}

export function messagesFor(locale: Locale): Messages {
  return CATALOGS[locale];
}
