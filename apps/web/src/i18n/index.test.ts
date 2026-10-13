import { afterEach, describe, expect, it } from 'vitest';
import { applyDocumentLanguage, i18n } from './index';

describe('i18n document language', () => {
  afterEach(async () => {
    await i18n.changeLanguage('he');
    applyDocumentLanguage('he');
  });

  it('defaults to Hebrew RTL', () => {
    expect(i18n.language).toBe('he');
    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('switches the document to English LTR', async () => {
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(i18n.t('welcome_title')).toBe('Welcome to Giving Day');
  });

  it('persists the selected language for the next visit', async () => {
    await i18n.changeLanguage('en');
    expect(window.localStorage.getItem('i18nextLng')).toBe('en');
  });
});
