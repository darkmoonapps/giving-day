import type { LanguageCode } from '@giving-day/shared';
import { getDirection } from '@giving-day/shared';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage } from './index';

export interface UseLanguageResult {
  language: LanguageCode;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: LanguageCode) => Promise<void>;
}

export function useLanguage(): UseLanguageResult {
  const { i18n } = useTranslation();
  const language = getCurrentLanguage();

  return {
    language,
    direction: getDirection(language),
    setLanguage: async (nextLanguage: LanguageCode): Promise<void> => {
      await i18n.changeLanguage(nextLanguage);
    },
  };
}
