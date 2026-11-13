import { Group, Stack } from '@mantine/core';
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
import { useListCityAuditLogs } from '../api/generated/api';
import { CoordinatorAuditLogTable } from '../audit-logs/coordinator-audit-log-table';
import { useSession } from '../auth/session-provider';
import { isUuid } from '../distribution-days/format-day';
import { AppChrome } from '../layout/app-chrome';

const PAGE_SIZE = 20;

export function CoordinatorAuditLogPage(): JSX.Element {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
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
              <CoordinatorAuditLogTable entries={data.entries} />
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
