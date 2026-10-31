import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const MATCH_RIVKAH_ID = '15151515-1515-4151-8151-151515151515';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const VOLUNTEER_YONATAN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const VOLUNTEER_DANA_ID = '99999999-9999-4999-8999-999999999999';

test.describe('Coordinator permanent matches', () => {
  test('coordinator lists, creates, and ends a Holon match', async ({
    page,
  }) => {
    const created: Record<string, unknown>[] = [];
    const ended: Record<string, unknown>[] = [];

    await stubAuthenticatedSession(page, {
      onboarded: true,
      firstName: 'Noa',
      lastName: 'Levi',
      memberships: [
        {
          cityId: CITY_A_ID,
          role: 'coordinator',
          status: 'active',
        },
      ],
    });

    await page.route('**/api/cities/*/matches/**', async (route) => {
      const request = route.request();
      if (request.method() === 'POST' && request.url().includes('/end')) {
        const raw = request.postData();
        const body =
          raw === null || raw.length === 0
            ? {}
            : (JSON.parse(raw) as Record<string, unknown>);
        ended.push(body);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: MATCH_RIVKAH_ID,
            cityId: CITY_A_ID,
            elderId: ELDER_RIVKAH_ID,
            volunteerId: VOLUNTEER_YONATAN_ID,
            type: 'permanent',
            startsAt: '2026-10-01',
            endsAt: '2026-10-31',
            endReason: body.endReason ?? 'reassigned',
            createdAt: '2026-10-01T09:00:00.000Z',
            updatedAt: '2026-10-31T09:00:00.000Z',
            elder: {
              id: ELDER_RIVKAH_ID,
              fullName: 'Rivkah Levi',
              status: 'active',
            },
            volunteer: {
              id: VOLUNTEER_YONATAN_ID,
              firstName: 'Yonatan',
              lastName: 'Bar',
            },
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/cities/*/matches', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const raw = request.postData();
        const body =
          raw === null || raw.length === 0
            ? {}
            : (JSON.parse(raw) as Record<string, unknown>);
        created.push(body);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '16161616-1616-4161-8161-161616161616',
            cityId: CITY_A_ID,
            elderId: body.elderId,
            volunteerId: body.volunteerId,
            type: 'permanent',
            startsAt: '2026-10-31',
            endsAt: null,
            endReason: null,
            createdAt: '2026-10-31T09:00:00.000Z',
            updatedAt: '2026-10-31T09:00:00.000Z',
            elder: {
              id: ELDER_YOSEF_ID,
              fullName: 'Yosef Abraham',
              status: 'active',
            },
            volunteer: {
              id: VOLUNTEER_DANA_ID,
              firstName: 'Dana',
              lastName: 'Levi',
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: MATCH_RIVKAH_ID,
              cityId: CITY_A_ID,
              elderId: ELDER_RIVKAH_ID,
              volunteerId: VOLUNTEER_YONATAN_ID,
              type: 'permanent',
              startsAt: '2026-10-01',
              endsAt: null,
              endReason: null,
              createdAt: '2026-10-01T09:00:00.000Z',
              updatedAt: '2026-10-01T09:00:00.000Z',
              elder: {
                id: ELDER_RIVKAH_ID,
                fullName: 'Rivkah Levi',
                status: 'active',
              },
              volunteer: {
                id: VOLUNTEER_YONATAN_ID,
                firstName: 'Yonatan',
                lastName: 'Bar',
              },
            },
          ],
          unmatchedElders: [
            {
              id: ELDER_YOSEF_ID,
              fullName: 'Yosef Abraham',
              status: 'active',
            },
          ],
          matchableVolunteers: [
            {
              id: VOLUNTEER_YONATAN_ID,
              firstName: 'Yonatan',
              lastName: 'Bar',
            },
            {
              id: VOLUNTEER_DANA_ID,
              firstName: 'Dana',
              lastName: 'Levi',
            },
          ],
        }),
      });
    });

    await page.goto(`/cities/${CITY_A_ID}/matches`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('coordinator-matches-page')).toBeVisible();
    await expect(
      page.getByTestId(`match-row-${MATCH_RIVKAH_ID}`)
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rivkah Levi' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Yonatan Bar' })).toBeVisible();

    await page.getByLabel('בחירת מבוגר/ת').selectOption(ELDER_YOSEF_ID);
    await page.getByLabel('בחירת מתנדב/ת').selectOption(VOLUNTEER_DANA_ID);
    await page.getByTestId('create-match-submit').click();
    await expect
      .poll(() => created)
      .toEqual([{ elderId: ELDER_YOSEF_ID, volunteerId: VOLUNTEER_DANA_ID }]);

    await page
      .getByTestId(`match-row-${MATCH_RIVKAH_ID}`)
      .getByLabel('סיבת הסיום')
      .selectOption('reassigned');
    await page.getByTestId(`end-match-${MATCH_RIVKAH_ID}`).click();
    await expect.poll(() => ended).toEqual([{ endReason: 'reassigned' }]);
  });
});
