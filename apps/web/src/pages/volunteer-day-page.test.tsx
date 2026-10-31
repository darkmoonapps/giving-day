import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  DAY_ID,
  createDayFetchMock,
  openDay,
  volunteerDeliveryRivkah,
  volunteerDeliveryYosef,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

function confirmedDay(): typeof openDay & {
  myParticipation: {
    id: string;
    cityId: string;
    dayId: string;
    volunteerId: string;
    status: 'confirmed';
    respondedAt: string;
    cancelReason: null;
  };
} {
  return {
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
  };
}

describe('VolunteerDayPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: volunteerUser(),
        })
      )
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists open days on home for a volunteer', async () => {
    renderApp('/');

    expect(
      await screen.findByTestId('volunteer-open-days')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'למענה' })).toBeInTheDocument();
  });

  it('lets a volunteer confirm an open day', async () => {
    const fetchMock = vi.fn(
      createDayFetchMock({
        refresh: 'ok',
        user: volunteerUser(),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);

    expect(await screen.findByTestId('volunteer-day-page')).toBeInTheDocument();
    expect(await screen.findByText('Bring a folding cart')).toBeInTheDocument();
    await user.click(await screen.findByTestId('confirm-participation'));

    const fireworks = await screen.findByTestId('fireworks-thank-you');
    expect(fireworks).toHaveAttribute('data-thank-you-reason', 'confirmed');
    expect(await screen.findByTestId('confirm-thanks')).toBeInTheDocument();
    await user.click(screen.getByTestId('thank-you-continue'));
    expect(screen.queryByTestId('fireworks-thank-you')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-thanks')).toBeInTheDocument();
    const respondCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/participations') &&
        call[1]?.method === 'POST'
    );
    expect(respondCall).toBeDefined();
    expect(JSON.parse(String(respondCall?.[1]?.body))).toEqual({
      status: 'confirmed',
    });
  });

  it('requires a reason before declining', async () => {
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);
    await screen.findByTestId('volunteer-day-page');
    await user.click(await screen.findByTestId('decline-participation'));
    await user.click(await screen.findByTestId('submit-decline'));

    expect(await screen.findByText('שדה חובה')).toBeInTheDocument();
    expect(screen.getByTestId('decline-form')).toBeInTheDocument();
    expect(screen.queryByTestId('decline-thanks')).not.toBeInTheDocument();
  });

  it('declines with a reason the coordinator can later read', async () => {
    const fetchMock = vi.fn(
      createDayFetchMock({
        refresh: 'ok',
        user: volunteerUser(),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);
    await screen.findByTestId('volunteer-day-page');
    await user.click(await screen.findByTestId('decline-participation'));
    await user.type(
      await screen.findByLabelText('סיבה'),
      'Family event in Holon'
    );
    await user.click(await screen.findByTestId('submit-decline'));

    await waitFor(() => {
      expect(screen.getByTestId('decline-thanks')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('fireworks-thank-you')).not.toBeInTheDocument();
    const respondCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes('/participations') &&
        call[1]?.method === 'POST'
    );
    expect(JSON.parse(String(respondCall?.[1]?.body))).toEqual({
      status: 'declined',
      cancelReason: 'Family event in Holon',
    });
  });

  it('lists assigned deliveries after confirm and lets the volunteer mark picked', async () => {
    const fetchMock = vi.fn(
      createDayFetchMock({
        refresh: 'ok',
        user: volunteerUser(),
        day: confirmedDay(),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);

    expect(
      await screen.findByTestId('volunteer-day-deliveries')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('fireworks-thank-you')).not.toBeInTheDocument();
    expect(await screen.findByText('Rivkah Levi')).toBeInTheDocument();
    expect(screen.getByText('12 Example St 12')).toBeInTheDocument();
    expect(screen.getByTestId('elder-next-of-kin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Tamar Levi/ })).toHaveAttribute(
      'href',
      'tel:+972506666666'
    );

    await user.click(screen.getByTestId('mark-picked'));

    await waitFor(() => {
      const statusCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/status') && call[1]?.method === 'PATCH'
      );
      expect(statusCall).toBeDefined();
      expect(JSON.parse(String(statusCall?.[1]?.body))).toEqual({
        status: 'picked',
      });
    });
  });

  it('opens a notes popup when marking a picked package not delivered', async () => {
    const fetchMock = vi.fn(
      createDayFetchMock({
        refresh: 'ok',
        user: volunteerUser(),
        day: confirmedDay(),
        volunteerDeliveries: [
          {
            id: '16161616-1616-4161-8161-161616161616',
            cityId: CITY_A_ID,
            dayId: DAY_ID,
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
          },
        ],
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);

    await user.click(await screen.findByTestId('mark-not-delivered'));
    await user.click(await screen.findByTestId('submit-not-delivered'));
    expect(await screen.findAllByText('שדה חובה')).toHaveLength(2);

    await user.selectOptions(
      screen.getByTestId('not-delivered-reason'),
      'not_home'
    );
    await user.type(
      screen.getByTestId('not-delivered-note'),
      'Elder was not home in Holon'
    );
    await user.click(screen.getByTestId('submit-not-delivered'));

    await waitFor(() => {
      const statusCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/status') && call[1]?.method === 'PATCH'
      );
      expect(JSON.parse(String(statusCall?.[1]?.body))).toEqual({
        status: 'not_delivered',
        note: 'Elder was not home in Holon',
        notDeliveredReason: 'not_home',
      });
    });
  });

  it('shows fireworks thank-you after the last assigned package is delivered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: volunteerUser(),
          day: confirmedDay(),
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

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);

    expect(await screen.findByTestId('mark-delivered')).toBeInTheDocument();
    expect(screen.queryByTestId('fireworks-thank-you')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('mark-delivered'));

    const fireworks = await screen.findByTestId('fireworks-thank-you');
    expect(fireworks).toHaveAttribute('data-thank-you-reason', 'finished');
    await user.click(screen.getByTestId('thank-you-continue'));
    expect(screen.queryByTestId('fireworks-thank-you')).not.toBeInTheDocument();
  });

  it('does not show fireworks thank-you when only some packages have a final status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: volunteerUser(),
          day: confirmedDay(),
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

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}`);

    expect(await screen.findByText('Yosef Abraham')).toBeInTheDocument();
    await user.click(screen.getByTestId('mark-delivered'));

    await waitFor(() => {
      expect(screen.getByText('Rivkah Levi')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('fireworks-thank-you')).not.toBeInTheDocument();
    expect(screen.getByTestId('mark-picked')).toBeInTheDocument();
  });
});
