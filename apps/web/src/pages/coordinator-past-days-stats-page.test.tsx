import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import {
  CLOSED_DAY_OCT_ID,
  createPastDaysStatsFetchMock,
  holonPastDaysStats,
} from '../test/past-days-stats-fixtures';
import { renderApp } from '../test/render';

describe('CoordinatorPastDaysStatsPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('shows Holon past-day totals and per-day rows', async () => {
    vi.stubGlobal('fetch', vi.fn(createPastDaysStatsFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/stats`);

    expect(
      await screen.findByTestId('coordinator-past-days-stats-page')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId('past-days-stats-total-days')
    ).toHaveTextContent('2');
    expect(
      screen.getByTestId('past-days-stats-elders-served')
    ).toHaveTextContent('3');
    expect(screen.getByTestId('past-days-stats-delivered')).toHaveTextContent(
      '3'
    );
    expect(
      screen.getByTestId('past-days-stats-not-delivered')
    ).toHaveTextContent('1');
    expect(screen.getByTestId('past-days-stats-open')).toHaveTextContent('1');
    expect(screen.getByTestId('past-days-stats-confirmed')).toHaveTextContent(
      '5'
    );
    expect(screen.getByTestId('past-days-stats-declined')).toHaveTextContent(
      '1'
    );
    expect(
      screen.getByTestId(`past-day-stats-row-${CLOSED_DAY_OCT_ID}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('past-days-stats-table')).toBeInTheDocument();
  });

  it('shows an empty state when there are no closed days', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createPastDaysStatsFetchMock({
          stats: {
            cityId: CITY_A_ID,
            days: [],
            totals: {
              days: 0,
              eldersServed: 0,
              packagesDelivered: 0,
              packagesNotDelivered: 0,
              packagesOpen: 0,
              volunteersConfirmed: 0,
              volunteersDeclined: 0,
            },
          },
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/stats`);

    expect(
      await screen.findByTestId('past-days-stats-empty')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('past-days-stats-table')
    ).not.toBeInTheDocument();
  });

  it('blocks volunteers from opening the page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createPastDaysStatsFetchMock({
          user: volunteerUser(),
          stats: holonPastDaysStats,
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/stats`);

    expect(
      await screen.findByTestId('past-days-stats-no-access')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('past-days-stats-table')
    ).not.toBeInTheDocument();
  });

  it('returns to home from the back action', async () => {
    vi.stubGlobal('fetch', vi.fn(createPastDaysStatsFetchMock()));
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/stats`);
    await screen.findByTestId('coordinator-past-days-stats-page');
    await user.click(screen.getByRole('button', { name: /חזרה|back/i }));

    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });
});
