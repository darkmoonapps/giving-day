# ADR 0019: Multi-tenant city scoping

**Status**: Accepted

**Date**: 2026-10-15

## Context

Giving Day started as a single-city coordinator workflow (~140 elders,
~100 volunteers). The product now serves **multiple cities** under one
organization (Latet). Each city has its own elders, volunteers,
settings, and distribution days. The same person may be a coordinator in
one city and a volunteer in another.

A leak of one city's elder list, building codes, or next-of-kin contacts
into another city is a privacy failure. Application-only filters are not
enough if a query forgets `cityId`.

This ADR does not change Prisma yet. It records the tenancy decision so
implementation can follow [docs/data-model.md](../data-model.md) and
[docs/rbac.md](../rbac.md).

## Decision

**Tenant = city.** Every city-owned row carries `cityId uuid NOT NULL`.
Indexes on those tables start with `cityId`. There is no separate
"organization" tenant in MVP; Latet is the single organization.

Authorization is **per city**:

- `CityMembership` (`role` + `status`) grants volunteer or coordinator
  access in that city.
- `User.isSuperAdmin` is the only cross-city privilege.
- Pending memberships have no city access.

Enforcement is three layers (see RBAC doc):

1. NestJS + CASL on each route
2. Prisma extension that requires and injects `cityId`
3. Postgres RLS on the most sensitive tables, using `SET LOCAL`
   `app.city_ids` / `app.super`

Cross-city misses return **404**. Super admins create cities and the
first coordinator invite.

Day creation **prefills** deliveries from current permanent matches. It
does not auto-reassign. When a volunteer declines or cancels, their
deliveries on that day become `unassigned` and appear on the city's
"Needs a volunteer" list. Coordinators reassign manually.

## Consequences

### Positive

- Cities cannot see each other's operational data
- One login can hold different roles in different cities
- Settings, templates, and days stay local to a city
- A forgotten `cityId` fails closed at the ORM and database

### Negative

- Queries and tests must always include city context
- RLS and `SET LOCAL` add transaction discipline
- Super-admin tooling must be explicit and rare

### Mitigation

- Shared DTO types per role so hidden fields never leave the API
- Cross-city integration tests as a merge requirement
- Last-coordinator protection so a city cannot lose all operators

## Alternatives considered

### Single-city forever

**Rejected.** The owner approved multi-city. Encoding one city in the
schema would force a rewrite.

### Organization plus city

**Rejected for MVP.** One organization (Latet). A global tenant table
adds no product value yet. Super admin covers cross-city admin.

### Soft `cityId` without RLS

**Rejected.** Application bugs would leak PII. RLS is the backstop.

## Notes

- This is documentation only. No Prisma schema or migration is included.
- Global `AppSettings` is later, not a second tenant.
- Legal data-controller details remain deferred; hosting stays EU
  (ADR 0018).
