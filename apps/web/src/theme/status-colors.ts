import { SEMANTIC_COLORS } from '@giving-day/ui';
import type { DeliveryStatus } from '@giving-day/shared';

export function volunteerDeliveryStatusColor(
  status: Extract<
    DeliveryStatus,
    'assigned' | 'picked' | 'delivered' | 'not_delivered'
  >
): string {
  if (status === 'delivered') {
    return SEMANTIC_COLORS.delivered;
  }
  if (status === 'not_delivered') {
    return 'red';
  }
  if (status === 'picked') {
    return 'blue';
  }
  return 'gray';
}
