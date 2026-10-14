import { Stack } from '@mantine/core';
import {
  AppButton,
  AppHeader,
  AppPageShell,
  AppText,
  AppTitle,
} from '@giving-day/ui';
import { useTranslation } from 'react-i18next';

export interface UnexpectedErrorProps {
  onReset: () => void;
}

export function UnexpectedError({
  onReset,
}: UnexpectedErrorProps): JSX.Element {
  const { t } = useTranslation('common');

  return (
    <AppPageShell header={<AppHeader title={t('app_name')} />}>
      <Stack gap="md" component="section" data-testid="unexpected-error">
        <AppTitle order={1}>{t('error.unexpected_title')}</AppTitle>
        <AppText>{t('error.unexpected_body')}</AppText>
        <AppButton onClick={onReset}>{t('error.reload')}</AppButton>
      </Stack>
    </AppPageShell>
  );
}
