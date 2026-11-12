import { describe, expect, it } from 'vitest';
import {
  TEMPLATE_KEYS,
  defaultMessageCopyFor,
  extractPlaceholders,
  findUnknownPlaceholders,
  placeholdersFor,
  renderMessageTemplate,
  upsertMessageTemplateSchema,
} from './message-templates';

describe('message template defaults', () => {
  it('provides Hebrew and English copy for every template key', () => {
    for (const key of TEMPLATE_KEYS) {
      const he = defaultMessageCopyFor(key, 'he');
      const en = defaultMessageCopyFor(key, 'en');
      expect(he.title.length).toBeGreaterThan(0);
      expect(he.body.length).toBeGreaterThan(0);
      expect(en.title.length).toBeGreaterThan(0);
      expect(en.body.length).toBeGreaterThan(0);
      expect(placeholdersFor(key).length).toBeGreaterThan(0);
    }
  });

  it('renders day invite placeholders', () => {
    const en = defaultMessageCopyFor('day_invite', 'en');
    expect(
      renderMessageTemplate(en.body, {
        date: '2026-11-15',
        startTime: '09:00:00',
        endTime: '14:00:00',
      })
    ).toBe('Can you deliver on 2026-11-15 from 09:00:00 to 14:00:00?');
  });

  it('rejects empty upsert payloads', () => {
    expect(
      upsertMessageTemplateSchema.safeParse({ title: '', body: 'x' }).success
    ).toBe(false);
    expect(
      upsertMessageTemplateSchema.safeParse({
        title: 'Title',
        body: 'Body with {{date}}',
      }).success
    ).toBe(true);
  });

  it('rejects whitespace-only upsert payloads after trim', () => {
    expect(
      upsertMessageTemplateSchema.safeParse({
        title: '   ',
        body: 'body',
      }).success
    ).toBe(false);
    expect(
      upsertMessageTemplateSchema.safeParse({
        title: 'Title',
        body: '   ',
      }).success
    ).toBe(false);
  });

  it('extracts unique placeholders from text', () => {
    expect(
      extractPlaceholders('Hello {{date}} and {{date}} then {{startTime}}')
    ).toEqual(['date', 'startTime']);
  });

  it('finds unknown placeholders for a template key', () => {
    expect(
      findUnknownPlaceholders('ok {{date}} {{startTime}}', 'day_invite')
    ).toEqual([]);
    expect(
      findUnknownPlaceholders('broken {{dat}} and {{elderName}}', 'day_invite')
    ).toEqual(['dat', 'elderName']);
    expect(
      findUnknownPlaceholders('{{elderName}} on {{date}}', 'reassigned')
    ).toEqual([]);
  });
});
