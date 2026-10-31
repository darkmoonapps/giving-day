import { Box, Modal, Paper, Stack } from '@mantine/core';
import { AppButton, AppText, AppTitle } from '@giving-day/ui';
import { useReducedMotion } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { Fireworks } from './fireworks';

export type ThankYouReason = 'confirmed' | 'finished';

const COPY_KEYS: Record<
  ThankYouReason,
  {
    title: 'thanks_title' | 'finished_thanks_title';
    body: 'thanks_body' | 'finished_thanks_body';
  }
> = {
  confirmed: {
    title: 'thanks_title',
    body: 'thanks_body',
  },
  finished: {
    title: 'finished_thanks_title',
    body: 'finished_thanks_body',
  },
};

export function ThankYouScreen({
  reason,
  onDismiss,
}: {
  reason: ThankYouReason;
  onDismiss: () => void;
}): JSX.Element {
  const { t } = useTranslation('volunteer');
  const reduceMotion = useReducedMotion() === true;
  const copy = COPY_KEYS[reason];

  return (
    <Modal
      opened
      onClose={onDismiss}
      fullScreen
      withCloseButton={false}
      transitionProps={{ duration: reduceMotion ? 0 : 150 }}
      aria-labelledby="volunteer-thank-you-title"
      styles={{
        inner: { padding: 0 },
        content: {
          background: 'transparent',
          boxShadow: 'none',
        },
        header: { display: 'none' },
        overlay: { backgroundColor: 'rgba(30, 26, 46, 0.78)' },
        body: { height: '100%', padding: 0 },
      }}
    >
      <Box pos="relative" h="100%" mih="100dvh">
        <Fireworks reduceMotion={reduceMotion} />
        <Stack
          align="center"
          justify="center"
          h="100%"
          mih="100dvh"
          px="md"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <Paper
            p="xl"
            radius="lg"
            shadow="md"
            maw={420}
            w="100%"
            data-testid="fireworks-thank-you"
            data-thank-you-reason={reason}
          >
            <Stack gap="md" ta="center">
              <AppTitle order={2} id="volunteer-thank-you-title">
                {t(copy.title)}
              </AppTitle>
              <AppText>{t(copy.body)}</AppText>
              <AppButton onClick={onDismiss} data-testid="thank-you-continue">
                {t('thanks_continue')}
              </AppButton>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Modal>
  );
}
