import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import type { User, CityMembership } from '@prisma/client';

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'
  | 'approve'
  | 'reject'
  | 'publish'
  | 'close'
  | 'reassign'
  | 'view_pii';

export type Subject =
  | 'City'
  | 'CitySettings'
  | 'CityInvite'
  | 'CityMembership'
  | 'User'
  | 'Elder'
  | 'ElderContact'
  | 'ElderChangeRequest'
  | 'Match'
  | 'DistributionDay'
  | 'DayParticipation'
  | 'Delivery'
  | 'MessageTemplate'
  | 'PushSubscription'
  | 'NotificationLog'
  | 'AuditLog'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subject]>;

export interface UserWithMemberships extends User {
  memberships: CityMembership[];
}

@Injectable()
export class AbilityFactory {
  createForUser(user: UserWithMemberships): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    const coordinatorCities = user.memberships
      .filter((m) => m.role === 'coordinator' && m.status === 'active')
      .map((m) => m.cityId);

    const volunteerCities = user.memberships
      .filter((m) => m.role === 'volunteer' && m.status === 'active')
      .map((m) => m.cityId);

    if (user.isSuperAdmin) {
      can('manage', 'all');
      return build();
    }

    can('read', 'User', { id: user.id } as never);
    can('update', 'User', { id: user.id } as never);
    can('manage', 'PushSubscription', { userId: user.id } as never);

    if (coordinatorCities.length > 0) {
      can('read', 'City', { id: { $in: coordinatorCities } } as never);
      can('read', 'CitySettings', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('update', 'CitySettings', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('create', 'CityInvite', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('read', 'CityInvite', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('update', 'CityInvite', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('delete', 'CityInvite', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('approve', 'CityMembership', {
        cityId: { $in: coordinatorCities },
        role: 'volunteer',
      } as never);
      can('approve', 'CityMembership', {
        cityId: { $in: coordinatorCities },
        role: 'coordinator',
      } as never);
      can('update', 'CityMembership', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('delete', 'CityMembership', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('read', 'User', {
        'memberships.cityId': { $in: coordinatorCities },
      } as never);

      can('manage', 'Elder', { cityId: { $in: coordinatorCities } } as never);
      can('manage', 'ElderContact', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('view_pii', 'Elder', { cityId: { $in: coordinatorCities } } as never);

      can('approve', 'ElderChangeRequest', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('reject', 'ElderChangeRequest', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('manage', 'Match', { cityId: { $in: coordinatorCities } } as never);

      can('manage', 'DistributionDay', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('publish', 'DistributionDay', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('close', 'DistributionDay', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('read', 'DayParticipation', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('update', 'DayParticipation', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('manage', 'Delivery', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('reassign', 'Delivery', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('manage', 'MessageTemplate', {
        cityId: { $in: coordinatorCities },
      } as never);

      can('read', 'NotificationLog', {
        cityId: { $in: coordinatorCities },
      } as never);
      can('read', 'AuditLog', { cityId: { $in: coordinatorCities } } as never);
    }

    if (volunteerCities.length > 0) {
      can('read', 'City', { id: { $in: volunteerCities } } as never);

      can('read', 'CityMembership', {
        userId: user.id,
        cityId: { $in: volunteerCities },
      } as never);

      can('read', 'Elder', {
        cityId: { $in: volunteerCities },
        'deliveries.volunteerId': user.id,
        'deliveries.day.status': { $in: ['published', 'in_progress'] },
      } as never);

      can('view_pii', 'Elder', {
        cityId: { $in: volunteerCities },
        'deliveries.volunteerId': user.id,
        'deliveries.day.status': { $in: ['published', 'in_progress'] },
      } as never);

      can('read', 'ElderContact', {
        cityId: { $in: volunteerCities },
        'elder.deliveries.volunteerId': user.id,
        'elder.deliveries.day.status': { $in: ['published', 'in_progress'] },
      } as never);

      can('create', 'ElderChangeRequest', {
        cityId: { $in: volunteerCities },
        'elder.deliveries.volunteerId': user.id,
      } as never);
      can('read', 'ElderChangeRequest', {
        requestedById: user.id,
      } as never);

      can('read', 'Match', { volunteerId: user.id } as never);

      can('read', 'DistributionDay', {
        cityId: { $in: volunteerCities },
        status: { $in: ['published', 'in_progress'] },
      } as never);

      can('create', 'DayParticipation', {
        volunteerId: user.id,
        cityId: { $in: volunteerCities },
      } as never);
      can('update', 'DayParticipation', {
        volunteerId: user.id,
      } as never);

      can('read', 'Delivery', { volunteerId: user.id } as never);
      can('update', 'Delivery', {
        volunteerId: user.id,
        status: { $in: ['picked', 'delivered', 'not_delivered'] },
      } as never);
    }

    return build();
  }
}
