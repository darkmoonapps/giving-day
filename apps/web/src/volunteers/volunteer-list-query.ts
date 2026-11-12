import type { ListCityVolunteersQuery } from '@giving-day/shared';

export type VolunteerMembershipFilter = 'all' | 'pending' | 'active' | 'paused';

export type VolunteerDayResponseFilter =
  'all' | 'confirmed' | 'declined' | 'no_response';

export interface VolunteerListFilters {
  status: VolunteerMembershipFilter;
  search: string;
  dayId: string;
  dayResponse: VolunteerDayResponseFilter;
}

export const EMPTY_VOLUNTEER_LIST_FILTERS: VolunteerListFilters = {
  status: 'all',
  search: '',
  dayId: '',
  dayResponse: 'all',
};

export function volunteerListParams(
  filters: VolunteerListFilters
): ListCityVolunteersQuery {
  const params: ListCityVolunteersQuery = {};

  if (filters.status !== 'all') {
    params.status = filters.status;
  }

  const search = filters.search.trim();
  if (search.length > 0) {
    params.search = search;
  }

  if (filters.dayId.length > 0) {
    params.dayId = filters.dayId;
    if (filters.dayResponse !== 'all') {
      params.dayResponse = filters.dayResponse;
    }
  }

  return params;
}

export function hasActiveVolunteerFilters(
  filters: VolunteerListFilters
): boolean {
  return (
    filters.status !== EMPTY_VOLUNTEER_LIST_FILTERS.status ||
    filters.search.trim().length > 0 ||
    filters.dayId.length > 0 ||
    (filters.dayId.length > 0 &&
      filters.dayResponse !== EMPTY_VOLUNTEER_LIST_FILTERS.dayResponse)
  );
}

export function volunteerDisplayName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
): string {
  const name = [firstName, lastName]
    .filter((part): part is string => part !== null && part.trim().length > 0)
    .join(' ')
    .trim();
  return name.length > 0 ? name : fallback;
}
