import { Stack, Table } from '@mantine/core';
import {
  AppAlert,
  AppButton,
  AppText,
  AppTitle,
  LoadingState,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetDistributionDay,
  useListDayParticipations,
} from '../api/generated/api';
import {
  formatDayHours,
  formatDistributionDate,
  isUuid,
} from '../distribution-days/format-day';
import { useLanguage } from '../i18n/use-language';
import { AppChrome } from '../layout/app-chrome';

function volunteerName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
): string {
  const name = [firstName, lastName]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0
    )
    .join(' ');
  return name.length > 0 ? name : fallback;
}

export function CoordinatorDayResponsesPage(): JSX.Element {
  const { cityId, dayId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation('common');
  const validIds = isUuid(cityId) && isUuid(dayId);

  const dayQuery = useGetDistributionDay(cityId ?? '', dayId ?? '', {
    query: { enabled: validIds },
  });
  const responsesQuery = useListDayParticipations(cityId ?? '', dayId ?? '', {
    query: { enabled: validIds },
  });

  const day = dayQuery.data;
  const responses = responsesQuery.data?.responses ?? [];
  const loading =
    dayQuery.isLoading || responsesQuery.isLoading || day === undefined;
  const failed = dayQuery.isError || responsesQuery.isError || !validIds;

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
        data-testid="coordinator-responses-page"
      >
        {failed ? (
          <AppAlert color="red" title={tCommon('error.unexpected_title')}>
            {t('load_error')}
          </AppAlert>
        ) : loading ? (
          <LoadingState label={tCommon('loading')} />
        ) : (
          <>
            <div>
              <AppTitle order={1}>{t('responses_title')}</AppTitle>
              <AppText mt="xs">
                {formatDistributionDate(day.date, language)}
              </AppText>
              <AppText c="dimmed">
                {formatDayHours(day.startTime, day.endTime)}
              </AppText>
              <AppText c="dimmed" mt="sm">
                {t('responses_subtitle')}
              </AppText>
            </div>

            {responses.length === 0 ? (
              <AppText>{t('no_volunteers')}</AppText>
            ) : (
              <Table highlightOnHover data-testid="coordinator-responses-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('volunteer_column')}</Table.Th>
                    <Table.Th>{t('status_column')}</Table.Th>
                    <Table.Th>{t('reason_column')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {responses.map((row) => (
                    <Table.Tr
                      key={row.volunteerId}
                      data-testid={`response-row-${row.responseStatus}`}
                    >
                      <Table.Td>
                        {volunteerName(
                          row.firstName,
                          row.lastName,
                          t('unnamed_volunteer')
                        )}
                      </Table.Td>
                      <Table.Td>
                        {row.responseStatus === 'confirmed'
                          ? t('status_confirmed')
                          : row.responseStatus === 'declined'
                            ? t('status_declined')
                            : t('status_no_response')}
                      </Table.Td>
                      <Table.Td>
                        {row.responseStatus === 'declined' &&
                        row.cancelReason !== null &&
                        row.cancelReason.length > 0
                          ? row.cancelReason
                          : t('no_reason')}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </>
        )}
      </Stack>
    </AppChrome>
  );
}
