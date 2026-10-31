import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  superAdminUser,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import * as cityJoinLinks from '../cities/city-join-links';
import {
  joinLinkStorageKey,
  readRevealedJoinLink,
  writeRevealedJoinLink,
} from '../cities/city-join-links';
import {
  createCitySettingsFetchMock,
  holonCitySettings,
  holonJoinLinks,
  holonVolunteerJoinLinkCreated,
} from '../test/city-settings-fixtures';
import { renderApp } from '../test/render';

describe('CitySettingsPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('loads Holon settings into the form', async () => {
    vi.stubGlobal('fetch', vi.fn(createCitySettingsFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(await screen.findByTestId('city-settings-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/כתובת מרכז החלוקה/)).toHaveValue(
      holonCitySettings.centerAddress
    );
    expect(screen.getByLabelText(/קו רוחב/)).toHaveValue('32.0114');
    expect(screen.getByLabelText(/קו אורך/)).toHaveValue('34.7748');
    expect(screen.getByLabelText(/שם הארגון/)).toHaveValue('Latet Holon');
  });

  it('saves an updated Holon distribution center address', async () => {
    const fetchMock = vi.fn(createCitySettingsFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);
    await screen.findByTestId('city-settings-form');

    const address = screen.getByLabelText(/כתובת מרכז החלוקה/);
    await user.clear(address);
    await user.type(address, '12 Example St, Holon');
    await user.click(screen.getByTestId('save-city-settings'));

    await waitFor(() => {
      expect(screen.getByTestId('city-settings-success')).toBeInTheDocument();
    });

    const updateCall = fetchMock.mock.calls.find(
      (call) =>
        String(call[0]).includes(`/api/cities/${CITY_A_ID}/settings`) &&
        call[1]?.method === 'PATCH'
    );
    expect(updateCall).toBeDefined();
    expect(JSON.parse(String(updateCall?.[1]?.body))).toMatchObject({
      centerAddress: '12 Example St, Holon',
      centerLat: 32.0114,
      centerLng: 34.7748,
      defaultStartTime: '09:00',
      defaultEndTime: '14:00',
      confirmReminderAfterHours: 24,
      orgName: 'Latet Holon',
      logoUrl: null,
    });
  });

  it('shows validation errors without calling the API', async () => {
    const fetchMock = vi.fn(createCitySettingsFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);
    await screen.findByTestId('city-settings-form');

    const address = screen.getByLabelText(/כתובת מרכז החלוקה/);
    await user.clear(address);
    await user.click(screen.getByTestId('save-city-settings'));

    expect(await screen.findByText('שדה חובה')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes(`/api/cities/${CITY_A_ID}/settings`) &&
          call[1]?.method === 'PATCH'
      )
    ).toBe(false);
  });

  it('shows an error when saving fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createCitySettingsFetchMock({ updateStatus: 500 }))
    );
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);
    await screen.findByTestId('city-settings-form');
    await user.click(screen.getByTestId('save-city-settings'));

    expect(
      await screen.findByTestId('city-settings-save-error')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('city-settings-success')
    ).not.toBeInTheDocument();
  });

  it('shows an error when settings cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createCitySettingsFetchMock({ getStatus: 500 }))
    );

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(
      await screen.findByText(
        'לא הצלחנו לטעון את הגדרות העיר. נסו שוב מאוחר יותר.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('city-settings-form')).not.toBeInTheDocument();
  });

  it('links the settings page from coordinator home', async () => {
    vi.stubGlobal('fetch', vi.fn(createCitySettingsFetchMock()));

    renderApp('/');
    expect(await screen.findByTestId('view-settings')).toBeInTheDocument();
  });

  it('hides the settings link from volunteers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createCitySettingsFetchMock({
          user: volunteerUser(),
        })
      )
    );

    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('view-settings')).not.toBeInTheDocument();
  });

  it('lets a super admin open settings without a city membership', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createCitySettingsFetchMock({
          user: superAdminUser(),
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(await screen.findByTestId('city-settings-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/כתובת מרכז החלוקה/)).toHaveValue(
      holonCitySettings.centerAddress
    );
  });

  it('blocks a volunteer who opens the settings URL', async () => {
    const fetchMock = vi.fn(
      createCitySettingsFetchMock({
        user: volunteerUser(),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(
      await screen.findByText(
        'לא הצלחנו לטעון את הגדרות העיר. נסו שוב מאוחר יותר.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('city-settings-form')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(`/api/cities/${CITY_A_ID}/settings`)
      )
    ).toBe(false);
    expect(screen.queryByTestId('city-join-links')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(`/api/cities/${CITY_A_ID}/join-links`)
      )
    ).toBe(false);
  });

  it('shows a previously revealed Holon volunteer URL without regenerating', async () => {
    const volunteerStatus = holonJoinLinks.links.find(
      (link) => link.role === 'volunteer'
    );
    writeRevealedJoinLink(CITY_A_ID, 'volunteer', {
      url: holonVolunteerJoinLinkCreated.url,
      createdAt: volunteerStatus?.createdAt ?? '2026-10-01T09:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(createCitySettingsFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(await screen.findByTestId('join-link-url-volunteer')).toHaveValue(
      holonVolunteerJoinLinkCreated.url
    );
  });

  it('hides a remembered Holon URL when another coordinator regenerated it', async () => {
    writeRevealedJoinLink(CITY_A_ID, 'volunteer', {
      url: holonVolunteerJoinLinkCreated.url,
      createdAt: holonVolunteerJoinLinkCreated.createdAt,
    });
    vi.stubGlobal('fetch', vi.fn(createCitySettingsFetchMock()));

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(await screen.findByTestId('join-link-volunteer')).toHaveTextContent(
      'יש קישור הצטרפות קבוע פעיל.'
    );
    expect(
      screen.queryByTestId('join-link-url-volunteer')
    ).not.toBeInTheDocument();
    expect(readRevealedJoinLink(CITY_A_ID, 'volunteer')).toBeNull();
    expect(
      window.localStorage.getItem(joinLinkStorageKey(CITY_A_ID, 'volunteer'))
    ).toBeNull();
  });

  it('cancels regenerate without calling the API', async () => {
    const fetchMock = vi.fn(createCitySettingsFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);
    await screen.findByTestId('join-link-volunteer');
    await user.click(screen.getByTestId('regenerate-join-link-volunteer'));
    await user.click(
      screen.getByTestId('cancel-regenerate-join-link-volunteer')
    );

    expect(
      screen.getByTestId('regenerate-join-link-volunteer')
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes('/join-links/volunteer/regenerate') &&
          call[1]?.method === 'POST'
      )
    ).toBe(false);
  });

  it('shows Holon join-link status and copies after confirmed regenerate', async () => {
    const copySpy = vi.spyOn(cityJoinLinks, 'copyText').mockResolvedValue(true);
    const fetchMock = vi.fn(createCitySettingsFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);

    const volunteerCard = await screen.findByTestId('join-link-volunteer');
    expect(volunteerCard).toHaveTextContent('יש קישור הצטרפות קבוע פעיל.');
    expect(volunteerCard).toHaveTextContent('2 הצטרפויות דרך הקישור');
    expect(
      screen.queryByTestId('join-link-url-volunteer')
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('regenerate-join-link-volunteer'));
    expect(
      screen.getByText('לחדש את קישור ההצטרפות? הקישור הנוכחי יפסיק לעבוד.')
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes('/join-links/volunteer/regenerate') &&
          call[1]?.method === 'POST'
      )
    ).toBe(false);

    await user.click(
      screen.getByTestId('confirm-regenerate-join-link-volunteer')
    );
    expect(await screen.findByTestId('join-link-url-volunteer')).toHaveValue(
      holonVolunteerJoinLinkCreated.url
    );

    await user.click(screen.getByTestId('copy-join-link-volunteer'));
    await waitFor(() => {
      expect(copySpy).toHaveBeenCalledWith(holonVolunteerJoinLinkCreated.url);
    });
    expect(
      screen.getByTestId('join-link-copied-volunteer')
    ).toBeInTheDocument();
  });

  it('creates a coordinator join link without a confirm step', async () => {
    const fetchMock = vi.fn(createCitySettingsFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);
    await screen.findByTestId('join-link-coordinator');
    await user.click(screen.getByTestId('create-join-link-coordinator'));

    expect(await screen.findByTestId('join-link-url-coordinator')).toHaveValue(
      'http://localhost:3000/join/fake-holon-coordinator-token'
    );
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes('/join-links/coordinator/regenerate') &&
          call[1]?.method === 'POST'
      )
    ).toBe(true);
  });

  it('shows an error when join links cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createCitySettingsFetchMock({ joinLinksStatus: 500 }))
    );

    renderApp(`/cities/${CITY_A_ID}/settings`);

    expect(
      await screen.findByTestId('city-join-links-error')
    ).toBeInTheDocument();
    expect(await screen.findByTestId('city-settings-form')).toBeInTheDocument();
  });

  it('shows an error when regenerate fails after confirm', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createCitySettingsFetchMock({ regenerateStatus: 500 }))
    );
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/settings`);
    await screen.findByTestId('join-link-volunteer');
    await user.click(screen.getByTestId('regenerate-join-link-volunteer'));
    await user.click(
      screen.getByTestId('confirm-regenerate-join-link-volunteer')
    );

    expect(
      await screen.findByTestId('join-link-regenerate-error-volunteer')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('join-link-url-volunteer')
    ).not.toBeInTheDocument();
  });
});
