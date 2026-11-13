import { Group, Stack, Table } from '@mantine/core';
import { getActiveCoordinatorCities } from '@giving-day/shared';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useListCityAuditLogs,
  type AuditLogEntryDto,
} from '../api/generated/api';
import { useSession } from '../auth/session-provider';
import { isUuid } from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

const PAGE_SIZE = 20;

const AUDIT_ACTION_LABEL_KEYS = {
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

const AUDIT_ENTITY_LABEL_KEYS = {
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

function formatAuditAt(iso: string, language: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function AuditRow({
  entry,
  language,
  actionLabel,
  entityLabel,
}: {
  entry: AuditLogEntryDto;
  language: string;
  actionLabel: string;
  entityLabel: string;
}): JSX.Element {
  return (
    <Table.Tr data-testid={`audit-log-row-${entry.id}`}>
      <Table.Td data-testid={`audit-log-at-${entry.id}`}>
        {formatAuditAt(entry.at, language)}
      </Table.Td>
      <Table.Td data-testid={`audit-log-action-${entry.id}`}>
        {actionLabel}
      </Table.Td>
      <Table.Td data-testid={`audit-log-entity-${entry.id}`}>
        {entityLabel}
      </Table.Td>
      <Table.Td>
        <AppText size="sm" ff="monospace">
          {entry.entityId}
        </AppText>
      </Table.Td>
      <Table.Td>
        <AppText size="sm" ff="monospace">
          {entry.actorId}
        </AppText>
      </Table.Td>
    </Table.Tr>
  );
}

export function CoordinatorAuditLogPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const [page, setPage] = useState(1);
  const validId = isUuid(cityId);
  const coordinatorCities =
    user === null ? [] : getActiveCoordinatorCities(user);
  const allowed = validId && coordinatorCities.includes(cityId ?? '');

  const auditQuery = useListCityAuditLogs(
    cityId ?? '',
    { page, pageSize: PAGE_SIZE },
    { query: { enabled: allowed } }
  );

  const data = auditQuery.data;
  const loading = auditQuery.isLoading || data === undefined;
  const failed = !allowed || auditQuery.isError || !validId;
  const totalPages =
    data === undefined || data.pageSize === 0
      ? 1
      : Math.max(1, Math.ceil(data.total / data.pageSize));

  const actionLabel = (action: string): string => {
    const key = AUDIT_ACTION_LABEL_KEYS[
      action as keyof typeof AUDIT_ACTION_LABEL_KEYS
    ] as AuditActionLabelKey | undefined;
    return key === undefined ? action : t(key);
  };

  const entityLabel = (entity: string): string => {
    const key = AUDIT_ENTITY_LABEL_KEYS[
      entity as keyof typeof AUDIT_ENTITY_LABEL_KEYS
    ] as AuditEntityLabelKey | undefined;
    return key === undefined ? entity : t(key);
  };

  return (
    <AppChrome
      actions={
        <AppButton
          size="xs"
          variant="light"
          onClick={() => {
            void navigate('/');
          }}
        >
          {tCommon('back')}
        </AppButton>
      }
    >
      <Stack
        gap="lg"
        component="section"
        data-testid="coordinator-audit-log-page"
      >
        {!allowed ? (
          <AppAlert
            color="red"
            title={t('audit_log_no_access_title')}
            data-testid="audit-log-no-access"
          >
            {t('audit_log_no_access')}
          </AppAlert>
        ) : failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('audit_log_load_error')}
          </AppAlert>
        ) : loading || data === undefined ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('audit_log_title')}</AppTitle>
              <AppText c="dimmed" mt="sm">
                {t('audit_log_subtitle')}
              </AppText>
            </div>

            {data.entries.length === 0 ? (
              <AppText c="dimmed" data-testid="audit-log-empty">
                {t('audit_log_empty')}
              </AppText>
            ) : (
              <Table striped highlightOnHover data-testid="audit-log-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('audit_log_column_at')}</Table.Th>
                    <Table.Th>{t('audit_log_column_action')}</Table.Th>
                    <Table.Th>{t('audit_log_column_entity')}</Table.Th>
                    <Table.Th>{t('audit_log_column_entity_id')}</Table.Th>
                    <Table.Th>{t('audit_log_column_actor_id')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.entries.map((entry) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      language={language}
                      actionLabel={actionLabel(entry.action)}
                      entityLabel={entityLabel(entry.entity)}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            )}

            <Group justify="space-between" data-testid="audit-log-pagination">
              <AppText size="sm" c="dimmed" data-testid="audit-log-page-label">
                {t('audit_log_page_label', {
                  page: data.page,
                  totalPages,
                  total: data.total,
                })}
              </AppText>
              <Group gap="sm">
                <AppButton
                  size="xs"
                  variant="light"
                  disabled={data.page <= 1}
                  data-testid="audit-log-prev"
                  onClick={() => {
                    setPage((current) => Math.max(1, current - 1));
                  }}
                >
                  {t('audit_log_previous')}
                </AppButton>
                <AppButton
                  size="xs"
                  variant="light"
                  disabled={data.page >= totalPages}
                  data-testid="audit-log-next"
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                >
                  {t('audit_log_next')}
                </AppButton>
              </Group>
            </Group>
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
