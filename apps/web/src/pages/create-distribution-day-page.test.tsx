import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  coordinatorUser,
  createDayFetchMock,
  superAdminUser,
  volunteerUser,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

describe('CreateDistributionDayPage', () => {
  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.clear();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('lets a coordinator create and publish a Holon day from home', async () => {
    const fetchMock = vi.fn(
      createDayFetchMock({
        refresh: 'ok',
        user: coordinatorUser(),
        listDays: [],
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });

    renderApp('/');
    await user.click(await screen.findByTestId('create-day'));
    expect(await screen.findByTestId('create-day-form')).toBeInTheDocument();
    expect(screen.getByTestId('create-day-center')).toHaveValue(
      '10 Warehouse Rd, Holon'
    );
    expect(screen.getByLabelText(/שעת התחלה/)).toHaveValue('09:00');
    expect(screen.getByLabelText(/שעת סיום/)).toHaveValue('14:00');

    fireEvent.change(screen.getByLabelText(/תאריך/), {
      target: { value: '2026-11-15' },
    });
    await user.type(
      screen.getByLabelText(/הערות למתנדבים/),
      'Bring a folding cart'
    );
    await user.type(
      screen.getByLabelText(/הערות פנימיות/),
      'Need extra rice bags'
    );
    await user.type(screen.getByLabelText(/תוספות/), 'holiday honey');
    await user.click(screen.getByTestId('create-day-continue'));

    expect(await screen.findByTestId('create-day-review')).toBeInTheDocument();
    expect(screen.getByTestId('create-day-review-center')).toHaveTextContent(
      '10 Warehouse Rd, Holon'
    );
    expect(screen.getByTestId('create-day-review-hours')).toHaveTextContent(
      '09:00 – 14:00'
    );
    expect(screen.getByText('Bring a folding cart')).toBeInTheDocument();
    expect(screen.getByText('Need extra rice bags')).toBeInTheDocument();
    expect(screen.getByText('holiday honey')).toBeInTheDocument();

    await user.click(screen.getByTestId('create-day-publish'));

    await waitFor(() => {
      expect(screen.getByTestId('home-page')).toBeInTheDocument();
    });
    expect(await screen.findByTestId('coordinator-day')).toBeInTheDocument();
    expect(screen.getByTestId('coordinator-day-date')).toHaveTextContent('15');

    const openCall = fetchMock.mock.calls.find(
      (call) =>
        /\/api\/cities\/[^/]+\/distribution-days$/.test(
          String(call[0]).replace(/\?.*$/, '')
        ) && call[1]?.method === 'POST'
    );
    expect(openCall).toBeDefined();
    expect(JSON.parse(String(openCall?.[1]?.body))).toEqual({
      date: '2026-11-15',
      startTime: '09:00',
      endTime: '14:00',
      notesForVolunteers: 'Bring a folding cart',
      internalNotes: 'Need extra rice bags',
      addOns: ['holiday honey'],
    });
  });

  it('shows validation errors without leaving the form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          listDays: [],
        })
      )
    );
    const user = userEvent.setup({ delay: null });

    renderApp(`/cities/${CITY_A_ID}/days/new`);
    await screen.findByTestId('create-day-form');
    await user.click(screen.getByTestId('create-day-continue'));

    expect(screen.getByText('שדה חובה')).toBeInTheDocument();
    expect(screen.getByTestId('create-day-form')).toBeInTheDocument();
    expect(screen.queryByTestId('create-day-review')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/תאריך/), {
      target: { value: '2026-11-15' },
    });
    fireEvent.change(screen.getByLabelText(/שעת התחלה/), {
      target: { value: '14:00' },
    });
    fireEvent.change(screen.getByLabelText(/שעת סיום/), {
      target: { value: '09:00' },
    });
    await user.click(screen.getByTestId('create-day-continue'));

    expect(
      screen.getByText('שעת הסיום חייבת להיות אחרי שעת ההתחלה')
    ).toBeInTheDocument();
    expect(screen.getByTestId('create-day-form')).toBeInTheDocument();
  });

  it('shows a duplicate-date error on the review step', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          listDays: [],
          openStatus: 409,
          openCode: 'distribution_days.duplicate_date',
        })
      )
    );
    const user = userEvent.setup({ delay: null });

    renderApp(`/cities/${CITY_A_ID}/days/new`);
    await screen.findByTestId('create-day-form');
    fireEvent.change(screen.getByLabelText(/תאריך/), {
      target: { value: '2026-11-15' },
    });
    await user.click(screen.getByTestId('create-day-continue'));
    await screen.findByTestId('create-day-review');
    await user.click(screen.getByTestId('create-day-publish'));

    expect(await screen.findByTestId('create-day-error')).toHaveTextContent(
      'כבר קיים יום חלוקה בתאריך הזה.'
    );
    expect(screen.getByTestId('create-day-review')).toBeInTheDocument();
  });

  it('hides the create-day entry from volunteers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: volunteerUser(),
          listDays: [],
        })
      )
    );

    renderApp('/');
    expect(await screen.findByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('create-day')).not.toBeInTheDocument();
  });

  it('blocks a volunteer who opens the create-day URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: volunteerUser(),
          listDays: [],
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/days/new`);
    expect(await screen.findByTestId('create-day-page')).toBeInTheDocument();
    expect(
      screen.getByText('רק רכזי העיר יכולים ליצור יום חלוקה.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('create-day-form')).not.toBeInTheDocument();
  });

  it('lets a super admin open the create-day form', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: superAdminUser(),
          listDays: [],
        })
      )
    );

    renderApp(`/cities/${CITY_A_ID}/days/new`);
    expect(await screen.findByTestId('create-day-form')).toBeInTheDocument();
    expect(screen.getByTestId('create-day-center')).toHaveValue(
      '10 Warehouse Rd, Holon'
    );
  });
});
