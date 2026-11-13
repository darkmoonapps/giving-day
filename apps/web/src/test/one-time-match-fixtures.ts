import {
  createAuthFetchMock,
  mockEmptyResponse,
  mockJsonResponse,
  type AuthFetchStub,
} from './auth-fixtures';
import {
  CITY_A_ID,
  DAY_ID,
  HOLON_NAVIGATION,
  coordinatorDeliveryRivkah,
  coordinatorDeliveryUnassigned,
  coordinatorUser,
  openDay,
} from './distribution-day-fixtures';
import {
  ELDER_RIVKAH_ID,
  ELDER_YOSEF_ID,
  VOLUNTEER_DANA_ID,
  VOLUNTEER_YONATAN_ID,
  unmatchedYosef,
  volunteerDana,
} from './match-fixtures';

export const ONE_TIME_MATCH_RIVKAH_ID = '16161616-1616-4161-8161-161616161616';
export const ONE_TIME_MATCH_YOSEF_ID = '17171717-1717-4171-8171-171717171717';

export const oneTimeMatchRivkah = {
  id: ONE_TIME_MATCH_RIVKAH_ID,
  cityId: CITY_A_ID,
  elderId: ELDER_RIVKAH_ID,
  volunteerId: VOLUNTEER_YONATAN_ID,
  type: 'one_time' as const,
  dayId: DAY_ID,
  startsAt: '2026-11-12',
  endsAt: null,
  endReason: null,
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-01T09:00:00.000Z',
  elder: {
    id: ELDER_RIVKAH_ID,
    fullName: 'Rivkah Levi',
    status: 'active' as const,
  },
  volunteer: {
    id: VOLUNTEER_YONATAN_ID,
    firstName: 'Yonatan',
    lastName: 'Bar',
  },
};

export type OneTimeMatchDeliveryRow = {
  id: string;
  cityId: string;
  dayId: string;
  status: 'unassigned' | 'assigned' | 'picked' | 'delivered' | 'not_delivered';
  volunteerId: string | null;
  matchId: string | null;
  assignedAt: string | null;
  volunteer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  elder: {
    id: string;
    fullName: string;
    street: string;
    houseNumber: string;
    entrance: string | null;
    floor: string | null;
    apartment: string | null;
    addressNotes: string | null;
    notes: string | null;
    contacts: unknown[];
  };
  note?: string | null;
  notDeliveredReason?: string | null;
  replacementSuggestions?: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    homeArea: string;
  }>;
};

export interface OneTimeMatchFetchStub extends AuthFetchStub {
  matches?: (typeof oneTimeMatchRivkah)[];
  availableElders?: (typeof unmatchedYosef)[];
  matchableVolunteers?: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
  }>;
  coordinatorDeliveries?: OneTimeMatchDeliveryRow[];
  createStatus?: number;
  createErrorCode?: string;
  endStatus?: number;
}

