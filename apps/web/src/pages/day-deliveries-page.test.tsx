import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  DAY_ID,
  coordinatorDeliveryNotDelivered,
  coordinatorDeliveryRivkah,
  coordinatorDeliveryUnassigned,
  coordinatorDeliveryUnmatched,
  coordinatorUser,
  createDayFetchMock,
  openDay,
  volunteerDeliveryRivkah,
  volunteerDeliveryYosef,
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
      expect(screen.getByTestId('elder-next-of-kin')).toBeInTheDocument();
      expect(screen.getByText(/Tamar Levi/)).toBeInTheDocument();
      expect(screen.getByText('+972506666666')).toBeInTheDocument();
      expect(screen.getByTestId('mark-picked')).toBeInTheDocument();
      expect(screen.queryByTestId('assign-delivery')).not.toBeInTheDocument();
    });

    it('shows fireworks thank-you after the last assigned package is delivered', async () => {
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
            volunteerDeliveries: [
              {
                ...volunteerDeliveryRivkah,
                status: 'picked',
              },
            ],
          })
        )
      );
      const user = userEvent.setup();

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(await screen.findByTestId('mark-delivered')).toBeInTheDocument();
      expect(
        screen.queryByTestId('fireworks-thank-you')
      ).not.toBeInTheDocument();

      await user.click(screen.getByTestId('mark-delivered'));

      const fireworks = await screen.findByTestId('fireworks-thank-you');
      expect(fireworks).toHaveAttribute('data-thank-you-reason', 'finished');
    });

    it('does not show fireworks thank-you for a partial delivery update', async () => {
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
            volunteerDeliveries: [
              {
                ...volunteerDeliveryRivkah,
                status: 'picked',
              },
              volunteerDeliveryYosef,
            ],
          })
        )
      );
      const user = userEvent.setup();

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(await screen.findByText('Yosef Abraham')).toBeInTheDocument();
      await user.click(screen.getByTestId('mark-delivered'));
      await waitFor(() => {
        expect(screen.getByTestId('mark-picked')).toBeInTheDocument();
      });
      expect(
        screen.queryByTestId('fireworks-thank-you')
      ).not.toBeInTheDocument();
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

    it('lists only confirmed volunteers in the assign dropdown', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          createDayFetchMock({
            refresh: 'ok',
            user: coordinatorUser(),
            assignableVolunteers: [
              {
                id: '99999999-9999-4999-8999-999999999999',
                firstName: 'Dana',
                lastName: 'Levi',
              },
            ],
            coordinatorDeliveries: [
              coordinatorDeliveryUnassigned,
              coordinatorDeliveryRivkah,
            ],
          })
        )
      );

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      const unassignedRow = await screen.findByTestId(
        'delivery-row-unassigned'
      );
      const unassignedOptions = within(unassignedRow)
        .getAllByRole('option')
        .map((option) => option.textContent);

      expect(unassignedOptions).toEqual(['ללא שיבוץ', 'Dana Levi']);
      expect(unassignedOptions).not.toContain('Yonatan Bar');

      const assignedRow = screen.getByTestId('delivery-row-assigned');
      const assignedOptions = within(assignedRow)
        .getAllByRole('option')
        .map((option) => option.textContent);

      expect(assignedOptions).toEqual([
        'ללא שיבוץ',
        'Dana Levi',
        'Yonatan Bar',
      ]);
    });

    it('lets the coordinator assign a nearby suggested volunteer in one click', async () => {
      const fetchMock = vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          coordinatorDeliveries: [coordinatorDeliveryUnassigned],
        })
      );
      vi.stubGlobal('fetch', fetchMock);
      const user = userEvent.setup();

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      const suggestions = await screen.findByTestId(
        `replacement-suggestions-${coordinatorDeliveryUnassigned.id}`
      );
      expect(suggestions).toBeInTheDocument();
      expect(
        within(suggestions).getAllByRole('button')[0]
      ).toHaveAccessibleName('שיבוץ של Dana Levi (Park)');

      await user.click(
        screen.getByTestId(
          `suggest-assign-${coordinatorDeliveryUnassigned.id}-99999999-9999-4999-8999-999999999999`
        )
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

    it('shows unmatched elders as needing a volunteer in Hebrew RTL and English LTR', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          createDayFetchMock({
            refresh: 'ok',
            user: coordinatorUser(),
            coordinatorDeliveries: [coordinatorDeliveryUnmatched],
          })
        )
      );
      const user = userEvent.setup();

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(
        await screen.findByTestId('coordinator-deliveries-page')
      ).toBeInTheDocument();
      expect(document.documentElement.dir).toBe('rtl');
      expect(await screen.findByText('Miriam Cohen')).toBeInTheDocument();
      expect(screen.getByTestId('delivery-row-unassigned')).toBeInTheDocument();
      expect(screen.getByTestId('needs-volunteer-badge')).toHaveTextContent(
        'צריך מתנדב/ת'
      );
      expect(screen.getByTestId('needs-volunteer-count')).toHaveTextContent(
        '1 ממתינים למתנדב/ת'
      );
      expect(
        screen.getByTestId(
          `replacement-suggestions-${coordinatorDeliveryUnmatched.id}`
        )
      ).toHaveTextContent('מתנדבים מוצעים, הקרובים קודם');

      await user.click(screen.getByRole('button', { name: 'English' }));

      expect(screen.getByTestId('needs-volunteer-badge')).toHaveTextContent(
        'Needs a volunteer'
      );
      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
      expect(screen.getByTestId('needs-volunteer-count')).toHaveTextContent(
        '1 need a volunteer'
      );
      expect(
        screen.getByTestId(
          `replacement-suggestions-${coordinatorDeliveryUnmatched.id}`
        )
      ).toHaveTextContent('Suggested volunteers, closest first');
    });

    it('sorts and filters the coordinator deliveries list on the client', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          createDayFetchMock({
            refresh: 'ok',
            user: coordinatorUser(),
            coordinatorDeliveries: [
              coordinatorDeliveryRivkah,
              coordinatorDeliveryUnassigned,
              coordinatorDeliveryUnmatched,
            ],
          })
        )
      );
      const user = userEvent.setup();

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(await screen.findByText('Rivkah Levi')).toBeInTheDocument();
      expect(screen.getByTestId('deliveries-filter-count')).toHaveTextContent(
        'מוצגים 3 מתוך 3'
      );

      await user.click(screen.getByTestId('sort-elder'));
      expect(elderNames()).toEqual([
        'Miriam Cohen',
        'Rivkah Levi',
        'Yosef Abraham',
      ]);

      await user.click(screen.getByTestId('sort-elder'));
      expect(elderNames()).toEqual([
        'Yosef Abraham',
        'Rivkah Levi',
        'Miriam Cohen',
      ]);

      await user.click(screen.getByTestId('needs-volunteer-count'));
      expect(elderNames()).toEqual(['Yosef Abraham', 'Miriam Cohen']);
      expect(screen.getByTestId('filter-status')).toHaveValue('unassigned');
      expect(screen.getByTestId('deliveries-filter-count')).toHaveTextContent(
        'מוצגים 2 מתוך 3'
      );

      await user.click(screen.getByTestId('clear-delivery-filters'));
      await user.type(screen.getByTestId('filter-address'), 'Weizmann');
      expect(elderNames()).toEqual(['Miriam Cohen']);

      await user.click(screen.getByTestId('clear-delivery-filters'));
      await user.selectOptions(
        screen.getByTestId('filter-volunteer'),
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      );
      expect(elderNames()).toEqual(['Rivkah Levi']);

      await user.selectOptions(screen.getByTestId('filter-status'), 'assigned');
      expect(elderNames()).toEqual(['Rivkah Levi']);

      await user.selectOptions(
        screen.getByTestId('filter-status'),
        'unassigned'
      );
      expect(screen.getByTestId('deliveries-filter-empty')).toBeInTheDocument();
    });

    it('shows a not-delivered note next to the delivery status', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          createDayFetchMock({
            refresh: 'ok',
            user: coordinatorUser(),
            coordinatorDeliveries: [coordinatorDeliveryNotDelivered],
          })
        )
      );

      renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);

      expect(await screen.findByTestId('delivery-status')).toHaveTextContent(
        'לא נמסר'
      );
      expect(screen.getByTestId('not-delivered-note')).toHaveTextContent(
        'Elder was not home in Holon'
      );
    });
  });
});

function elderNames(): string[] {
  return screen
    .queryAllByTestId('delivery-elder-name')
    .map((node) => node.textContent ?? '');
}
