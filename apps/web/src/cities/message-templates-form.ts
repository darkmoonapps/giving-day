import {
  findUnknownPlaceholders,
  upsertMessageTemplateSchema,
  type TemplateKey,
  type UpsertMessageTemplate,
} from '@giving-day/shared';

export interface MessageTemplateDraft {
  title: string;
  body: string;
}

export interface MessageTemplateFieldErrors {
  title?: string;
  body?: string;
  titleToken?: string;
  bodyToken?: string;
}

export type ParseMessageTemplateResult =
  | { success: true; data: UpsertMessageTemplate }
  | { success: false; errors: MessageTemplateFieldErrors };

const FORM_ERROR_KEYS = [
  'required',
  'title_too_long',
  'body_too_long',
  'unknown_placeholder',
] as const;

export type MessageTemplateValidationKey = (typeof FORM_ERROR_KEYS)[number];

export function isMessageTemplateValidationKey(
  value: string
): value is MessageTemplateValidationKey {
  return (FORM_ERROR_KEYS as readonly string[]).includes(value);
}

export function draftFromTemplate(template: {
  title: string;
  body: string;
}): MessageTemplateDraft {
  return {
    title: template.title,
    body: template.body,
  };
}

export function parseMessageTemplateDraft(
  draft: MessageTemplateDraft,
  templateKey: TemplateKey
): ParseMessageTemplateResult {
  const parsed = upsertMessageTemplateSchema.safeParse(draft);
  if (!parsed.success) {
    const errors: MessageTemplateFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (field === 'title' || field === 'body') {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  const unknownTitle = findUnknownPlaceholders(parsed.data.title, templateKey);
  if (unknownTitle[0] !== undefined) {
    return {
      success: false,
      errors: {
        title: 'unknown_placeholder',
        titleToken: unknownTitle[0],
      },
    };
  }

  const unknownBody = findUnknownPlaceholders(parsed.data.body, templateKey);
  if (unknownBody[0] !== undefined) {
    return {
      success: false,
      errors: {
        body: 'unknown_placeholder',
        bodyToken: unknownBody[0],
      },
    };
  }

  return { success: true, data: parsed.data };
}

export const TEMPLATE_LABEL_KEYS = {
  day_invite: 'template_key_day_invite',
  confirm_reminder: 'template_key_confirm_reminder',
  unpicked_warning: 'template_key_unpicked_warning',
  final_status_reminder: 'template_key_final_status_reminder',
  reassigned: 'template_key_reassigned',
  change_request_reviewed: 'template_key_change_request_reviewed',
  membership_approved: 'template_key_membership_approved',
} as const satisfies Record<TemplateKey, string>;

export function templateLabelKey(
  key: TemplateKey
): (typeof TEMPLATE_LABEL_KEYS)[TemplateKey] {
  return TEMPLATE_LABEL_KEYS[key];
}

export function draftsEqual(
  left: MessageTemplateDraft,
  right: MessageTemplateDraft
): boolean {
  return left.title === right.title && left.body === right.body;
}

export function filterTemplatesByLocale<T extends { locale: 'he' | 'en' }>(
  templates: T[],
  locale: 'he' | 'en'
): T[] {
  return templates.filter((template) => template.locale === locale);
}
