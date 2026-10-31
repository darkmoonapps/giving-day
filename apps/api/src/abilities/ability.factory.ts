import { AbilityBuilder, PureAbility } from '@casl/ability';
import { PrismaQuery, Subjects, createPrismaAbility } from '@casl/prisma';
import { Injectable } from '@nestjs/common';
import type {
  User,
  CityMembership,
  City,
  CitySettings,
  CityInvite,
  Elder,
  ElderContact,
  ElderChangeRequest,
  Match,
  DistributionDay,
  DayParticipation,
  Delivery,
  MessageTemplate,
  PushSubscription,
  NotificationLog,
  AuditLog,
} from '@prisma/client';

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

export type AppSubjects =
  | Subjects<{
      User: User;
      City: City;
      CitySettings: CitySettings;
      CityInvite: CityInvite;
      CityMembership: CityMembership;
      Elder: Elder;
      ElderContact: ElderContact;
      ElderChangeRequest: ElderChangeRequest;
      Match: Match;
      DistributionDay: DistributionDay;
      DayParticipation: DayParticipation;
      Delivery: Delivery;
      MessageTemplate: MessageTemplate;
      PushSubscription: PushSubscription;
      NotificationLog: NotificationLog;
      AuditLog: AuditLog;
    }>
  | 'all';

export type AppAbility = PureAbility<[Action, AppSubjects], PrismaQuery>;

export interface UserWithMemberships extends User {
  memberships: CityMembership[];
}

@Injectable()
export class AbilityFactory {
  createForUser(user: UserWithMemberships): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

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
      can('read', 'City', { id: { in: coordinatorCities } });
      can('read', 'CitySettings', { cityId: { in: coordinatorCities } });
      can('update', 'CitySettings', { cityId: { in: coordinatorCities } });

      can('create', 'CityInvite', { cityId: { in: coordinatorCities } });
      can('read', 'CityInvite', { cityId: { in: coordinatorCities } });
      can('update', 'CityInvite', { cityId: { in: coordinatorCities } });
      can('delete', 'CityInvite', { cityId: { in: coordinatorCities } });

      can('read', 'CityMembership', { cityId: { in: coordinatorCities } });
      can('create', 'CityMembership', {
        cityId: { in: coordinatorCities },
        role: 'coordinator',
      });
      can('approve', 'CityMembership', { cityId: { in: coordinatorCities } });
      can('reject', 'CityMembership', { cityId: { in: coordinatorCities } });
      can('update', 'CityMembership', { cityId: { in: coordinatorCities } });
      can('delete', 'CityMembership', { cityId: { in: coordinatorCities } });

      can('manage', 'Elder', { cityId: { in: coordinatorCities } });
      can('manage', 'ElderContact', { cityId: { in: coordinatorCities } });
      can('view_pii', 'Elder', { cityId: { in: coordinatorCities } });

      can('approve', 'ElderChangeRequest', {
        cityId: { in: coordinatorCities },
      });
      can('reject', 'ElderChangeRequest', {
        cityId: { in: coordinatorCities },
      });

      can('manage', 'Match', { cityId: { in: coordinatorCities } });

      can('manage', 'DistributionDay', { cityId: { in: coordinatorCities } });
      can('publish', 'DistributionDay', { cityId: { in: coordinatorCities } });
      can('close', 'DistributionDay', { cityId: { in: coordinatorCities } });

      can('read', 'DayParticipation', { cityId: { in: coordinatorCities } });
      can('update', 'DayParticipation', { cityId: { in: coordinatorCities } });

      can('manage', 'Delivery', { cityId: { in: coordinatorCities } });
      can('reassign', 'Delivery', { cityId: { in: coordinatorCities } });

      can('manage', 'MessageTemplate', { cityId: { in: coordinatorCities } });

      can('read', 'NotificationLog', { cityId: { in: coordinatorCities } });
      can('read', 'AuditLog', { cityId: { in: coordinatorCities } });
    }

    if (volunteerCities.length > 0) {
      can('read', 'City', { id: { in: volunteerCities } });
      can('read', 'CityMembership', {
        userId: user.id,
        cityId: { in: volunteerCities },
      });

      can('read', 'Elder', { cityId: { in: volunteerCities } });
      can('view_pii', 'Elder', { cityId: { in: volunteerCities } });
      can('read', 'ElderContact', { cityId: { in: volunteerCities } });

      can('create', 'ElderChangeRequest', {
        cityId: { in: volunteerCities },
      });
      can('read', 'ElderChangeRequest', { requestedById: user.id });

      can('read', 'Match', { volunteerId: user.id });

      can('read', 'DistributionDay', { cityId: { in: volunteerCities } });

      can('create', 'DayParticipation', {
        cityId: { in: volunteerCities },
      });
      can('update', 'DayParticipation', {
        volunteerId: user.id,
        cityId: { in: volunteerCities },
      });

      can('read', 'Delivery', { cityId: { in: volunteerCities } });
      can('update', 'Delivery', { cityId: { in: volunteerCities } });
    }

    return build();
  }
}
