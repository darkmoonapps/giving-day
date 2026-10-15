# Roles, permissions, and authentication

This document defines Giving Day access control. It is **documentation
only**. Implementation (CASL, Prisma extension, RLS) will follow later.

Related:

- [Data model](./data-model.md)
- [ADR 0019: Multi-tenant city scoping](./adr/0019-multi-tenant-city-scoping.md)
- [ADR 0020: OAuth and join-link authentication](./adr/0020-oauth-join-link-auth.md)

## Roles

There are three product roles. City membership is per city; a global flag
marks super admins.

| Role                 | Where it lives                      | Purpose                                                    |
| -------------------- | ----------------------------------- | ---------------------------------------------------------- |
| **Volunteer**        | `CityMembership.role = volunteer`   | Confirm days, pick up and deliver assigned packages        |
| **City coordinator** | `CityMembership.role = coordinator` | Run one city's elders, volunteers, days, and reassignments |
| **Super admin**      | `User.isSuperAdmin = true`          | Create cities, manage all cities, set other super admins   |

The same user can be a coordinator in one city and a volunteer in another.
Permissions are always evaluated **per city**.

`MembershipStatus.pending` means the user used a join link but a coordinator
has not approved them yet. Pending members have no city permissions.

Elders are not users and have no login.

## Scope terms

| Term         | Meaning                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| **own**      | The signed-in user's own records                                                  |
| **assigned** | Elders or deliveries assigned to the volunteer for a published or in-progress day |
| **city**     | Cities where the user is an **active** coordinator                                |
| **all**      | Every city (super admin only)                                                     |

## Permission matrix

| Resource                      | Volunteer                                               | City coordinator                                                | Super admin                                    |
| ----------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| City                          | R own cities (name)                                     | R city                                                          | CRUD                                           |
| CitySettings                  | none                                                    | R/U city                                                        | R/U all                                        |
| CityInvite                    | none                                                    | CRUD city (volunteer or coordinator role)                       | all                                            |
| Membership: volunteer         | R own                                                   | approve, pause, remove (city)                                   | all                                            |
| Membership: coordinator       | none                                                    | add, approve, remove other coordinators (city)                  | all, including first coordinator of a new city |
| User profile                  | R/U own                                                 | R city members                                                  | R/U all; can set `isSuperAdmin`                |
| Elder: core, address, `notes` | R assigned                                              | CRUD city                                                       | all                                            |
| Elder: buildingCode, phone    | R assigned, from day publish until final status         | R/U city                                                        | all                                            |
| ElderContact                  | R assigned (name, relation, phone)                      | CRUD city                                                       | all                                            |
| ElderChangeRequest            | C assigned, R own                                       | approve or reject (city)                                        | all                                            |
| Match                         | R own                                                   | CRUD city                                                       | all                                            |
| DistributionDay               | R published days in own city (Flow 2 fields)            | CRUD, publish, close (city)                                     | all                                            |
| DayParticipation              | confirm, decline, cancel (own); optional `cancelReason` | R city (including `cancelReason`); mark `no_show` or `attended` | all                                            |
| Delivery                      | R own; set `picked`, `delivered`, `not_delivered`       | CRUD, reassign, override (city)                                 | all                                            |
| MessageTemplate               | none                                                    | CRUD city                                                       | CRUD global and all                            |
| PushSubscription              | CRUD own                                                | none                                                            | none                                           |
| NotificationLog, AuditLog     | none                                                    | R city                                                          | R all                                          |

### Rules

- A coordinator cannot remove or demote themselves if they are the city's
  last active coordinator.
- Volunteers never receive a list of elders. They see only assigned elders
  after they have confirmed, and never on the confirmation screen (Flow 2).
- Assigned volunteers see the elder's general `notes` and next-of-kin
  (`ElderContact`) so they can call if the elder does not answer.
- Building code and elder phone are time-boxed for volunteers. Each view is
  audited as `elder.view_pii`.
- Decline or cancel unassigns that volunteer's deliveries on the day. The
  volunteer may enter a `cancelReason`, which the coordinator can read. The
  coordinator reassigns. There is **no automatic reassignment**.
- Super admin is the only role that creates cities and the first coordinator
  invite for a new city. Coordinators can revoke and regenerate the
  permanent join link for each role.

## City scoping enforcement

Defense in depth. Details and rationale: [ADR 0019](./adr/0019-multi-tenant-city-scoping.md).

1. **API checks.** A NestJS guard loads the user and their **active**
   memberships. Each route declares the permission it needs (CASL), with
   conditions such as `{ cityId: { $in: coordinatorCities } }` or
   `{ volunteerId: me }`.
2. **Prisma extension.** Automatically adds a `cityId` filter on city-owned
   tables and refuses queries that omit one. Responses use a separate DTO
   per role so hidden fields are never sent.
3. **Database backstop.** Postgres row-level security on `Elder`,
   `ElderContact`, `Delivery`, `DayParticipation`, and `ElderChangeRequest`.
   Each request runs in a transaction that sets `app.city_ids` and
   `app.super` with `SET LOCAL`. The application's database role is not the
   table owner and cannot bypass RLS.
4. **Cross-city tests.** Requests for another city's data return **404**
   (not 403), so city identifiers are not confirmed to unauthorized callers.

## Authentication flow

Free, no SMS. Details: [ADR 0020](./adr/0020-oauth-join-link-auth.md).

1. **Sign in** with Google or Facebook. Apple is later (paid developer
   account). This creates or links a `User` and an `AuthIdentity`.
2. **Mandatory onboarding** when `onboardedAt` is null. The rest of the app
   is blocked until done. Required: `firstName`, `lastName`, `phone`
   (E.164), preferred `locale`. Optional: `birthDate`, `email`. There is
   no privacy-acceptance step. At the end: notification permission prompt
   and PWA install prompt (iOS: add-to-home-screen instructions).
3. **Join a city** via the city's permanent `CityInvite` for that role
   (typically shared on WhatsApp):
   - One **shareable** link per city and role. No 48-hour expiry and no
     `maxUses` by default.
   - A coordinator can **revoke** the current link and **regenerate** a
     new one.
   - The landing page has an **Install app** button (PWA install prompt;
     iOS add-to-home-screen instructions).
   - Opening a valid link after login creates a **pending** membership with
     the link's role.
   - A coordinator **must approve** (one tap). The user then gets a push
     (`membership_approved`).
   - Coordinator-role links still require approval, so a leaked link cannot
     grant access.
   - A user with no active membership sees a "waiting for approval" screen.
4. **New cities:** a super admin creates the city and the first coordinator
   invite.
5. **Sessions:** 15-minute access JWT plus a rotating refresh token in an
   `httpOnly`, `Secure`, `SameSite=Lax` cookie. Refresh lasts 90 days for
   volunteers and 14 days for coordinators. All sessions are revoked when a
   membership is removed.

## Out of scope for MVP auth

- SMS or WhatsApp login
- Apple Sign In
- Password accounts
- Self-serve city creation
- Automatic approval of join links
