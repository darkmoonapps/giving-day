import {
  getDirection,
  parseLanguageCode,
  type LanguageCode,
} from '@giving-day/shared';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { defaultNS, i18nResources } from './resources';

export const DEFAULT_LANGUAGE: LanguageCode = 'he';
export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['he', 'en'];

export function applyDocumentLanguage(language: LanguageCode): void {
  const direction = getDirection(language);
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  document.title = i18n.t('document_title', { lng: language });
}

export function getCurrentLanguage(): LanguageCode {
  return parseLanguageCode(
    i18n.resolvedLanguage ?? i18n.language,
    DEFAULT_LANGUAGE
  );
}

export async function initI18n(): Promise<typeof i18n> {
  if (!i18n.isInitialized) {
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: i18nResources,
        fallbackLng: DEFAULT_LANGUAGE,
        // Omit `lng` so LanguageDetector can restore a saved localStorage value.
        supportedLngs: [...SUPPORTED_LANGUAGES],
        defaultNS,
        ns: ['common', 'volunteer', 'admin', 'auth', 'validation'],
        interpolation: {
          escapeValue: false,
        },
        detection: {
          order: ['localStorage'],
          caches: ['localStorage'],
          lookupLocalStorage: 'i18nextLng',
        },
        react: {
          useSuspense: false,
        },
      });

    i18n.on('languageChanged', (language: string) => {
      applyDocumentLanguage(parseLanguageCode(language, DEFAULT_LANGUAGE));
    });
  }

  applyDocumentLanguage(getCurrentLanguage());
  return i18n;
}

export { i18n };
