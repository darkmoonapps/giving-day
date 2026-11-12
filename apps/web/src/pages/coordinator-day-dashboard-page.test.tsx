import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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
  holonDayDashboard,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

const HOLON_RESPONSES = [
  {
    volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    firstName: 'Yonatan',
    lastName: 'Bar',
    responseStatus: 'confirmed' as const,
    cancelReason: null,
    respondedAt: '2026-10-29T10:00:00.000Z',
  },
  {
    volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    firstName: 'Maya',
    lastName: 'Cohen',
    responseStatus: 'declined' as const,
    cancelReason: 'Family event in Holon',
    respondedAt: '2026-10-29T11:00:00.000Z',
  },
  {
    volunteerId: '99999999-9999-4999-8999-999999999999',
    firstName: 'Dana',
    lastName: 'Levi',
    responseStatus: 'no_response' as const,
    cancelReason: null,
    respondedAt: null,
  },
];

describe('CoordinatorDayDashboardPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          dashboard: {
            ...holonDayDashboard,
            deliveries: {
              ...holonDayDashboard.deliveries,
              picked: 1,
              delivered: 2,
              notDelivered: 1,
            },
          },
          responses: HOLON_RESPONSES,
          coordinatorDeliveries: [
            coordinatorDeliveryUnassigned,
            coordinatorDeliveryRivkah,
          ],
        })
      )
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('shows overview counts, decline reasons, and links into existing lists', async () => {
    const user = userEvent.setup();
    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/dashboard`);

    expect(
      await screen.findByTestId('dashboard-stat-volunteers')
    ).toHaveTextContent('3');
    expect(screen.getByTestId('dashboard-stat-confirmed')).toHaveTextContent(
      '1'
    );
    expect(screen.getByTestId('dashboard-stat-pending')).toHaveTextContent('1');
    expect(screen.getByTestId('dashboard-stat-declined')).toHaveTextContent(
      '1'
    );
    expect(screen.getByTestId('dashboard-stat-unassigned')).toHaveTextContent(
      '1'
    );
    expect(screen.getByTestId('dashboard-stat-picked')).toHaveTextContent('1');
    expect(screen.getByTestId('dashboard-stat-delivered')).toHaveTextContent(
      '2'
    );
    expect(
      screen.getByTestId('dashboard-stat-not-delivered')
    ).toHaveTextContent('1');
    expect(screen.getByText('Yonatan Bar')).toBeInTheDocument();
    expect(screen.getByText('Dana Levi')).toBeInTheDocument();
    expect(screen.getByText('Maya Cohen')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-cancel-reason')).toHaveTextContent(
      'Family event in Holon'
    );
    expect(screen.getByText('Yosef Abraham')).toBeInTheDocument();

    await user.click(screen.getByTestId('dashboard-needs-volunteer-link'));
    expect(
      await screen.findByTestId('coordinator-deliveries-page')
    ).toBeInTheDocument();
  });

  it('opens volunteer and elder details from the dashboard lists', async () => {
    const user = userEvent.setup();
    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/dashboard`);

    await user.click(
      await screen.findByTestId(
        'volunteer-link-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      )
    );
    expect(
      await screen.findByTestId('coordinator-responses-page')
    ).toBeInTheDocument();
  });

  it('hides the dashboard from a volunteer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: volunteerUser(),
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/dashboard`);

    expect(
      await screen.findByTestId('dashboard-no-access')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('dashboard-stat-volunteers')
    ).not.toBeInTheDocument();
  });

  it('lets a coordinator update Holon day hours and the volunteer note', async () => {
    const fetchMock = vi.fn(
      createDayFetchMock({
        refresh: 'ok',
        user: coordinatorUser(),
        dashboard: {
          ...holonDayDashboard,
          deliveries: {
            ...holonDayDashboard.deliveries,
            picked: 1,
            delivered: 2,
            notDelivered: 1,
          },
        },
        responses: HOLON_RESPONSES,
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/dashboard`);

    expect(await screen.findByTestId('day-details-form')).toBeInTheDocument();
    expect(screen.getByTestId('day-details-start-time')).toHaveValue('09:00');
    expect(screen.getByTestId('day-details-notes')).toHaveValue(
      'Bring a folding cart'
    );

    fireEvent.change(screen.getByTestId('day-details-start-time'), {
      target: { value: '08:00' },
    });
    fireEvent.change(screen.getByTestId('day-details-end-time'), {
      target: { value: '13:00' },
    });
    fireEvent.change(screen.getByTestId('day-details-notes'), {
      target: { value: 'Pick up an additional blanket/package' },
    });
    await user.click(screen.getByTestId('save-day-details'));

    await waitFor(() => {
      expect(screen.getByTestId('day-details-success')).toBeInTheDocument();
    });

    const updateCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(
          `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}`
        ) &&
        call[1]?.method === 'PATCH' &&
        !String(call[0]).includes('/deliveries')
    );
    expect(updateCall).toBeDefined();
    expect(JSON.parse(String(updateCall?.[1]?.body))).toEqual({
      startTime: '08:00',
      endTime: '13:00',
      notesForVolunteers: 'Pick up an additional blanket/package',
    });
    expect(screen.getByText('08:00 – 13:00')).toBeInTheDocument();
  });

  it('shows a save error when updating day details fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          updateDay: 'error',
        })
      )
    );
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/dashboard`);
    await screen.findByTestId('day-details-form');
    await user.click(screen.getByTestId('save-day-details'));

    expect(
      await screen.findByTestId('day-details-save-error')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('day-details-success')).not.toBeInTheDocument();
  });

  it('switches dashboard copy between Hebrew RTL and English LTR', async () => {
    const user = userEvent.setup();
    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/dashboard`);

    expect(
      await screen.findByTestId('dashboard-stat-volunteers')
    ).toBeInTheDocument();
    expect(screen.getByText('לוח בקרה ליום החלוקה')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByText('Distribution day dashboard')
    ).toBeInTheDocument();
    expect(screen.getByText('Day hours and notes')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });
});
