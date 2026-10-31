import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { VolunteerDelivery } from '@giving-day/shared';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { VolunteerDeliveriesList } from './volunteer-deliveries-list';

const delivery: VolunteerDelivery = {
  id: '16161616-1616-4161-8161-161616161616',
  cityId: '11111111-1111-4111-8111-111111111111',
  dayId: '33333333-3333-4333-8333-333333333333',
  status: 'picked',
  note: null,
  notDeliveredReason: null,
  elder: {
    id: '12121212-1212-4121-8121-121212121212',
    fullName: 'Rivkah Levi',
    street: '12 Example St',
    houseNumber: '12',
    entrance: 'B',
    floor: '3',
    apartment: '7',
    addressNotes: 'Knock loudly',
    notes: 'Entrance is around the back',
    contacts: [
      {
        name: 'Tamar Levi',
        relation: 'child',
        phone: '+972506666666',
        isPrimary: true,
      },
    ],
  },
};

describe('VolunteerDeliveriesList', () => {
  afterEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('requires a note and reason before submitting not delivered', async () => {
    const onUpdateStatus = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <VolunteerDeliveriesList
        deliveries={[delivery]}
        pending={false}
        error={false}
        onUpdateStatus={onUpdateStatus}
      />
    );

    await user.click(screen.getByTestId('mark-not-delivered'));
    await user.click(await screen.findByTestId('submit-not-delivered'));
    expect(onUpdateStatus).not.toHaveBeenCalled();

    await user.selectOptions(
      screen.getByTestId('not-delivered-reason'),
      'not_home'
    );
    await user.type(
      screen.getByTestId('not-delivered-note'),
      'Elder was not home in Holon'
    );
    await user.click(screen.getByTestId('submit-not-delivered'));

    expect(onUpdateStatus).toHaveBeenCalledWith(delivery.id, {
      status: 'not_delivered',
      note: 'Elder was not home in Holon',
      notDeliveredReason: 'not_home',
    });
  });

  it('shows a pending badge and a suggest-correction action', async () => {
    const onSuggestCorrection = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <VolunteerDeliveriesList
        deliveries={[delivery]}
        pending={false}
        error={false}
        pendingElderIds={new Set([delivery.elder.id])}
        onSuggestCorrection={onSuggestCorrection}
        onUpdateStatus={vi.fn()}
      />
    );

    expect(screen.getByTestId('change-request-pending')).toBeInTheDocument();
    await user.click(screen.getByTestId('suggest-correction'));
    expect(onSuggestCorrection).toHaveBeenCalledWith(delivery.elder.id);
  });
});
