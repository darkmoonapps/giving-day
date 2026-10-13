# ADR 0004: NestJS + Prisma + PostgreSQL

**Status**: Accepted

**Date**: 2026-10-13

## Context

The backend API needs to:

- Handle user authentication
- Manage volunteers, elders, and distribution days
- Process confirmations and cancellations
- Schedule and send push notifications
- Provide REST endpoints for the frontend
- Scale to handle hundreds of users with acceptable performance
- Maintain data integrity and support transactions

## Decision

**Backend Stack**:

- **NestJS** - API framework
- **Prisma** - ORM and database toolkit
- **PostgreSQL** - Relational database

## Consequences

### NestJS

**Positive**:

- **TypeScript-first** - Full type safety from frontend to backend
- **Modular architecture** - Dependency injection, clear separation of concerns
- **Rich ecosystem** - Passport for auth, Bull for job queues, built-in validation
- **Express/Fastify under the hood** - Proven, battle-tested foundation
- **Excellent documentation** - Well-maintained docs and community
- **Decorator-based** - Clean, readable controller and service definitions
- **Testing utilities** - Built-in testing module and utilities

**Negative**:

- Steeper learning curve than plain Express
- More boilerplate than minimal frameworks
- Heavier runtime footprint (acceptable for our scale)

### Prisma

**Positive**:

- **Type-safe query builder** - Generated types from schema
- **Schema-first workflow** - Single source of truth for database structure
- **Excellent DX** - Migrations, introspection, Studio GUI
- **Auto-generated TypeScript client** - No manual type definitions needed
- **Relation handling** - Easy eager/lazy loading with `include`
- **Transaction support** - Handles complex multi-table operations
- **Migration system** - Version-controlled schema changes

**Negative**:

- Query performance edge cases (n+1 queries if not careful)
- Less flexible than raw SQL for complex queries (can use raw queries when needed)
- Schema changes require regenerating client

### PostgreSQL

**Positive**:

- **ACID compliance** - Data integrity guarantees
- **Rich data types** - JSON, arrays, timestamps with timezone
- **Mature and stable** - Battle-tested in production for decades
- **Excellent tooling** - pgAdmin, psql, many ORMs support it well
- **Scalability** - Handles our expected load easily, room to grow
- **Open source** - No licensing costs
- **Prisma integration** - First-class support

**Negative**:

- Requires infrastructure (Docker for dev, hosted service for production)
- Slightly more resource-intensive than lighter databases (not a concern)

## Alternatives Considered

### Backend Frameworks

#### Express.js (Plain)

**Rejected**: While lightweight and familiar, lacks structure for a team project. No built-in dependency injection, validation, or modular architecture. NestJS adds valuable patterns without sacrificing Express underneath.

#### Fastify

**Rejected**: Faster than Express but less mature ecosystem, fewer plugins, and less team familiarity. NestJS can use Fastify as adapter if performance becomes critical.

#### Koa

**Rejected**: Minimalist like Express but smaller ecosystem. Doesn't provide advantages over NestJS.

### ORMs

#### TypeORM

**Rejected**: While widely used, Prisma provides better type safety, cleaner migration workflow, and superior DX. Prisma's generated client is more intuitive than TypeORM's decorators.

#### Sequelize

**Rejected**: Older ORM with weaker TypeScript support, more verbose API. Prisma is more modern.

#### Drizzle ORM

**Considered**: Excellent type safety and performance, but younger ecosystem, fewer examples. Prisma is more mature and has better documentation.

#### Raw SQL (no ORM)

**Rejected**: Would require manual type definitions, hand-written migrations, and more boilerplate. ORMs provide significant productivity gains for our use case.

### Databases

#### MySQL/MariaDB

**Rejected**: PostgreSQL has better JSON support, more advanced features (e.g., array types), and Prisma works better with it. Minimal advantages for our use case.

#### SQLite

**Rejected**: Not suitable for production deployment with multiple concurrent users. Lacks advanced features and scalability.

#### MongoDB

**Rejected**: NoSQL not needed for our structured relational data. Volunteer-elder relationships, assignments, and confirmations are naturally relational. PostgreSQL provides better data integrity.

#### Firebase/Supabase

**Deferred**: These are BaaS platforms, not just databases. Could reconsider if we want managed auth/realtime out-of-box, but we want full control over our API and business logic.

## Notes

- Use Prisma migrations for schema changes (`prisma migrate dev`)
- Generate Prisma client as part of build process
- Use Prisma's connection pooling in production
- Set up indexes for common query patterns (volunteer lookups, distribution day queries)
- Use transactions for operations that modify multiple tables (assignments, confirmations)
- Consider Prisma Studio for manual database inspection during development
