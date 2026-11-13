import { z } from 'zod';
import { localeSchema } from './city';
import { templateKeySchema, type TemplateKey } from './notifications';

export const TEMPLATE_KEYS = templateKeySchema.options;

export const MESSAGE_TEMPLATE_PLACEHOLDERS = {
  day_invite: ['date', 'startTime', 'endTime'],
  confirm_reminder: ['date', 'startTime', 'endTime'],
  unpicked_warning: ['date', 'endTime'],
  final_status_reminder: ['date', 'count'],
  reassigned: ['date', 'elderName'],
  change_request_reviewed: ['status'],
  membership_approved: ['cityName'],
} as const satisfies Record<TemplateKey, readonly string[]>;

export type MessageTemplatePlaceholder =
  (typeof MESSAGE_TEMPLATE_PLACEHOLDERS)[TemplateKey][number];

export interface MessageCopy {
  title: string;
  body: string;
}

const DAY_INVITE_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'יום חלוקה',
    body: 'האם תוכל/י לחלק ב-{{date}} בין {{startTime}} ל-{{endTime}}?',
  },
  en: {
    title: 'Distribution day',
    body: 'Can you deliver on {{date}} from {{startTime}} to {{endTime}}?',
  },
};

const CONFIRM_REMINDER_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'תזכורת לאישור',
    body: 'עדיין לא עניתם על יום החלוקה ב-{{date}} ({{startTime}}–{{endTime}}). אנא אשרו או דחו.',
  },
  en: {
    title: 'Confirmation reminder',
    body: 'You have not responded for {{date}} ({{startTime}}–{{endTime}}). Please confirm or decline.',
  },
};

const UNPICKED_WARNING_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'חבילה שלא נאספה',
    body: 'עדיין לא סומנה חבילה כנאספה ליום {{date}}. החלון נסגר ב-{{endTime}}.',
  },
  en: {
    title: 'Unpicked package',
    body: 'A package for {{date}} is still not marked picked. The window ends at {{endTime}}.',
  },
};

const FINAL_STATUS_REMINDER_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'סטטוס סופי חסר',
    body: 'נאספה חבילה ב-{{date}} אך עדיין אין סטטוס נמסר או לא נמסר. אנא עדכנו.',
  },
  en: {
    title: 'Missing final status',
    body: 'A package was picked on {{date}} but still has no Delivered or Not delivered status. Please update.',
  },
};

const REASSIGNED_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'שיוך חדש',
    body: 'שובצתם למסירה עבור {{elderName}} ביום {{date}}.',
  },
  en: {
    title: 'New assignment',
    body: 'You were assigned a delivery for {{elderName}} on {{date}}.',
  },
};

const CHANGE_REQUEST_REVIEWED_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'בקשת שינוי נבדקה',
    body: 'בקשת השינוי שלכם נבדקה. הסטטוס: {{status}}.',
  },
  en: {
    title: 'Change request reviewed',
    body: 'Your change request was reviewed. Status: {{status}}.',
  },
};

const MEMBERSHIP_APPROVED_COPY: Record<'he' | 'en', MessageCopy> = {
  he: {
    title: 'אושרתם להצטרף',
    body: 'הצטרפותכם ל-{{cityName}} אושרה. אפשר להתחיל.',
  },
  en: {
    title: 'Membership approved',
    body: 'Your membership in {{cityName}} was approved. You can get started.',
  },
};

const DEFAULT_COPY_BY_KEY: Record<
  TemplateKey,
  Record<'he' | 'en', MessageCopy>
> = {
  day_invite: DAY_INVITE_COPY,
  confirm_reminder: CONFIRM_REMINDER_COPY,
  unpicked_warning: UNPICKED_WARNING_COPY,
  final_status_reminder: FINAL_STATUS_REMINDER_COPY,
  reassigned: REASSIGNED_COPY,
  change_request_reviewed: CHANGE_REQUEST_REVIEWED_COPY,
  membership_approved: MEMBERSHIP_APPROVED_COPY,
};

export function defaultMessageCopyFor(
  templateKey: TemplateKey,
  locale: 'he' | 'en'
): MessageCopy {
  return DEFAULT_COPY_BY_KEY[templateKey][locale];
}

export function placeholdersFor(templateKey: TemplateKey): readonly string[] {
  return MESSAGE_TEMPLATE_PLACEHOLDERS[templateKey];
}

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

export function extractPlaceholders(text: string): readonly string[] {
  const found: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const token = match[1];
    if (token !== undefined && !found.includes(token)) {
      found.push(token);
    }
  }
  return found;
}

export function findUnknownPlaceholders(
  text: string,
  templateKey: TemplateKey
): readonly string[] {
  const allowed = new Set<string>(placeholdersFor(templateKey));
  return extractPlaceholders(text).filter((token) => !allowed.has(token));
}

export function renderMessageTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });
}

export const messageTemplateSchema = z.object({
  id: z.string().uuid().nullable(),
  key: templateKeySchema,
  locale: localeSchema,
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  defaultTitle: z.string().min(1).max(200),
  defaultBody: z.string().min(1).max(2000),
  isCustom: z.boolean(),
  placeholders: z.array(z.string().min(1)).min(1),
});

export const messageTemplatesResponseSchema = z.object({
  templates: z.array(messageTemplateSchema),
});

export const upsertMessageTemplateSchema = z.object({
  title: z.string().trim().min(1, 'required').max(200, 'title_too_long'),
  body: z.string().trim().min(1, 'required').max(2000, 'body_too_long'),
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
export type MessageTemplatesResponse = z.infer<
  typeof messageTemplatesResponseSchema
>;
export type UpsertMessageTemplate = z.infer<typeof upsertMessageTemplateSchema>;
