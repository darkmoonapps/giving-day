import type { Resource } from 'i18next';
import enAdmin from './locales/en/admin.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enValidation from './locales/en/validation.json';
import enVolunteer from './locales/en/volunteer.json';
import heAdmin from './locales/he/admin.json';
import heAuth from './locales/he/auth.json';
import heCommon from './locales/he/common.json';
import heValidation from './locales/he/validation.json';
import heVolunteer from './locales/he/volunteer.json';

export const defaultNS = 'common' as const;

export const i18nResources = {
  he: {
    common: heCommon,
    volunteer: heVolunteer,
    admin: heAdmin,
    auth: heAuth,
    validation: heValidation,
  },
  en: {
    common: enCommon,
    volunteer: enVolunteer,
    admin: enAdmin,
    auth: enAuth,
    validation: enValidation,
  },
} as const satisfies Resource;
