import { describe, expect, it } from 'vitest';
import {
  AUDIT_LOG_PAGE_SIZE_DEFAULT,
  AUDIT_LOG_PAGE_SIZE_MAX,
  auditLogEntrySchema,
  cityAuditLogsResponseSchema,
  listCityAuditLogsQuerySchema,
} from './audit';

const HOLON_CITY_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';
const ENTRY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ENTITY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('listCityAuditLogsQuerySchema', () => {
  it('applies default page and pageSize', () => {
    expect(listCityAuditLogsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: AUDIT_LOG_PAGE_SIZE_DEFAULT,
    });
  });

  it('coerces string query params', () => {
    expect(
      listCityAuditLogsQuerySchema.parse({ page: '2', pageSize: '10' })
    ).toEqual({ page: 2, pageSize: 10 });
  });

  it('rejects pageSize above the free-tier max', () => {
    expect(
      listCityAuditLogsQuerySchema.safeParse({
        pageSize: AUDIT_LOG_PAGE_SIZE_MAX + 1,
      }).success
    ).toBe(false);
  });
});

describe('cityAuditLogsResponseSchema', () => {
  it('accepts a Holon coordinator audit page with id-only diff', () => {
    const entry = auditLogEntrySchema.parse({
      id: ENTRY_ID,
      cityId: HOLON_CITY_ID,
      actorId: ACTOR_ID,
      action: 'membership.approve',
      entity: 'membership',
      entityId: ENTITY_ID,
      diff: {
        userId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        role: 'volunteer',
      },
      at: '2026-11-13T09:00:00.000Z',
    });

    expect(
      cityAuditLogsResponseSchema.parse({
        entries: [entry],
        page: 1,
        pageSize: 20,
        total: 1,
      }).total
    ).toBe(1);
  });
});
