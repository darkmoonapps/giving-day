import type { TFunction } from 'i18next';

export const AUDIT_ACTION_LABEL_KEYS = {
  'delivery.assign': 'audit_action_delivery_assign',
  'delivery.unassign': 'audit_action_delivery_unassign',
  'distribution_day.publish': 'audit_action_distribution_day_publish',
  'distribution_day.update': 'audit_action_distribution_day_update',
  'match.create': 'audit_action_match_create',
  'match.end': 'audit_action_match_end',
  'membership.approve': 'audit_action_membership_approve',
  'membership.reject': 'audit_action_membership_reject',
  'message_template.upsert': 'audit_action_message_template_upsert',
  'message_template.reset': 'audit_action_message_template_reset',
} as const;

export const AUDIT_ENTITY_LABEL_KEYS = {
  delivery: 'audit_entity_delivery',
  distribution_day: 'audit_entity_distribution_day',
  match: 'audit_entity_match',
  membership: 'audit_entity_membership',
  message_template: 'audit_entity_message_template',
} as const;

type AuditActionLabelKey =
  (typeof AUDIT_ACTION_LABEL_KEYS)[keyof typeof AUDIT_ACTION_LABEL_KEYS];

type AuditEntityLabelKey =
  (typeof AUDIT_ENTITY_LABEL_KEYS)[keyof typeof AUDIT_ENTITY_LABEL_KEYS];

export function auditActionLabel(
  action: string,
  t: TFunction<'admin'>
): string {
  const key = AUDIT_ACTION_LABEL_KEYS[
    action as keyof typeof AUDIT_ACTION_LABEL_KEYS
  ] as AuditActionLabelKey | undefined;
  return key === undefined ? action : t(key);
}

export function auditEntityLabel(
  entity: string,
  t: TFunction<'admin'>
): string {
  const key = AUDIT_ENTITY_LABEL_KEYS[
    entity as keyof typeof AUDIT_ENTITY_LABEL_KEYS
  ] as AuditEntityLabelKey | undefined;
  return key === undefined ? entity : t(key);
}

export function formatAuditAt(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
