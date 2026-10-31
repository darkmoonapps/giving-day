import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const MEMBERSHIP_TAMAR_ID = '99999999-9999-4999-8999-999999999999';
const MEMBERSHIP_DANA_ID = '88888888-8888-4888-8888-888888888888';
const USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';
const USER_DANA_ID = '13131313-1313-4131-8131-131313131313';

interface PendingRow {
  membershipId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'volunteer' | 'coordinator';
  status: 'pending' | 'active' | 'removed';
  createdAt: string;
  approvedAt: string | null;
}

function pendingTamar(): PendingRow {
  return {
    membershipId: MEMBERSHIP_TAMAR_ID,
    userId: USER_TAMAR_ID,
    firstName: 'Tamar',
    lastName: 'Shalev',
    email: 'tamar.shalev@example.com',
    phone: '+972506666666',
    role: 'volunteer',
    status: 'pending',
    createdAt: '2026-10-28T09:00:00.000Z',
    approvedAt: null,
  };
}

function pendingDana(): PendingRow {
  return {
    membershipId: MEMBERSHIP_DANA_ID,
    userId: USER_DANA_ID,
    firstName: 'Dana',
    lastName: 'Cohen',
    email: 'dana.cohen@example.com',
    phone: '+972507777777',
    role: 'coordinator',
    status: 'pending',
    createdAt: '2026-10-29T11:30:00.000Z',
    approvedAt: null,
  };
}

test.describe('Coordinator join requests', () => {
  test('coordinator approves and rejects pending Holon join requests', async ({
    page,
  }) => {
    const approved: string[] = [];
    const rejected: string[] = [];
    let memberships: PendingRow[] = [pendingTamar(), pendingDana()];

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

    await page.route('**/api/cities/*/distribution-days', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ days: [] }),
      });
    });

    await page.route(
      (url) =>
        /\/api\/cities\/[^/]+\/memberships\/[^/]+\/approve\/?$/.test(
          url.pathname
        ),
      async (route) => {
        const match = /\/memberships\/([^/]+)\/approve/.exec(
          route.request().url()
        );
        const membershipId = match?.[1] ?? MEMBERSHIP_TAMAR_ID;
        approved.push(membershipId);
        const current =
          memberships.find((row) => row.membershipId === membershipId) ??
          pendingTamar();
        memberships = memberships.filter(
          (row) => row.membershipId !== membershipId
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...current,
            status: 'active',
            approvedAt: '2026-10-31T12:00:00.000Z',
          }),
        });
      }
    );

    await page.route(
      (url) =>
        /\/api\/cities\/[^/]+\/memberships\/[^/]+\/reject\/?$/.test(
          url.pathname
        ),
      async (route) => {
        const match = /\/memberships\/([^/]+)\/reject/.exec(
          route.request().url()
        );
        const membershipId = match?.[1] ?? MEMBERSHIP_DANA_ID;
        rejected.push(membershipId);
        const current =
          memberships.find((row) => row.membershipId === membershipId) ??
          pendingDana();
        memberships = memberships.filter(
          (row) => row.membershipId !== membershipId
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...current,
            status: 'removed',
            approvedAt: null,
          }),
        });
      }
    );

    await page.route(
      (url) =>
        /\/api\/cities\/[^/]+\/memberships\/pending\/?$/.test(url.pathname),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ memberships }),
        });
      }
    );

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-join-requests').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/join-requests`);
    await expect(
      page.getByTestId('coordinator-join-requests-page')
    ).toBeVisible();
    await expect(
      page.getByTestId(`join-request-row-${MEMBERSHIP_TAMAR_ID}`)
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Tamar Shalev' })
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: '+972506666666' })
    ).toBeVisible();
    await expect(
      page.getByTestId(`join-request-row-${MEMBERSHIP_DANA_ID}`)
    ).toBeVisible();

    await page.getByTestId(`approve-membership-${MEMBERSHIP_TAMAR_ID}`).click();
    await expect.poll(() => approved).toEqual([MEMBERSHIP_TAMAR_ID]);
    await expect(
      page.getByTestId(`join-request-row-${MEMBERSHIP_TAMAR_ID}`)
    ).toHaveCount(0);
    await expect(
      page.getByTestId(`join-request-row-${MEMBERSHIP_DANA_ID}`)
    ).toBeVisible();

    await page.getByTestId(`reject-membership-${MEMBERSHIP_DANA_ID}`).click();
    await expect.poll(() => rejected).toEqual([MEMBERSHIP_DANA_ID]);
    await expect(
      page.getByTestId(`join-request-row-${MEMBERSHIP_DANA_ID}`)
    ).toHaveCount(0);
    await expect(page.getByTestId('join-requests-empty')).toBeVisible();
  });
});
