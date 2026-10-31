import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CHANGE_REQUEST_RIVKAH_ID,
  CHANGE_REQUEST_YOSEF_ID,
  createChangeRequestFetchMock,
  pendingRivkahChangeRequest,
  pendingYosefChangeRequest,
} from '../test/change-request-fixtures';
import {
  CITY_A_ID,
  coordinatorUser,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

const OTHER_CITY_ID = '22222222-2222-4222-8222-222222222222';

describe('CoordinatorChangeRequestsPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists pending Holon change requests with current and proposed values', async () => {
    vi.stubGlobal('fetch', vi.fn(createChangeRequestFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/change-requests`);

    expect(
      await screen.findByTestId('coordinator-change-requests-page')
    ).toBeInTheDocument();
    const rivkahCard = await screen.findByTestId(
      `change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`
    );
    expect(within(rivkahCard).getByText('Rivkah Levi')).toBeInTheDocument();
    expect(within(rivkahCard).getByText(/Yonatan Bar/)).toBeInTheDocument();
    expect(
      within(rivkahCard).getByText(/Moved within Holon/)
    ).toBeInTheDocument();
    expect(
      within(rivkahCard).getByTestId('change-diff-street')
    ).toHaveTextContent('12 Example St');
    expect(
      within(rivkahCard).getByTestId('change-diff-street')
    ).toHaveTextContent('18 Weizmann St');
    expect(
      screen.getByTestId(`change-request-card-${CHANGE_REQUEST_YOSEF_ID}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('change-diff-contacts')).toHaveTextContent(
      'Dana Abraham'
    );
  });

  it('approves a request and removes it from the list', async () => {
    const fetchMock = vi.fn(createChangeRequestFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/change-requests`);
    await screen.findByTestId(
      `change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`
    );
    await user.click(
      screen.getByTestId(`approve-change-request-${CHANGE_REQUEST_RIVKAH_ID}`)
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(`change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`)
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByTestId(`change-request-card-${CHANGE_REQUEST_YOSEF_ID}`)
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes(
            `/elder-change-requests/${CHANGE_REQUEST_RIVKAH_ID}/approve`
          ) && call[1]?.method === 'POST'
      )
    ).toBe(true);
  });

  it('rejects a request with an optional Holon review note', async () => {
    const fetchMock = vi.fn(createChangeRequestFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/change-requests`);
    await screen.findByTestId(`change-request-card-${CHANGE_REQUEST_YOSEF_ID}`);
    await user.type(
      screen.getByTestId(
        `change-request-review-note-${CHANGE_REQUEST_YOSEF_ID}`
      ),
      'Please call the Holon office first'
    );
    await user.click(
      screen.getByTestId(`reject-change-request-${CHANGE_REQUEST_YOSEF_ID}`)
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(`change-request-card-${CHANGE_REQUEST_YOSEF_ID}`)
      ).not.toBeInTheDocument();
    });
    const rejectCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(
          `/elder-change-requests/${CHANGE_REQUEST_YOSEF_ID}/reject`
        ) && call[1]?.method === 'POST'
    );
    expect(rejectCall).toBeDefined();
    expect(JSON.parse(String(rejectCall?.[1]?.body))).toEqual({
      reviewNote: 'Please call the Holon office first',
    });
  });

  it('shows an empty state when there are no pending requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createChangeRequestFetchMock({ changeRequests: [] }))
    );

    renderApp(`/cities/${CITY_A_ID}/change-requests`);

    expect(
      await screen.findByTestId('change-requests-empty')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('coordinator-change-requests-list')
    ).not.toBeInTheDocument();
  });

  it('shows an error when the list cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createChangeRequestFetchMock({ listStatus: 500 }))
    );

    renderApp(`/cities/${CITY_A_ID}/change-requests`);

    expect(
      await screen.findByText(
        'לא הצלחנו לטעון את בקשות השינוי. נסו שוב מאוחר יותר.'
      )
    ).toBeInTheDocument();
  });

  it('restores a request when approve fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createChangeRequestFetchMock({
          changeRequests: [pendingRivkahChangeRequest()],
          approveStatus: 500,
        })
      )
    );
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/change-requests`);
    await user.click(
      await screen.findByTestId(
        `approve-change-request-${CHANGE_REQUEST_RIVKAH_ID}`
      )
    );

    expect(
      await screen.findByTestId('approve-change-request-error')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`)
    ).toBeInTheDocument();
    expect(screen.getByText('Rivkah Levi')).toBeInTheDocument();
  });

  it('switches the page copy between Hebrew and English', async () => {
    vi.stubGlobal('fetch', vi.fn(createChangeRequestFetchMock()));
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/change-requests`);
    expect(
      await screen.findByText('בקשות שינוי פרטי מבוגרים')
    ).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');

    await user.click(screen.getByRole('button', { name: 'English' }));

    expect(
      await screen.findByText('Elder change requests')
    ).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('links the change-requests page from coordinator home', async () => {
    vi.stubGlobal('fetch', vi.fn(createChangeRequestFetchMock()));

    renderApp('/');
    expect(
      await screen.findByTestId('view-change-requests')
    ).toBeInTheDocument();
  });

  it('hides the change-requests link from volunteers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createChangeRequestFetchMock({ user: volunteerUser() }))
    );

    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(
      screen.queryByTestId('view-change-requests')
    ).not.toBeInTheDocument();
  });

  it('blocks a volunteer who opens the change-requests URL', async () => {
    const fetchMock = vi.fn(
      createChangeRequestFetchMock({ user: volunteerUser() })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/cities/${CITY_A_ID}/change-requests`);

    expect(
      await screen.findByTestId('change-requests-no-access')
    ).toBeInTheDocument();
    expect(
      screen.queryByText(pendingYosefChangeRequest().elder.fullName)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('coordinator-change-requests-list')
    ).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/elder-change-requests')
      )
    ).toBe(false);
  });

  it('blocks a coordinator from another city without calling the API', async () => {
    const fetchMock = vi.fn(
      createChangeRequestFetchMock({
        user: coordinatorUser({
          memberships: [
            {
              cityId: OTHER_CITY_ID,
              role: 'coordinator',
              status: 'active',
            },
          ],
        }),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/cities/${CITY_A_ID}/change-requests`);

    expect(
      await screen.findByTestId('change-requests-no-access')
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes('/elder-change-requests')
      )
    ).toBe(false);
  });
});
