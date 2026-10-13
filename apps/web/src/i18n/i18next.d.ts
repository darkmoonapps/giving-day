import { defaultNS, i18nResources } from './resources';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof i18nResources)['he'];
  }
}