export function createOneTimeMatchFetchMock(
  options: OneTimeMatchFetchStub = {}
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  const authMock = createAuthFetchMock({
    refresh: options.refresh ?? 'ok',
    user: options.user ?? coordinatorUser(),
    logout: options.logout,
  });
  let matches = [...(options.matches ?? [oneTimeMatchRivkah])];
  let availableElders = [...(options.availableElders ?? [unmatchedYosef])];
  let coordinatorDeliveries: OneTimeMatchDeliveryRow[] = [
    ...(options.coordinatorDeliveries ?? [
      {
        ...coordinatorDeliveryRivkah,
        matchId: ONE_TIME_MATCH_RIVKAH_ID,
      },
      coordinatorDeliveryUnassigned,
    ]),
  ];

  return async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const oneTimeBase = `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/one-time-matches`;
    const deliveriesBase = `/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}/deliveries`;

    if (
      method === 'POST' &&
      url.includes(`${oneTimeBase}/`) &&
      url.includes('/end')
    ) {
      if (options.endStatus !== undefined && options.endStatus >= 400) {
        return mockEmptyResponse(options.endStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const endedMatch = matches.find((match) => url.includes(match.id));
      const ended = {
        ...(endedMatch ?? oneTimeMatchRivkah),
        endsAt: '2026-11-12',
        endReason:
          typeof body.endReason === 'string' ? body.endReason : 'reassigned',
      };
      matches = matches.filter((match) => match.id !== ended.id);
      availableElders = [...availableElders, ended.elder];
      coordinatorDeliveries = coordinatorDeliveries.map((delivery) =>
        delivery.matchId === ended.id || delivery.elder.id === ended.elderId
          ? {
              ...delivery,
              volunteerId: null,
              matchId: null,
              assignedAt: null,
              volunteer: null,
              status: 'unassigned' as const,
              replacementSuggestions:
                coordinatorDeliveryUnassigned.replacementSuggestions,
            }
          : delivery
      );
      return mockJsonResponse(ended);
    }

    if (method === 'POST' && url.includes(oneTimeBase)) {
      if (options.createStatus === 409) {
        return mockJsonResponse(
          { statusCode: 409, message: 'matches.elder_already_matched_for_day' },
          409
        );
      }
      if (
        options.createStatus !== undefined &&
        options.createStatus >= 400 &&
        options.createErrorCode !== undefined
      ) {
        return mockJsonResponse(
          {
            statusCode: options.createStatus,
            message: options.createErrorCode,
          },
          options.createStatus
        );
      }
      if (options.createStatus !== undefined && options.createStatus >= 400) {
        return mockEmptyResponse(options.createStatus);
      }
      const body =
        typeof init?.body === 'string'
          ? (JSON.parse(init.body) as Record<string, unknown>)
          : {};
      const nextVolunteerId =
        typeof body.volunteerId === 'string'
          ? body.volunteerId
          : VOLUNTEER_DANA_ID;
      const nextVolunteer =
        nextVolunteerId === VOLUNTEER_YONATAN_ID
          ? oneTimeMatchRivkah.volunteer
          : volunteerDana;
      const created = {
        ...oneTimeMatchRivkah,
        id: ONE_TIME_MATCH_YOSEF_ID,
        elderId: ELDER_YOSEF_ID,
        volunteerId: nextVolunteerId,
        elder: unmatchedYosef,
        volunteer: nextVolunteer,
      };
      matches = [...matches, created];
      availableElders = availableElders.filter(
        (elder) => elder.id !== ELDER_YOSEF_ID
      );
      coordinatorDeliveries = coordinatorDeliveries.map((delivery) =>
        delivery.elder.id === ELDER_YOSEF_ID
          ? {
              ...delivery,
              volunteerId: nextVolunteerId,
              matchId: created.id,
              assignedAt: '2026-11-12T09:00:00.000Z',
              volunteer: nextVolunteer,
              status: 'assigned' as const,
              replacementSuggestions: [],
            }
          : delivery
      );
      return mockJsonResponse(created, 201);
    }

    if (method === 'GET' && url.includes(oneTimeBase)) {
      return mockJsonResponse({
        matches,
        availableElders,
        matchableVolunteers: options.matchableVolunteers ?? [
          oneTimeMatchRivkah.volunteer,
          volunteerDana,
        ],
      });
    }

    if (method === 'GET' && url.includes(deliveriesBase)) {
      return mockJsonResponse({
        dayId: DAY_ID,
        cityId: CITY_A_ID,
        ...HOLON_NAVIGATION,
        unassignedCount: coordinatorDeliveries.filter(
          (delivery) => delivery.volunteerId === null
        ).length,
        assignableVolunteers: options.matchableVolunteers ?? [
          oneTimeMatchRivkah.volunteer,
          volunteerDana,
        ],
        deliveries: coordinatorDeliveries,
      });
    }

    if (
      method === 'GET' &&
      url.includes(`/api/cities/${CITY_A_ID}/distribution-days/${DAY_ID}`)
    ) {
      return mockJsonResponse({
        ...openDay,
        date: '2026-11-12',
      });
    }

    return authMock(input, init);
  };
}
