import { Icon, Select, type SelectOption } from '../common/components';
import { LOCALES, useLocale, useT, type Locale } from '../common/services/i18n';
import { useMeetingStore } from '../features/meeting/store';
import styles from './LanguageSelect.module.css';

const OPTIONS: ReadonlyArray<SelectOption<Locale>> = LOCALES.map((locale) => ({
  value: locale.value,
  label: locale.label,
}));

const SHORT: Record<Locale, string> = Object.fromEntries(
  LOCALES.map((locale) => [locale.value, locale.short]),
) as Record<Locale, string>;

/**
 * Interface language: "EN" / "PT" with a globe when closed, the native names
 * in the list. Signed out it's remembered on this device; signed in it's
 * saved to the profile too (chooseLocale).
 */
export function LanguageSelect({
  className,
  onChange,
}: {
  className?: string;
  /** Replaces the default switch, e.g. to also move to /pt or /en. */
  onChange?: (locale: Locale) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const chooseLocale = useMeetingStore((state) => state.chooseLocale);

  return (
    <Select<Locale>
      value={locale}
      options={OPTIONS}
      onChange={(value) => (onChange ? onChange(value) : void chooseLocale(value))}
      label={t.language.label}
      className={className}
      renderValue={(option) => (
        <span className={styles.value} lang={option.value}>
          <Icon name="globe" size={16} />
          {SHORT[option.value]}
        </span>
      )}
    />
  );
}
