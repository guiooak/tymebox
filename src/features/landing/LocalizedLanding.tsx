import { useLayoutEffect } from 'react';
import { useI18nStore, type Locale } from '../../common/services/i18n';
import { Landing } from './Landing';

/**
 * The landing at /pt or /en. On these public URLs the URL decides the
 * language (and remembers it on this device), so a shared /pt link always
 * opens in Portuguese. Set before paint, so the other language never flashes.
 */
export function LocalizedLanding({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    if (useI18nStore.getState().locale !== locale) {
      useI18nStore.getState().setLocale(locale);
    }
  }, [locale]);
  return <Landing localized />;
}
