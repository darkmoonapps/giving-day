import { describe, expect, it } from 'vitest';
import { defaultCopyFor, renderTemplate } from './message-copy';

describe('message copy', () => {
  it('renders Hebrew and English day-invite fallbacks', () => {
    const he = defaultCopyFor('day_invite', 'he');
    const en = defaultCopyFor('day_invite', 'en');
    const vars = {
      date: '2026-11-15',
      startTime: '09:00:00',
      endTime: '14:00:00',
    };

    expect(renderTemplate(he.body, vars)).toContain('2026-11-15');
    expect(renderTemplate(en.body, vars)).toBe(
      'Can you deliver on 2026-11-15 from 09:00:00 to 14:00:00?'
    );
  });
});
