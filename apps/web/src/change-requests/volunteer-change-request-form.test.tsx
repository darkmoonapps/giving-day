import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DeliveryElder } from '@giving-day/shared';
import { i18n } from '../i18n';
import { renderWithProviders } from '../test/render';
import { VolunteerChangeRequestForm } from './volunteer-change-request-form';

const rivkah: DeliveryElder = {
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
};

describe('VolunteerChangeRequestForm', () => {
  afterEach(async () => {
    await i18n.changeLanguage('he');
  });

  it('requires a changed field before submitting', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <VolunteerChangeRequestForm
        elder={rivkah}
        submitting={false}
        error={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByTestId('change-request-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      await screen.findByTestId('change-request-empty')
    ).toBeInTheDocument();
  });

  it('submits a Holon address correction', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <VolunteerChangeRequestForm
        elder={rivkah}
        submitting={false}
        error={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    await user.clear(screen.getByTestId('change-request-street'));
    await user.type(
      screen.getByTestId('change-request-street'),
      '18 Weizmann St'
    );
    await user.type(
      screen.getByTestId('change-request-reason'),
      'Moved within Holon'
    );
    await user.click(screen.getByTestId('change-request-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      elderId: rivkah.id,
      changes: { street: '18 Weizmann St' },
      reason: 'Moved within Holon',
    });
  });
});
