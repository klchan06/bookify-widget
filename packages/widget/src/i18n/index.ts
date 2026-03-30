import { nl, type TranslationKey } from './nl';
import { en } from './en';

const translations: Record<string, Record<TranslationKey, string>> = { nl, en };

export type Locale = 'nl' | 'en';

export function t(key: TranslationKey, locale: Locale = 'nl'): string {
  return translations[locale]?.[key] ?? translations.nl[key] ?? key;
}

export type { TranslationKey };
