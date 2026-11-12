import { describe, expect, it } from 'vitest';
import {
  TEMPLATE_KEYS,
  defaultMessageCopyFor,
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
});
