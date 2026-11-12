import { describe, expect, it } from 'vitest';
import {
  defaultMessageCopyFor,
  type MessageTemplate,
} from '@giving-day/shared';
import {
  draftFromTemplate,
  filterTemplatesByLocale,
  parseMessageTemplateDraft,
  templateLabelKey,
} from './message-templates-form';

const holonDayInviteHe: MessageTemplate = {
  id: null,
  key: 'day_invite',
  locale: 'he',
  title: defaultMessageCopyFor('day_invite', 'he').title,
  body: defaultMessageCopyFor('day_invite', 'he').body,
  defaultTitle: defaultMessageCopyFor('day_invite', 'he').title,
  defaultBody: defaultMessageCopyFor('day_invite', 'he').body,
  isCustom: false,
  placeholders: ['date', 'startTime', 'endTime'],
};

describe('message-templates-form', () => {
  it('maps a template into editable draft fields', () => {
    expect(draftFromTemplate(holonDayInviteHe)).toEqual({
      title: holonDayInviteHe.title,
      body: holonDayInviteHe.body,
    });
  });

  it('accepts Holon custom copy and rejects empty title', () => {
    expect(
      parseMessageTemplateDraft(
        {
          title: 'יום חלוקה בחולון',
          body: 'חולון ב-{{date}}',
        },
        'day_invite'
      )
    ).toEqual({
      success: true,
      data: {
        title: 'יום חלוקה בחולון',
        body: 'חולון ב-{{date}}',
      },
    });

    const empty = parseMessageTemplateDraft(
      { title: '', body: 'body' },
      'day_invite'
    );
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.errors.title).toBe('required');
    }
  });

  it('rejects unknown placeholders with the bad token', () => {
    const result = parseMessageTemplateDraft(
      {
        title: 'יום חלוקה',
        body: 'Broken {{dat}} then {{startTime}}',
      },
      'day_invite'
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.body).toBe('unknown_placeholder');
      expect(result.errors.bodyToken).toBe('dat');
    }
  });

  it('filters by locale and builds label keys', () => {
    const en: MessageTemplate = {
      ...holonDayInviteHe,
      locale: 'en',
      title: defaultMessageCopyFor('day_invite', 'en').title,
      body: defaultMessageCopyFor('day_invite', 'en').body,
      defaultTitle: defaultMessageCopyFor('day_invite', 'en').title,
      defaultBody: defaultMessageCopyFor('day_invite', 'en').body,
    };
    expect(filterTemplatesByLocale([holonDayInviteHe, en], 'he')).toEqual([
      holonDayInviteHe,
    ]);
    expect(templateLabelKey('day_invite')).toBe('template_key_day_invite');
  });
});
