import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import { CITY_A_ID, volunteerUser } from '../test/distribution-day-fixtures';
import {
  ELDER_MIRIAM_ID,
  ELDER_RIVKAH_ID,
  ELDER_YOSEF_ID,
  createElderFetchMock,
  elderMiriamArchived,
  elderRivkah,
  elderYosefPaused,
} from '../test/elder-fixtures';
import { renderApp } from '../test/render';

describe('CoordinatorEldersPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lists active elders and creates one with notes and next of kin', async () => {
    const fetchMock = vi.fn(createElderFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });

    renderApp(`/cities/${CITY_A_ID}/elders`);

    expect(
      await screen.findByTestId('coordinator-elders-page')
    ).toBeInTheDocument();
    expect(await screen.findByText('Rivkah Levi')).toBeInTheDocument();
    expect(screen.queryByText('Yosef Abraham')).not.toBeInTheDocument();
    expect(await screen.findByTestId('elder-form')).toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: /שם מלא/ }),
      'Miriam Cohen'
    );
    await user.type(
      screen.getByRole('textbox', { name: /רחוב/ }),
      '8 Weizmann St'
    );
    await user.type(screen.getByRole('textbox', { name: /מספר בית/ }), '8');
    await user.type(
      screen.getByRole('textbox', { name: 'הערות' }),
      'Knock on the metal door'
    );
    await user.type(
      screen.getByRole('textbox', { name: /שם איש הקשר/ }),
      'Dana Cohen'
    );
    await user.type(
      screen.getByRole('textbox', { name: /טלפון איש הקשר/ }),
      '050-7777777'
    );
    await user.click(screen.getByTestId('elder-form-submit'));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        (call) =>
          /\/api\/cities\/[^/]+\/elders$/.test(String(call[0])) &&
          call[1]?.method === 'POST'
      );
      expect(createCall).toBeDefined();
      expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
        fullName: 'Miriam Cohen',
        street: '8 Weizmann St',
        houseNumber: '8',
        notes: 'Knock on the metal door',
        contacts: [
          {
            name: 'Dana Cohen',
            relation: 'child',
            phone: '+972507777777',
            isPrimary: true,
          },
        ],
      });
    });
  }, 15_000);

  it('edits notes and next of kin', async () => {
    const fetchMock = vi.fn(createElderFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });

    renderApp(`/cities/${CITY_A_ID}/elders`);
    await screen.findByTestId(`elder-row-${ELDER_RIVKAH_ID}`);
    await user.click(screen.getByTestId(`edit-elder-${ELDER_RIVKAH_ID}`));

    const notes = screen.getByLabelText('הערות', { exact: true });
    await user.clear(notes);
    await user.type(notes, 'Hard of hearing, knock loudly');
    const contactName = screen.getByLabelText('שם איש הקשר');
    await user.clear(contactName);
    await user.type(contactName, 'Yonatan Levi');
    await user.click(screen.getByTestId('elder-form-submit'));

    await waitFor(() => {
      const updateCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes(`/elders/${ELDER_RIVKAH_ID}`) &&
          call[1]?.method === 'PATCH'
      );
      expect(updateCall).toBeDefined();
      expect(JSON.parse(String(updateCall?.[1]?.body))).toMatchObject({
        notes: 'Hard of hearing, knock loudly',
        contacts: [
          {
            name: 'Yonatan Levi',
            relation: 'child',
            phone: '+972506666666',
            isPrimary: true,
          },
        ],
      });
    });
  }, 15_000);

  it('toggles inactive elders and reactivates a paused elder after confirm', async () => {
    const fetchMock = vi.fn(
      createElderFetchMock({
        elders: [elderRivkah, elderYosefPaused, elderMiriamArchived],
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/elders`);
    await screen.findByText('Rivkah Levi');
    expect(screen.queryByText('Yosef Abraham')).not.toBeInTheDocument();
    expect(screen.queryByText('Miriam Cohen')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('show-inactive-elders'));
    expect(await screen.findByText('Yosef Abraham')).toBeInTheDocument();
    expect(screen.getByText('Miriam Cohen')).toBeInTheDocument();
    expect(
      within(screen.getByTestId(`elder-row-${ELDER_MIRIAM_ID}`)).getByText(
        'מושבת/ת'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByTestId(`reactivate-elder-${ELDER_YOSEF_ID}`));
    expect(
      fetchMock.mock.calls.some(
        (call) =>
          String(call[0]).includes(`/elders/${ELDER_YOSEF_ID}`) &&
          call[1]?.method === 'PATCH'
      )
    ).toBe(false);

    await user.click(
      screen.getByTestId(`confirm-reactivate-elder-${ELDER_YOSEF_ID}`)
    );

    await waitFor(() => {
      const updateCall = fetchMock.mock.calls.find(
        (call) =>
          String(call[0]).includes(`/elders/${ELDER_YOSEF_ID}`) &&
          call[1]?.method === 'PATCH'
      );
      expect(updateCall).toBeDefined();
      expect(JSON.parse(String(updateCall?.[1]?.body))).toEqual({
        status: 'active',
      });
    });
  });

  it('deactivates an elder only after confirm', async () => {
    const fetchMock = vi.fn(createElderFetchMock());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp(`/cities/${CITY_A_ID}/elders`);
    const row = await screen.findByTestId(`elder-row-${ELDER_RIVKAH_ID}`);
    await user.click(screen.getByTestId(`deactivate-elder-${ELDER_RIVKAH_ID}`));

    expect(
      fetchMock.mock.calls.some((call) =>
        String(call[0]).includes(`/elders/${ELDER_RIVKAH_ID}/deactivate`)
      )
    ).toBe(false);
    expect(
      within(row).getByText('להשבית את המבוגר/ת? לא יקבלו יותר משלוחים.')
    ).toBeInTheDocument();

    await user.click(
      screen.getByTestId(`confirm-deactivate-elder-${ELDER_RIVKAH_ID}`)
    );

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes(`/elders/${ELDER_RIVKAH_ID}/deactivate`)
        )
      ).toBe(true);
    });
  });

  it('links the elders page from coordinator home', async () => {
    vi.stubGlobal('fetch', vi.fn(createElderFetchMock()));

    renderApp('/');
    expect(await screen.findByTestId('view-elders')).toBeInTheDocument();
  });

  it('hides the elders link from volunteers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createElderFetchMock({
          user: volunteerUser(),
        })
      )
    );

    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('view-elders')).not.toBeInTheDocument();
  });
});
