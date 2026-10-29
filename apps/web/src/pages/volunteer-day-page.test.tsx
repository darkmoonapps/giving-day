import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  DAY_ID,
  createDayFetchMock,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

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

    expect(await screen.findByTestId('confirm-thanks')).toBeInTheDocument();
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
});
