import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  DAY_ID,
  coordinatorDeliveryRivkah,
  coordinatorDeliveryUnassigned,
  coordinatorUser,
  createDayFetchMock,
  openDay,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

describe('DayDeliveriesPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  describe('volunteer', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          createDayFetchMock({
            refresh: 'ok',
            user: volunteerUser(),
            day: {
              ...openDay,
              myParticipation: {
                id: '44444444-4444-4444-8444-444444444444',
                cityId: CITY_A_ID,
                dayId: DAY_ID,
                volunteerId: volunteerUser().id,
                status: 'confirmed',
                respondedAt: '2026-10-29T10:00:00.000Z',
                cancelReason: null,
              },
            },
          })
        )
      );
    });

    it('shows assigned elders after the volunteer has confirmed', async () => {
      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(
        await screen.findByTestId('volunteer-deliveries-page')
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId('volunteer-deliveries-list')
      ).toBeInTheDocument();
      expect(screen.getByText('Rivkah Levi')).toBeInTheDocument();
      expect(screen.getByText('12 Example St 12')).toBeInTheDocument();
      expect(screen.queryByTestId('assign-delivery')).not.toBeInTheDocument();
    });

    it('asks the volunteer to confirm before showing elders', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          createDayFetchMock({
            refresh: 'ok',
            user: volunteerUser(),
            volunteerDeliveries: [],
          })
        )
      );

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(await screen.findByTestId('confirm-first')).toBeInTheDocument();
      expect(screen.queryByText('Rivkah Levi')).not.toBeInTheDocument();
    });
  });

  describe('coordinator', () => {
    it('lists assigned and unassigned deliveries and lets the coordinator reassign', async () => {
      const fetchMock = vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          coordinatorDeliveries: [
            coordinatorDeliveryUnassigned,
            coordinatorDeliveryRivkah,
          ],
        })
      );
      vi.stubGlobal('fetch', fetchMock);
      const user = userEvent.setup();

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(
        await screen.findByTestId('coordinator-deliveries-page')
      ).toBeInTheDocument();
      expect(await screen.findByText('Yosef Abraham')).toBeInTheDocument();
      expect(screen.getByText('Rivkah Levi')).toBeInTheDocument();
      expect(screen.getByTestId('needs-volunteer-count')).toBeInTheDocument();
      expect(screen.getByTestId('delivery-row-unassigned')).toBeInTheDocument();

      const unassignedRow = screen.getByTestId('delivery-row-unassigned');
      await user.selectOptions(
        within(unassignedRow).getByRole('combobox'),
        '99999999-9999-4999-8999-999999999999'
      );

      await waitFor(() => {
        const assignCall = fetchMock.mock.calls.find(
          (call) =>
            String(call[0]).includes('/deliveries/') &&
            call[1]?.method === 'PATCH'
        );
        expect(assignCall).toBeDefined();
        expect(JSON.parse(String(assignCall?.[1]?.body))).toEqual({
          volunteerId: '99999999-9999-4999-8999-999999999999',
        });
      });
    });
  });
});
