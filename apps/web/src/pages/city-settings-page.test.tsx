import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import {
  createCitySettingsFetchMock,
  holonCitySettings,
} from '../test/city-settings-fixtures';
import { renderApp } from '../test/render';

describe('CitySettingsPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
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
  });
});
