import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import type { UserWithMemberships } from '../abilities/ability.factory';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { configureApp } from '../configure-app';
import { PrismaService } from '../prisma/prisma.service';
import {
  CITY_A_ID,
  CITY_B_ID,
  COORDINATOR_A_ID,
  coordinatorA,
  coordinatorB,
  superAdmin,
  volunteerA,
} from '../test/fake-users';

const ENTRY_NEWER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ENTRY_OLDER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const MEMBERSHIP_ID = '99999999-9999-4999-8999-999999999999';
const DELIVERY_ID = '16161616-1616-4161-8161-161616161616';
const USER_TAMAR_ID = '12121212-1212-4121-8121-121212121212';
const VOLUNTEER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('AuditLogs HTTP authorization', () => {
  let app: INestApplication;
  let currentUser: UserWithMemberships | null = null;

  const newerEntry = {
    id: ENTRY_NEWER_ID,
    cityId: CITY_A_ID,
    actorId: COORDINATOR_A_ID,
    action: 'membership.approve',
    entity: 'membership',
    entityId: MEMBERSHIP_ID,
    diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
    at: new Date('2026-11-13T10:00:00.000Z'),
  };

  const olderEntry = {
    id: ENTRY_OLDER_ID,
    cityId: CITY_A_ID,
    actorId: COORDINATOR_A_ID,
    action: 'delivery.assign',
    entity: 'delivery',
    entityId: DELIVERY_ID,
    diff: {
      dayId: '33333333-3333-4333-8333-333333333333',
      fromVolunteerId: null,
      toVolunteerId: VOLUNTEER_ID,
    },
    at: new Date('2026-11-13T09:00:00.000Z'),
  };

  const mockPrisma = {
    isConnected: vi.fn().mockResolvedValue(false),
    auditLog: {
      count: vi.fn().mockResolvedValue(2),
      findMany: vi.fn().mockResolvedValue([newerEntry, olderEntry]),
      create: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext): boolean => {
          if (!currentUser) {
            throw new UnauthorizedException('auth.unauthenticated');
          }
          context.switchToHttp().getRequest().user = currentUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    currentUser = null;
    vi.clearAllMocks();
    mockPrisma.auditLog.count.mockResolvedValue(2);
    mockPrisma.auditLog.findMany.mockResolvedValue([newerEntry, olderEntry]);
  });

  it('lists Holon audit logs newest first for a coordinator', async () => {
    currentUser = coordinatorA();

    const response = await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/audit-logs`)
      .expect(200);

    expect(response.body).toEqual({
      entries: [
        {
          id: ENTRY_NEWER_ID,
          cityId: CITY_A_ID,
          actorId: COORDINATOR_A_ID,
          action: 'membership.approve',
          entity: 'membership',
          entityId: MEMBERSHIP_ID,
          diff: { userId: USER_TAMAR_ID, role: 'volunteer' },
          at: '2026-11-13T10:00:00.000Z',
        },
        {
          id: ENTRY_OLDER_ID,
          cityId: CITY_A_ID,
          actorId: COORDINATOR_A_ID,
          action: 'delivery.assign',
          entity: 'delivery',
          entityId: DELIVERY_ID,
          diff: {
            dayId: '33333333-3333-4333-8333-333333333333',
            fromVolunteerId: null,
            toVolunteerId: VOLUNTEER_ID,
          },
          at: '2026-11-13T09:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    });
  });

  it('returns 404 for another city coordinator', async () => {
    currentUser = coordinatorB();

    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/audit-logs`)
      .expect(404);
  });

  it('returns 403 for a volunteer', async () => {
    currentUser = volunteerA();

    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/audit-logs`)
      .expect(403);
  });

  it('allows a super admin to read any city', async () => {
    currentUser = superAdmin();
    mockPrisma.auditLog.count.mockResolvedValue(0);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const response = await request(app.getHttpServer())
      .get(`/api/cities/${CITY_B_ID}/audit-logs?page=1&pageSize=10`)
      .expect(200);

    expect(response.body).toEqual({
      entries: [],
      page: 1,
      pageSize: 10,
      total: 0,
    });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/api/cities/${CITY_A_ID}/audit-logs`)
      .expect(401);
  });
});
