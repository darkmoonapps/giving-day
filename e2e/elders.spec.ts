import { expect, test } from '@playwright/test';
import { stubAuthenticatedSession } from './auth-stubs';

const CITY_A_ID = '11111111-1111-4111-8111-111111111111';
const ELDER_RIVKAH_ID = '12121212-1212-4121-8121-121212121212';
const ELDER_YOSEF_ID = '13131313-1313-4131-8131-131313131313';
const CONTACT_TAMAR_ID = '14141414-1414-4141-8141-141414141414';

test.describe('Coordinator elders', () => {
  test('coordinator lists, creates, and deactivates a Holon elder', async ({
    page,
  }) => {
    const created: Record<string, unknown>[] = [];
    const deactivated: string[] = [];

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

    await page.route(
      (url) =>
        /\/api\/cities\/[^/]+\/elders\/[^/]+\/deactivate\/?$/.test(
          url.pathname
        ),
      async (route) => {
        deactivated.push(ELDER_RIVKAH_ID);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: ELDER_RIVKAH_ID,
            cityId: CITY_A_ID,
            fullName: 'Rivkah Levi',
            phone: '+972500000010',
            phoneAlt: null,
            language: 'he',
            street: '12 Example St',
            houseNumber: '12',
            entrance: 'B',
            floor: '3',
            apartment: '7',
            buildingCode: '1234',
            addressNotes: 'Knock loudly',
            lat: null,
            lng: null,
            geocodeStatus: 'pending',
            status: 'removed',
            statusReason: null,
            notes: 'Entrance is around the back',
            archivedAt: '2026-10-31T09:00:00.000Z',
            createdAt: '2026-10-01T09:00:00.000Z',
            updatedAt: '2026-10-31T09:00:00.000Z',
            contacts: [
              {
                id: CONTACT_TAMAR_ID,
                name: 'Tamar Levi',
                relation: 'child',
                phone: '+972506666666',
                isPrimary: true,
              },
            ],
          }),
        });
      }
    );

    await page.route(
      (url) => {
        return /\/api\/cities\/[^/]+\/elders\/?$/.test(url.pathname);
      },
      async (route) => {
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
              id: ELDER_YOSEF_ID,
              cityId: CITY_A_ID,
              fullName: body.fullName ?? 'Yosef Abraham',
              phone: body.phone ?? null,
              phoneAlt: null,
              language: 'he',
              street: body.street ?? '4 Park Ave',
              houseNumber: body.houseNumber ?? '4',
              entrance: null,
              floor: null,
              apartment: null,
              buildingCode: null,
              addressNotes: null,
              lat: null,
              lng: null,
              geocodeStatus: 'pending',
              status: 'active',
              statusReason: null,
              notes: body.notes ?? null,
              archivedAt: null,
              createdAt: '2026-10-31T09:00:00.000Z',
              updatedAt: '2026-10-31T09:00:00.000Z',
              contacts: body.contacts ?? [],
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            elders: [
              {
                id: ELDER_RIVKAH_ID,
                cityId: CITY_A_ID,
                fullName: 'Rivkah Levi',
                phone: '+972500000010',
                phoneAlt: null,
                language: 'he',
                street: '12 Example St',
                houseNumber: '12',
                entrance: 'B',
                floor: '3',
                apartment: '7',
                buildingCode: '1234',
                addressNotes: 'Knock loudly',
                lat: null,
                lng: null,
                geocodeStatus: 'pending',
                status: 'active',
                statusReason: null,
                notes: 'Entrance is around the back',
                archivedAt: null,
                createdAt: '2026-10-01T09:00:00.000Z',
                updatedAt: '2026-10-01T09:00:00.000Z',
                contacts: [
                  {
                    id: CONTACT_TAMAR_ID,
                    name: 'Tamar Levi',
                    relation: 'child',
                    phone: '+972506666666',
                    isPrimary: true,
                  },
                ],
              },
            ],
          }),
        });
      }
    );

    await page.goto(`/cities/${CITY_A_ID}/elders`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('coordinator-elders-page')).toBeVisible();
    await expect(
      page.getByTestId(`elder-row-${ELDER_RIVKAH_ID}`)
    ).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rivkah Levi' })).toBeVisible();

    await page.getByLabel('שם מלא').fill('Yosef Abraham');
    await page.getByLabel('רחוב').fill('4 Park Ave');
    await page.getByLabel('מספר בית').fill('4');
    await page
      .getByLabel('הערות', { exact: true })
      .fill('Entrance is on the side');
    await page.getByLabel('שם איש הקשר').fill('Dana Abraham');
    await page.getByLabel('טלפון איש הקשר').fill('050-7777777');
    await page.getByTestId('elder-form-submit').click();
    await expect
      .poll(() => created)
      .toMatchObject([
        {
          fullName: 'Yosef Abraham',
          street: '4 Park Ave',
          houseNumber: '4',
          notes: 'Entrance is on the side',
          contacts: [
            {
              name: 'Dana Abraham',
              relation: 'child',
              phone: '+972507777777',
              isPrimary: true,
            },
          ],
        },
      ]);

    await page.getByTestId(`deactivate-elder-${ELDER_RIVKAH_ID}`).click();
    await expect(deactivated).toEqual([]);
    await page
      .getByTestId(`confirm-deactivate-elder-${ELDER_RIVKAH_ID}`)
      .click();
    await expect.poll(() => deactivated).toEqual([ELDER_RIVKAH_ID]);
  });
});
