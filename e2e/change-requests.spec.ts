import { expect, test } from '@playwright/test';
import {
  stubAuthenticatedSession,
  stubDistributionDayApi,
  stubElderChangeRequestApi,
} from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const DAY_ID = '33333333-3333-4333-8333-333333333333';
const CHANGE_REQUEST_RIVKAH_ID = '21212121-2121-4212-8212-212121212121';
const CHANGE_REQUEST_YOSEF_ID = '23232323-2323-4232-8232-232323232323';

const rivkahElder = {
  id: '12121212-1212-4121-8121-121212121212',
  fullName: 'Rivkah Levi',
  street: '12 Example St',
  houseNumber: '12',
  entrance: 'B',
  floor: '3',
  apartment: '7',
  addressNotes: 'Knock loudly',
  notes: 'Entrance is around the back',
  contacts: [
    {
      name: 'Tamar Levi',
      relation: 'child' as const,
      phone: '+972506666666',
      isPrimary: true,
    },
  ],
};

test.describe('Elder change requests', () => {
  test('confirmed volunteer suggests a Holon address correction', async ({
    page,
  }) => {
    const created: Record<string, unknown>[] = [];

    await stubAuthenticatedSession(page, {
      onboarded: true,
      memberships: [
        {
          cityId: CITY_A_ID,
          role: 'volunteer',
          status: 'active',
        },
      ],
    });
    await stubDistributionDayApi(page, {
      myParticipation: {
        id: '44444444-4444-4444-8444-444444444444',
        cityId: CITY_A_ID,
        dayId: DAY_ID,
        volunteerId: '11111111-1111-4111-8111-111111111111',
        status: 'confirmed',
        respondedAt: '2026-10-29T10:00:00.000Z',
        cancelReason: null,
      },
      volunteerDeliveries: [
        {
          id: '16161616-1616-4161-8161-161616161616',
          cityId: CITY_A_ID,
          dayId: DAY_ID,
          status: 'assigned',
          elder: rivkahElder,
        },
      ],
    });
    await stubElderChangeRequestApi(page, {
      onCreate: (body) => {
        created.push(body);
        return {
          id: CHANGE_REQUEST_RIVKAH_ID,
          cityId: CITY_A_ID,
          elderId: rivkahElder.id,
          requestedById: '11111111-1111-4111-8111-111111111111',
          changes: body.changes,
          reason: body.reason ?? null,
          status: 'pending',
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: '2026-10-31T09:00:00.000Z',
          updatedAt: '2026-10-31T09:00:00.000Z',
          elder: {
            ...rivkahElder,
            contacts: rivkahElder.contacts.map((contact) => ({
              id: '14141414-1414-4141-8141-141414141414',
              ...contact,
            })),
          },
          requestedBy: {
            id: '11111111-1111-4111-8111-111111111111',
            firstName: 'Noa',
            lastName: 'Cohen',
          },
        };
      },
    });

    await page.goto(`/cities/${CITY_A_ID}/days/${DAY_ID}/deliveries`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('volunteer-deliveries-page')).toBeVisible();
    const card = page.getByTestId('volunteer-delivery-card');
    await expect(card.getByText('Rivkah Levi')).toBeVisible();
    await expect(card.getByText('12 Example St 12')).toBeVisible();
    await expect(page.getByTestId('elder-next-of-kin')).toBeVisible();

    await page.getByTestId('suggest-correction').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('change-request-street').fill('18 Weizmann St');
    await page.getByTestId('change-request-reason').fill('Moved within Holon');
    await page.getByTestId('change-request-submit').click();

    await expect
      .poll(() => created)
      .toEqual([
        {
          elderId: rivkahElder.id,
          changes: { street: '18 Weizmann St' },
          reason: 'Moved within Holon',
        },
      ]);
    await expect(page.getByTestId('change-request-pending')).toBeVisible();
  });

  test('coordinator approves and rejects pending Holon change requests', async ({
    page,
  }) => {
    const approved: string[] = [];
    const rejected: Array<{ id: string; body: Record<string, unknown> }> = [];

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
    await stubElderChangeRequestApi(page, {
      changeRequests: [
        {
          id: CHANGE_REQUEST_RIVKAH_ID,
          cityId: CITY_A_ID,
          elderId: rivkahElder.id,
          requestedById: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          changes: {
            street: { from: '12 Example St', to: '18 Weizmann St' },
            notes: {
              from: 'Entrance is around the back',
              to: 'Ring the Holon courtyard bell',
            },
          },
          reason: 'Moved within Holon',
          status: 'pending',
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: '2026-10-30T09:00:00.000Z',
          updatedAt: '2026-10-30T09:00:00.000Z',
          elder: {
            ...rivkahElder,
            contacts: rivkahElder.contacts.map((contact) => ({
              id: '14141414-1414-4141-8141-141414141414',
              ...contact,
            })),
          },
          requestedBy: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
        },
        {
          id: CHANGE_REQUEST_YOSEF_ID,
          cityId: CITY_A_ID,
          elderId: '13131313-1313-4131-8131-131313131313',
          requestedById: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          changes: {
            contacts: {
              from: [],
              to: [
                {
                  name: 'Dana Abraham',
                  relation: 'child',
                  phone: '+972507777777',
                  isPrimary: true,
                },
              ],
            },
          },
          reason: 'New Holon next of kin',
          status: 'pending',
          reviewedById: null,
          reviewedAt: null,
          reviewNote: null,
          createdAt: '2026-10-30T10:00:00.000Z',
          updatedAt: '2026-10-30T10:00:00.000Z',
          elder: {
            id: '13131313-1313-4131-8131-131313131313',
            fullName: 'Yosef Abraham',
            street: '4 Park Ave',
            houseNumber: '4',
            entrance: null,
            floor: null,
            apartment: null,
            addressNotes: null,
            notes: null,
            contacts: [],
          },
          requestedBy: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            firstName: 'Yonatan',
            lastName: 'Bar',
          },
        },
      ],
      onApprove: (requestId) => {
        approved.push(requestId);
      },
      onReject: (requestId, body) => {
        rejected.push({ id: requestId, body });
      },
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('view-change-requests').click();
    await expect(page).toHaveURL(`/cities/${CITY_A_ID}/change-requests`);
    await expect(
      page.getByTestId('coordinator-change-requests-page')
    ).toBeVisible();
    await expect(
      page.getByTestId(`change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`)
    ).toBeVisible();
    await expect(page.getByText('18 Weizmann St')).toBeVisible();
    await expect(
      page
        .getByTestId(`change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`)
        .getByText('Yonatan Bar')
    ).toBeVisible();

    await page
      .getByTestId(`approve-change-request-${CHANGE_REQUEST_RIVKAH_ID}`)
      .click();
    await expect.poll(() => approved).toEqual([CHANGE_REQUEST_RIVKAH_ID]);
    await expect(
      page.getByTestId(`change-request-card-${CHANGE_REQUEST_RIVKAH_ID}`)
    ).toHaveCount(0);

    await page
      .getByTestId(`change-request-review-note-${CHANGE_REQUEST_YOSEF_ID}`)
      .fill('Please call the Holon office first');
    await page
      .getByTestId(`reject-change-request-${CHANGE_REQUEST_YOSEF_ID}`)
      .click();
    await expect
      .poll(() => rejected)
      .toEqual([
        {
          id: CHANGE_REQUEST_YOSEF_ID,
          body: { reviewNote: 'Please call the Holon office first' },
        },
      ]);
    await expect(page.getByTestId('change-requests-empty')).toBeVisible();
  });
});
