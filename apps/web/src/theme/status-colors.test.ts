import { describe, expect, it } from 'vitest';
import { SEMANTIC_COLORS } from '@giving-day/ui';
import { volunteerDeliveryStatusColor } from './status-colors';

describe('volunteerDeliveryStatusColor', () => {
  it('uses mint for Delivered and red for Not delivered', () => {
    expect(volunteerDeliveryStatusColor('delivered')).toBe(
      SEMANTIC_COLORS.delivered
    );
    expect(volunteerDeliveryStatusColor('delivered')).toBe('mint');
    expect(volunteerDeliveryStatusColor('not_delivered')).toBe('red');
    expect(volunteerDeliveryStatusColor('picked')).toBe('blue');
    expect(volunteerDeliveryStatusColor('assigned')).toBe('gray');
  });
});
