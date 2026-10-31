import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID } from '../test/distribution-day-fixtures';
import {
  MATCH_RIVKAH_ID,
  VOLUNTEER_DANA_ID,
  createMatchFetchMock,
  currentMatchRivkah,
  unmatchedYosef,
  volunteerDana,
} from '../test/match-fixtures';

const MATCH_YOSEF_ID = '17171717-1717-4171-8171-171717171717';
import { renderApp } from '../test/render';

describe('CoordinatorMatchesPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists current matches and creates a permanent match', async () => {
    const fetchMock = vi.fn(createMatchFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/matches`);

    expect(
      await screen.findByTestId('coordinator-matches-page')
    ).toBeInTheDocument();
    expect(await screen.findByText('Rivkah Levi')).toBeInTheDocument();
    expect(
      within(screen.getByTestId(`match-row-${MATCH_RIVKAH_ID}`)).getByText(
        'Yonatan Bar'
      )
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('בחירת מבוגר/ת'),
      unmatchedYosef.id
    );
    await user.selectOptions(
      screen.getByLabelText('בחירת מתנדב/ת'),
      VOLUNTEER_DANA_ID
    );
    await user.click(screen.getByTestId('create-match-submit'));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes('/matches') &&
          !String(call[0]).includes('/end') &&
          call[1]?.method === 'POST'
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
        elderId: unmatchedYosef.id,
        volunteerId: VOLUNTEER_DANA_ID,
      });
    });
  });

  it('ends a current match with a reason', async () => {
    const fetchMock = vi.fn(createMatchFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/matches`);
    const row = await screen.findByTestId(`match-row-${MATCH_RIVKAH_ID}`);
    await user.selectOptions(
      within(row).getByLabelText('סיבת הסיום'),
      'volunteer_left'
    );
    await user.click(screen.getByTestId(`end-match-${MATCH_RIVKAH_ID}`));

    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(`/matches/${MATCH_RIVKAH_ID}/end`)
      )
    ).toBe(false);
    expect(
      within(row).getByText('לסיים את השיבוץ הקבוע הזה?')
    ).toBeInTheDocument();

    await user.click(
      screen.getByTestId(`confirm-end-match-${MATCH_RIVKAH_ID}`)
    );

    await waitFor(() => {
      const endCall = fetchMock.mock.calls.find((call) =>
        String(call[0]).includes(`/matches/${MATCH_RIVKAH_ID}/end`)
      );
      expect(endCall).toBeDefined();
      expect(JSON.parse(String(endCall?.[1]?.body))).toEqual({
        endReason: 'volunteer_left',
      });
    });
  });

  it('asks for confirmation on one row only', async () => {
    const yosefMatch = {
      ...currentMatchRivkah,
      id: MATCH_YOSEF_ID,
      elderId: unmatchedYosef.id,
      volunteerId: volunteerDana.id,
      elder: unmatchedYosef,
      volunteer: volunteerDana,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createMatchFetchMock({
          matches: [currentMatchRivkah, yosefMatch],
          unmatchedElders: [],
        })
      )
    );
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/matches`);
    const rivkahRow = await screen.findByTestId(`match-row-${MATCH_RIVKAH_ID}`);
    const yosefRow = screen.getByTestId(`match-row-${MATCH_YOSEF_ID}`);

    await user.click(
      within(rivkahRow).getByTestId(`end-match-${MATCH_RIVKAH_ID}`)
    );

    expect(
      within(rivkahRow).getByTestId(`confirm-end-match-${MATCH_RIVKAH_ID}`)
    ).toBeInTheDocument();
    expect(
      within(yosefRow).getByTestId(`end-match-${MATCH_YOSEF_ID}`)
    ).toBeInTheDocument();
    expect(
      within(yosefRow).queryByTestId(`confirm-end-match-${MATCH_YOSEF_ID}`)
    ).not.toBeInTheDocument();
  });

  it('shows a conflict when the elder already has a match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createMatchFetchMock({
          createStatus: 409,
        })
      )
    );
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/matches`);
    await screen.findByTestId('create-match-form');
    await user.selectOptions(
      screen.getByLabelText('בחירת מבוגר/ת'),
      unmatchedYosef.id
    );
    await user.selectOptions(
      screen.getByLabelText('בחירת מתנדב/ת'),
      VOLUNTEER_DANA_ID
    );
    await user.click(screen.getByTestId('create-match-submit'));

    expect(await screen.findByTestId('create-match-error')).toBeInTheDocument();
    expect(
      screen.getByText(currentMatchRivkah.elder.fullName)
    ).toBeInTheDocument();
  });
});
