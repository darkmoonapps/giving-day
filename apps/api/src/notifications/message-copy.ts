import {
  defaultMessageCopyFor,
  renderMessageTemplate,
  type Locale,
  type MessageCopy,
  type TemplateKey,
} from '@giving-day/shared';

export type { MessageCopy };

export function defaultCopyFor(
  templateKey: TemplateKey,
  locale: Locale
): MessageCopy {
  return defaultMessageCopyFor(templateKey, locale);
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return renderMessageTemplate(template, vars);
}
