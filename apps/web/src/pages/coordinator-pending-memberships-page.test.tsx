import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import {
  MEMBERSHIP_DANA_ID,
  MEMBERSHIP_TAMAR_ID,
  createPendingMembershipFetchMock,
  pendingDana,
} from '../test/pending-membership-fixtures';
import { renderApp } from '../test/render';

describe('CoordinatorPendingMembershipsPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists pending Holon join requests with name, phone, and date', async () => {
    vi.stubGlobal('fetch', vi.fn(createPendingMembershipFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/join-requests`);

    expect(
      await screen.findByTestId('coordinator-join-requests-page')
    ).toBeInTheDocument();
    const tamarRow = await screen.findByTestId(
      `join-request-row-${MEMBERSHIP_TAMAR_ID}`
    );
    expect(within(tamarRow).getByText('Tamar Shalev')).toBeInTheDocument();
    expect(within(tamarRow).getByText('+972506666666')).toBeInTheDocument();
    expect(within(tamarRow).getByText('מתנדב/ת')).toBeInTheDocument();

    const danaRow = screen.getByTestId(
      `join-request-row-${MEMBERSHIP_DANA_ID}`
    );
    expect(within(danaRow).getByText('Dana Cohen')).toBeInTheDocument();
    expect(within(danaRow).getByText('+972507777777')).toBeInTheDocument();
    expect(within(danaRow).getByText('רכז/ת')).toBeInTheDocument();
  });

  it('approves a request and removes it from the list', async () => {
    const fetchMock = vi.fn(createPendingMembershipFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/join-requests`);
    await screen.findByTestId(`join-request-row-${MEMBERSHIP_TAMAR_ID}`);
    await user.click(
      screen.getByTestId(`approve-membership-${MEMBERSHIP_TAMAR_ID}`)
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(`join-request-row-${MEMBERSHIP_TAMAR_ID}`)
      ).not.toBeInTheDocument();
    });
    expect(
      screen.getByTestId(`join-request-row-${MEMBERSHIP_DANA_ID}`)
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes(
            `/memberships/${MEMBERSHIP_TAMAR_ID}/approve`
          ) && call[1]?.method === 'POST'
      )
    ).toBe(true);
  });

  it('rejects a request and removes it from the list', async () => {
    const fetchMock = vi.fn(createPendingMembershipFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/join-requests`);
    await screen.findByTestId(`join-request-row-${MEMBERSHIP_DANA_ID}`);
    await user.click(
      screen.getByTestId(`reject-membership-${MEMBERSHIP_DANA_ID}`)
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(`join-request-row-${MEMBERSHIP_DANA_ID}`)
      ).not.toBeInTheDocument();
    });
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes(
            `/memberships/${MEMBERSHIP_DANA_ID}/reject`
          ) && call[1]?.method === 'POST'
      )
    ).toBe(true);
  });

  it('shows an empty state when there are no pending requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createPendingMembershipFetchMock({ memberships: [] }))
    );

    renderApp(`/cities/${CITY_A_ID}/join-requests`);

    expect(
      await screen.findByTestId('join-requests-empty')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('coordinator-join-requests-table')
    ).not.toBeInTheDocument();
  });

  it('shows an error when the list cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createPendingMembershipFetchMock({ listStatus: 500 }))
    );

    renderApp(`/cities/${CITY_A_ID}/join-requests`);

    expect(
      await screen.findByText(
        'לא הצלחנו לטעון את בקשות ההצטרפות. נסו שוב מאוחר יותר.'
      )
    ).toBeInTheDocument();
  });

  it('restores a request when approve fails', async () => {
    const fetchMock = vi.fn(
      createPendingMembershipFetchMock({ approveStatus: 500 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/join-requests`);
    await screen.findByTestId(`join-request-row-${MEMBERSHIP_TAMAR_ID}`);
    await user.click(
      screen.getByTestId(`approve-membership-${MEMBERSHIP_TAMAR_ID}`)
    );

    expect(
      await screen.findByTestId('approve-membership-error')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`join-request-row-${MEMBERSHIP_TAMAR_ID}`)
    ).toBeInTheDocument();
    expect(screen.getByText('Tamar Shalev')).toBeInTheDocument();
  });

  it('links the join-requests page from coordinator home', async () => {
    vi.stubGlobal('fetch', vi.fn(createPendingMembershipFetchMock()));

    renderApp('/');
    expect(await screen.findByTestId('view-join-requests')).toBeInTheDocument();
  });

  it('hides the join-requests link from volunteers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createPendingMembershipFetchMock({
          user: volunteerUser(),
        })
      )
    );

    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('view-join-requests')).not.toBeInTheDocument();
  });

  it('blocks a volunteer who opens the join-requests URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createPendingMembershipFetchMock({
          user: volunteerUser(),
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/join-requests`);

    expect(
      await screen.findByText(
        'לא הצלחנו לטעון את בקשות ההצטרפות. נסו שוב מאוחר יותר.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(pendingDana.firstName ?? '')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('coordinator-join-requests-table')
    ).not.toBeInTheDocument();
  });
});
