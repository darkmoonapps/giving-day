import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  MongoQuery,
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

export type AppAbility = MongoAbility<[Action, Subject], MongoQuery>;

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

    can('read', 'User', { id: user.id });
    can('update', 'User', { id: user.id });
    can('manage', 'PushSubscription', { userId: user.id });

    if (coordinatorCities.length > 0) {
      can('read', 'City', { id: { $in: coordinatorCities } });
      can('read', 'CitySettings', { cityId: { $in: coordinatorCities } });
      can('update', 'CitySettings', { cityId: { $in: coordinatorCities } });

      can('create', 'CityInvite', { cityId: { $in: coordinatorCities } });
      can('read', 'CityInvite', { cityId: { $in: coordinatorCities } });
      can('update', 'CityInvite', { cityId: { $in: coordinatorCities } });
      can('delete', 'CityInvite', { cityId: { $in: coordinatorCities } });

      can('approve', 'CityMembership', {
        cityId: { $in: coordinatorCities },
        role: 'volunteer',
      });
      can('approve', 'CityMembership', {
        cityId: { $in: coordinatorCities },
        role: 'coordinator',
      });
      can('update', 'CityMembership', {
        cityId: { $in: coordinatorCities },
      });
      can('delete', 'CityMembership', {
        cityId: { $in: coordinatorCities },
      });

      can('read', 'User', {
        'memberships.cityId': { $in: coordinatorCities },
      });

      can('manage', 'Elder', { cityId: { $in: coordinatorCities } });
      can('manage', 'ElderContact', { cityId: { $in: coordinatorCities } });
      can('view_pii', 'Elder', { cityId: { $in: coordinatorCities } });

      can('approve', 'ElderChangeRequest', {
        cityId: { $in: coordinatorCities },
      });
      can('reject', 'ElderChangeRequest', {
        cityId: { $in: coordinatorCities },
      });

      can('manage', 'Match', { cityId: { $in: coordinatorCities } });

      can('manage', 'DistributionDay', { cityId: { $in: coordinatorCities } });
      can('publish', 'DistributionDay', { cityId: { $in: coordinatorCities } });
      can('close', 'DistributionDay', { cityId: { $in: coordinatorCities } });

      can('read', 'DayParticipation', { cityId: { $in: coordinatorCities } });
      can('update', 'DayParticipation', { cityId: { $in: coordinatorCities } });

      can('manage', 'Delivery', { cityId: { $in: coordinatorCities } });
      can('reassign', 'Delivery', { cityId: { $in: coordinatorCities } });

      can('manage', 'MessageTemplate', { cityId: { $in: coordinatorCities } });

      can('read', 'NotificationLog', { cityId: { $in: coordinatorCities } });
      can('read', 'AuditLog', { cityId: { $in: coordinatorCities } });
    }

    if (volunteerCities.length > 0) {
      can('read', 'City', { id: { $in: volunteerCities } });

      can('read', 'CityMembership', {
        userId: user.id,
        cityId: { $in: volunteerCities },
      });

      can('read', 'Elder', {
        cityId: { $in: volunteerCities },
        'deliveries.volunteerId': user.id,
        'deliveries.day.status': { $in: ['published', 'in_progress'] },
      });

      can('view_pii', 'Elder', {
        cityId: { $in: volunteerCities },
        'deliveries.volunteerId': user.id,
        'deliveries.day.status': { $in: ['published', 'in_progress'] },
      });

      can('read', 'ElderContact', {
        cityId: { $in: volunteerCities },
        'elder.deliveries.volunteerId': user.id,
        'elder.deliveries.day.status': { $in: ['published', 'in_progress'] },
      });

      can('create', 'ElderChangeRequest', {
        cityId: { $in: volunteerCities },
        'elder.deliveries.volunteerId': user.id,
      });
      can('read', 'ElderChangeRequest', {
        requestedById: user.id,
      });

      can('read', 'Match', { volunteerId: user.id });

      can('read', 'DistributionDay', {
        cityId: { $in: volunteerCities },
        status: { $in: ['published', 'in_progress'] },
      });

      can('create', 'DayParticipation', {
        volunteerId: user.id,
        cityId: { $in: volunteerCities },
      });
      can('update', 'DayParticipation', {
        volunteerId: user.id,
      });

      can('read', 'Delivery', { volunteerId: user.id });
      can('update', 'Delivery', {
        volunteerId: user.id,
        status: { $in: ['picked', 'delivered', 'not_delivered'] },
      });
    }

    return build();
  }
}
