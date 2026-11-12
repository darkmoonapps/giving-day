import { Prisma } from '@prisma/client';

/**
 * DayParticipation filter for volunteers who may be assigned on a distribution day:
 * confirmed for the day, not archived, with an active volunteer membership in the city.
 */
export function confirmedAssignableWhere(
  cityId: string,
  dayId: string,
  volunteerId?: string
): Prisma.DayParticipationWhereInput {
  return {
    cityId,
    dayId,
    status: 'confirmed',
    ...(volunteerId === undefined ? {} : { volunteerId }),
    volunteer: {
      archivedAt: null,
      memberships: {
        some: {
          cityId,
          role: 'volunteer',
          status: 'active',
        },
      },
    },
  };
}
