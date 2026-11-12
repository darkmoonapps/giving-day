import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';
import {
  MEMBERSHIP_DANA_ID,
  MEMBERSHIP_TAMAR_ID,
  MEMBERSHIP_YONATAN_ID,
  createVolunteerListFetchMock,
  volunteerDana,
  volunteerYonatan,
} from '../test/volunteer-list-fixtures';

describe('CoordinatorVolunteersPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists Holon volunteers and filters by search and membership status', async () => {
    const fetchMock = vi.fn(createVolunteerListFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });

    renderApp(`/cities/${CITY_A_ID}/volunteers`);

    expect(
      await screen.findByTestId('coordinator-volunteers-page')
    ).toBeInTheDocument();
    expect(
      await screen.findByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`volunteer-row-${MEMBERSHIP_TAMAR_ID}`)
    ).toBeInTheDocument();

    await user.clear(screen.getByTestId('volunteer-search'));
    await user.type(screen.getByTestId('volunteer-search'), 'Yonatan');

    await waitFor(() => {
      expect(
        screen.getByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`)
      ).not.toBeInTheDocument();
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes('search=Yonatan')
        )
      ).toBe(true);
    });

    await user.clear(screen.getByTestId('volunteer-search'));
    await user.selectOptions(
      screen.getByTestId('volunteer-status-filter'),
      'pending'
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`volunteer-row-${MEMBERSHIP_TAMAR_ID}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
      ).not.toBeInTheDocument();
    });
  }, 15_000);

  it('filters by confirmed or declined day response', async () => {
    const fetchMock = vi.fn(createVolunteerListFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/volunteers`);
    await screen.findByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`);

    await user.selectOptions(
      screen.getByTestId('volunteer-day-filter'),
      '33333333-3333-4333-8333-333333333333'
    );

    await waitFor(() => {
      const yonatan = screen.getByTestId(
        `volunteer-row-${MEMBERSHIP_YONATAN_ID}`
      );
      expect(within(yonatan).getByText('אישר')).toBeInTheDocument();
      const dana = screen.getByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`);
      expect(within(dana).getByText('סירוב')).toBeInTheDocument();
      expect(within(dana).getByText('Out of town')).toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByTestId('volunteer-day-response-filter'),
      'declined'
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`volunteer-row-${MEMBERSHIP_DANA_ID}`)
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId(`volunteer-row-${MEMBERSHIP_YONATAN_ID}`)
      ).not.toBeInTheDocument();
    });
  }, 15_000);

  it('blocks volunteers from opening the page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createVolunteerListFetchMock({
          user: volunteerUser(),
          volunteers: [volunteerYonatan, volunteerDana],
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/volunteers`);

    expect(
      await screen.findByTestId('coordinator-volunteers-page')
    ).toBeInTheDocument();
    expect(await screen.findByText(/לא הצלחנו לטעון/)).toBeInTheDocument();
    expect(
      screen.queryByTestId('coordinator-volunteers-table')
    ).not.toBeInTheDocument();
  });

  it('returns to home from the back action', async () => {
    vi.stubGlobal('fetch', vi.fn(createVolunteerListFetchMock()));
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/volunteers`);
    await screen.findByTestId('coordinator-volunteers-page');
    await user.click(screen.getByRole('button', { name: /חזרה|back/i }));

    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
  });
});
