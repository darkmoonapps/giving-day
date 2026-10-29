import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { clearAccessToken } from '../auth/access-token';
import { i18n } from '../i18n';
import {
  CITY_A_ID,
  DAY_ID,
  coordinatorUser,
  createDayFetchMock,
} from '../test/distribution-day-fixtures';
import { renderApp } from '../test/render';

describe('CoordinatorDayResponsesPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        createDayFetchMock({
          refresh: 'ok',
          user: coordinatorUser(),
          responses: [
            {
              volunteerId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              firstName: 'Yonatan',
              lastName: 'Bar',
              responseStatus: 'confirmed',
              cancelReason: null,
              respondedAt: '2026-10-29T10:00:00.000Z',
            },
            {
              volunteerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
              firstName: 'Maya',
              lastName: 'Cohen',
              responseStatus: 'declined',
              cancelReason: 'Out of town',
              respondedAt: '2026-10-29T11:00:00.000Z',
            },
            {
              volunteerId: '99999999-9999-4999-8999-999999999999',
              firstName: 'Dana',
              lastName: 'Levi',
              responseStatus: 'no_response',
              cancelReason: null,
              respondedAt: null,
            },
          ],
        })
      )
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    clearAccessToken();
    await i18n.changeLanguage('he');
  });

  it('shows confirmed, declined with reason, and no-response rows', async () => {
    renderApp(`/cities/${CITY_A_ID}/days/${DAY_ID}/responses`);

    expect(
      await screen.findByTestId('coordinator-responses-page')
    ).toBeInTheDocument();
    expect(await screen.findByText('Yonatan Bar')).toBeInTheDocument();
    expect(screen.getByText('Maya Cohen')).toBeInTheDocument();
    expect(screen.getByText('Out of town')).toBeInTheDocument();
    expect(screen.getByText('Dana Levi')).toBeInTheDocument();
    expect(screen.getAllByText('אישר').length).toBeGreaterThan(0);
    expect(screen.getAllByText('סירוב').length).toBeGreaterThan(0);
    expect(screen.getAllByText('לא הגיב').length).toBeGreaterThan(0);
  });
});
