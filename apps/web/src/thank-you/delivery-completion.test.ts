import { describe, expect, it } from 'vitest';
import {
  areAllDeliveriesFinished,
  deliveriesJustFinished,
  isFinalDeliveryStatus,
} from './delivery-completion';

describe('isFinalDeliveryStatus', () => {
  it('treats delivered and not delivered as final', () => {
    expect(isFinalDeliveryStatus('delivered')).toBe(true);
    expect(isFinalDeliveryStatus('not_delivered')).toBe(true);
  });

  it('does not treat in-progress statuses as final', () => {
    expect(isFinalDeliveryStatus('assigned')).toBe(false);
    expect(isFinalDeliveryStatus('picked')).toBe(false);
    expect(isFinalDeliveryStatus('cancelled')).toBe(false);
  });
});

describe('areAllDeliveriesFinished', () => {
  it('is false when there are no assigned packages', () => {
    expect(areAllDeliveriesFinished([])).toBe(false);
  });

  it('is false when any assigned package is still open', () => {
    expect(
      areAllDeliveriesFinished([{ status: 'delivered' }, { status: 'picked' }])
    ).toBe(false);
    expect(
      areAllDeliveriesFinished([
        { status: 'not_delivered' },
        { status: 'assigned' },
      ])
    ).toBe(false);
  });

  it('is true when every assigned package has a final status', () => {
    expect(
      areAllDeliveriesFinished([
        { status: 'delivered' },
        { status: 'not_delivered' },
      ])
    ).toBe(true);
    expect(areAllDeliveriesFinished([{ status: 'delivered' }])).toBe(true);
  });
});

describe('deliveriesJustFinished', () => {
  it('is true only on the transition from unfinished to finished', () => {
    expect(deliveriesJustFinished(false, true)).toBe(true);
    expect(deliveriesJustFinished(null, true)).toBe(false);
    expect(deliveriesJustFinished(true, true)).toBe(false);
    expect(deliveriesJustFinished(false, false)).toBe(false);
  });
});
