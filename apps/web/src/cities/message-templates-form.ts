import {
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
}

export type ParseMessageTemplateResult =
  | { success: true; data: UpsertMessageTemplate }
  | { success: false; errors: MessageTemplateFieldErrors };

const FORM_ERROR_KEYS = [
  'required',
  'title_too_long',
  'body_too_long',
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
  draft: MessageTemplateDraft
): ParseMessageTemplateResult {
  const parsed = upsertMessageTemplateSchema.safeParse(draft);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }

  const errors: MessageTemplateFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (field === 'title' || field === 'body') {
      errors[field] = issue.message;
    }
  }
  return { success: false, errors };
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
