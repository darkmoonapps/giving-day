import type { DeliveryElder } from '@giving-day/shared';
import { AppText } from '@giving-day/ui';
import { Stack } from '@mantine/core';
import { formatElderDetails, formatElderStreet } from './format-address';

export function ElderAddress({
  elder,
  labels,
}: {
  elder: DeliveryElder;
  labels: { entrance: string; floor: string; apartment: string };
}): JSX.Element {
  const details = formatElderDetails(elder, labels);

  return (
    <Stack gap={2}>
      <AppText>{formatElderStreet(elder)}</AppText>
      {details.length > 0 ? (
        <AppText c="dimmed" size="sm">
          {details}
        </AppText>
      ) : null}
    </Stack>
  );
}
