import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  createCityFetchMock,
  EXAMPLE_CITY_ID,
} from '../test/create-city-fixtures';
import {
  coordinatorUser,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

describe('CreateCityPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lets a super admin create a city and opens its settings', async () => {
    const fetchMock = vi.fn(createCityFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });

    renderApp('/');
    await user.click(await screen.findByTestId('create-city'));
    expect(await screen.findByTestId('create-city-form')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/שם בעברית/), 'עיר דוגמה');
    await user.type(screen.getByLabelText(/שם באנגלית/), 'Example City');
    await user.type(screen.getByLabelText(/מזהה כתובת/), 'Example-City');
    await user.click(screen.getByTestId('create-city-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('city-settings-page')).toBeInTheDocument();
    });
    expect(await screen.findByTestId('city-settings-form')).toBeInTheDocument();

    const createCall = fetchMock.mock.calls.find(
      (call) =>
        /\/api\/cities\/?$/.test(String(call[0]).replace(/\?.*$/, '')) &&
        call[1]?.method === 'POST'
    );
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      slug: 'example-city',
      nameHe: 'עיר דוגמה',
      nameEn: 'Example City',
    });
    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(`/api/cities/${EXAMPLE_CITY_ID}/settings`)
      )
    ).toBe(true);
  });

  it('shows a dedicated too-long slug message', async () => {
    vi.stubGlobal('fetch', vi.fn(createCityFetchMock()));
    const user = userEvent.setup({ delay: null });

    renderApp('/admin/cities/new');
    await screen.findByTestId('create-city-form');
    await user.type(screen.getByLabelText(/שם בעברית/), 'חולון');
    await user.type(screen.getByLabelText(/שם באנגלית/), 'Holon');
    await user.click(screen.getByLabelText(/מזהה כתובת/));
    await user.paste('a'.repeat(65));
    await user.click(screen.getByTestId('create-city-submit'));

    expect(screen.getByText('השתמשו בעד 64 תווים')).toBeInTheDocument();
  });

  it('shows a duplicate-slug error without leaving the form', async () => {
    const fetchMock = vi.fn(
      createCityFetchMock({
        createStatus: 409,
        createCode: 'cities.duplicate_slug',
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });

    renderApp('/admin/cities/new');
    await screen.findByTestId('create-city-form');
    await user.type(screen.getByLabelText(/שם בעברית/), 'חולון');
    await user.type(screen.getByLabelText(/שם באנגלית/), 'Holon');
    await user.type(screen.getByLabelText(/מזהה כתובת/), 'holon');
    await user.click(screen.getByTestId('create-city-submit'));

    expect(await screen.findByTestId('create-city-error')).toHaveTextContent(
      'המזהה הזה כבר בשימוש.'
    );
    expect(screen.getByTestId('create-city-form')).toBeInTheDocument();
  });

  it('hides the create-city entry from coordinators', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createCityFetchMock({ user: coordinatorUser() }))
    );

    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('create-city')).not.toBeInTheDocument();
  });

  it('blocks a volunteer who opens the create-city URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(createCityFetchMock({ user: volunteerUser() }))
    );

    renderApp('/admin/cities/new');
    expect(await screen.findByTestId('create-city-page')).toBeInTheDocument();
    expect(screen.getByText('רק מנהל־על יכול ליצור עיר.')).toBeInTheDocument();
    expect(screen.queryByTestId('create-city-form')).not.toBeInTheDocument();
  });
});
