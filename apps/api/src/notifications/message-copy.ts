import type { Locale, TemplateKey } from '@giving-day/shared';

export interface MessageCopy {
  title: string;
  body: string;
}

const DAY_INVITE_COPY: Record<Locale, MessageCopy> = {
  he: {
    title: 'יום חלוקה',
    body: 'האם תוכל/י לחלק ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  },
  en: {
    title: 'Distribution day',
    body: 'Can you deliver on {{date}} from {{startTime}} to {{endTime}}?',
  },
};

export function defaultCopyFor(
  templateKey: TemplateKey,
  locale: Locale
): MessageCopy {
  if (templateKey === 'day_invite') {
    return DAY_INVITE_COPY[locale];
  }

  return DAY_INVITE_COPY[locale];
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });
}
