import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  DAY_ID,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import {
  ELDER_YOSEF_ID,
  VOLUNTEER_DANA_ID,
  unmatchedYosef,
} from '../test/match-fixtures';
import {
  ONE_TIME_MATCH_RIVKAH_ID,
  createOneTimeMatchFetchMock,
} from '../test/one-time-match-fixtures';
import { renderApp } from '../test/render';

describe('CoordinatorOneTimeMatchesPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists current one-time matches and creates one for the day', async () => {
    const fetchMock = vi.fn(createOneTimeMatchFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);

    expect(
      await screen.findByTestId('coordinator-one-time-matches-page')
    ).toBeInTheDocument();
    expect(await screen.findByText('Rivkah Levi')).toBeInTheDocument();
    expect(
      within(
        screen.getByTestId(`one-time-match-row-${ONE_TIME_MATCH_RIVKAH_ID}`)
      ).getByText('Yonatan Bar')
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('בחירת מבוגר/ת'),
      unmatchedYosef.id
    );
    await user.selectOptions(
      screen.getByLabelText('בחירת מתנדב/ת'),
      VOLUNTEER_DANA_ID
    );
    await user.click(screen.getByTestId('create-one-time-match-submit'));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/one-time-matches') &&
          !String(call[0]).includes('/end') &&
          call[1]?.method === 'POST'
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
        elderId: ELDER_YOSEF_ID,
        volunteerId: VOLUNTEER_DANA_ID,
      });
    });
  });

  it('ends a current one-time match with a reason', async () => {
    const fetchMock = vi.fn(createOneTimeMatchFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);
    const row = await screen.findByTestId(
      `one-time-match-row-${ONE_TIME_MATCH_RIVKAH_ID}`
    );
    await user.selectOptions(
      within(row).getByLabelText('סיבת הסיום'),
      'reassigned'
    );
    await user.click(
      screen.getByTestId(`end-one-time-match-${ONE_TIME_MATCH_RIVKAH_ID}`)
    );
    await user.click(
      screen.getByTestId(
        `confirm-end-one-time-match-${ONE_TIME_MATCH_RIVKAH_ID}`
      )
    );

    await waitFor(() => {
      const endCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes(
            `/one-time-matches/${ONE_TIME_MATCH_RIVKAH_ID}/end`
          ) && call[1]?.method === 'POST'
      );
      expect(endCall).toBeDefined();
      expect(JSON.parse(String(endCall?.[1]?.body))).toEqual({
        endReason: 'reassigned',
      });
    });
  });

  it('hides the page from a volunteer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createOneTimeMatchFetchMock({
          user: volunteerUser(),
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);

    expect(
      await screen.findByTestId('one-time-matches-no-access')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('coordinator-one-time-matches-table')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('create-one-time-match-form')
    ).not.toBeInTheDocument();
  });

  it('shows empty copy when no volunteers confirmed for the day', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createOneTimeMatchFetchMock({
          matchableVolunteers: [],
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);

    expect(
      await screen.findByTestId('no-confirmed-volunteers-for-day')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('create-one-time-match-submit')
    ).not.toBeInTheDocument();
  });

  it('shows volunteer-not-confirmed error from create', async () => {
    const fetchMock = vi.fn(
      createOneTimeMatchFetchMock({
        createStatus: 400,
        createErrorCode: 'matches.volunteer_not_confirmed',
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);

    await user.selectOptions(
      await screen.findByLabelText('בחירת מבוגר/ת'),
      unmatchedYosef.id
    );
    await user.selectOptions(
      screen.getByLabelText('בחירת מתנדב/ת'),
      VOLUNTEER_DANA_ID
    );
    await user.click(screen.getByTestId('create-one-time-match-submit'));

    expect(
      await screen.findByTestId('create-one-time-match-error')
    ).toHaveTextContent(
      'אפשר לשבץ רק מתנדב/ת שאישר/ה השתתפות ליום החלוקה הזה.'
    );
  });

  it('switches copy between Hebrew RTL and English LTR', async () => {
    vi.stubGlobal('fetch', vi.fn(createOneTimeMatchFetchMock()));
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/one-time-matches`);
    expect(await screen.findByText('שיבוצים חד-יומיים')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(await screen.findByText('One-time matches')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });
});
