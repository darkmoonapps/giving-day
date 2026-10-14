# ADR 0010: Database Migrations with Prisma via GitHub Actions

**Status**: Accepted

**Date**: 2026-10-13

**Accepted**: 2026-10-14 — GitHub Actions `deploy-api.yml` and Render
`preDeployCommand` both run `prisma migrate deploy`. See
[docs/deployment.md](../deployment.md).

## Context

Database schema changes need to be:

- Version-controlled
- Applied consistently across environments
- Reversible if needed
- Safe from data loss
- Automated in deployment pipeline

We need a migration strategy that integrates with our Prisma ORM and deployment process.

## Decision

Use **Prisma Migrate** to manage database schema changes, with migrations **applied automatically via GitHub Actions** during deployment.

**Workflow**:

1. Developer changes `schema.prisma`
2. Run `pnpm prisma migrate dev --name <description>` locally
3. Commit generated migration SQL to git
4. Push to repository
5. GitHub Actions applies migration to staging/production on deploy

## Consequences

### Positive

- **Version control** - Migration files tracked in git alongside code
- **Declarative schema** - Prisma schema is single source of truth
- **Type safety** - Prisma regenerates types after migration
- **Automatic application** - No manual SQL running in production
- **Rollback support** - Can revert migrations if needed
- **Development parity** - Same migration system locally and in production
- **Audit trail** - Migration history visible in git log

### Negative

- **Migration file management** - Developers must commit migration files
- **Merge conflicts** - Parallel migrations can conflict
- **Failed migration risk** - Bad migration can block deployment
- **Downtime possibility** - Some schema changes require downtime
- **Manual intervention** - Complex migrations may need data backfills

### Mitigation Strategies

- Review migrations carefully in PRs
- Test migrations in staging before production
- Use Prisma's shadow database for dev migration generation
- Coordinate on schema changes to avoid conflicts
- Write migrations that are backward-compatible when possible
- Have rollback plan for complex migrations

## Prisma Migration Commands

### Development

```bash
# Create new migration
pnpm prisma migrate dev --name add_volunteer_table

# Reset database (dev only)
pnpm prisma migrate reset

# View migration status
pnpm prisma migrate status

# Apply pending migrations
pnpm prisma migrate deploy
```

### Production (via CI/CD)

```bash
# Apply migrations (no prompts, CI-safe)
pnpm prisma migrate deploy
```

## GitHub Actions Integration

**Proposed CI Workflow** (details to be finalized):

```yaml
name: Deploy API

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - uses: pnpm/action-setup@v2
        with:
          version: 10

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        run: pnpm --filter @giving-day/api prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Build API
        run: pnpm --filter @giving-day/api build

      - name: Deploy to production
        run: # ... deployment steps ...
```

## Migration Best Practices

### Safe Migrations

✅ **Preferred patterns**:

- Add nullable columns (can make non-null later with backfill)
- Add new tables
- Create indexes
- Add columns with defaults

❌ **Risky patterns** (require careful handling):

- Drop columns (data loss!)
- Rename columns (breaks old code)
- Change column types (can fail with incompatible data)
- Add non-null columns without default (fails if rows exist)

### Multi-Step Migrations

For risky changes, use multiple deployments:

**Example: Renaming a column**

1. **Step 1**: Add new column, copy data, deploy
   ```sql
   ALTER TABLE "Volunteer" ADD COLUMN "phone_number" TEXT;
   UPDATE "Volunteer" SET "phone_number" = "phone";
   ```
2. **Step 2**: Update code to use new column, deploy
3. **Step 3**: Drop old column, deploy
   ```sql
   ALTER TABLE "Volunteer" DROP COLUMN "phone";
   ```

### Data Migrations

For data transformations beyond schema changes:

```sql
-- Migration: 20261013_backfill_full_name.sql
UPDATE "Volunteer"
SET "full_name" = CONCAT("first_name", ' ', "last_name")
WHERE "full_name" IS NULL;
```

## Open Questions (To Be Decided)

### Migration Deployment Timing

- Apply migrations before or after deploying new code?
- **Recommendation**: Before (so new code has schema it expects)

### Failed Migration Handling

- Auto-rollback deployment if migration fails?
- Manual intervention required?
- Notification strategy?

### Database Downtime

- Accept brief downtime for complex migrations?
- Or require all migrations to be zero-downtime?
- **Recommendation**: Prefer zero-downtime, accept brief downtime for critical changes with coordination

### Staging Environment

- Require successful staging deployment before production?
- **Recommendation**: Yes, always test migrations in staging first

### Migration Approval

- Require explicit approval for migrations that drop columns or tables?
- **Recommendation**: Yes, use GitHub branch protection rules to require approval from owner

### Seed Data

- Apply seed data via migrations or separate script?
- **Recommendation**: Separate script (`pnpm db:seed`), not in migrations

## Alternatives Considered

### Manual SQL Migrations

**Rejected**: Error-prone, no version control, no type generation, inconsistent across environments. Prisma Migrate is superior.

### TypeORM Migrations

**Rejected**: We chose Prisma as ORM (ADR 0004), TypeORM migrations don't fit our stack.

### Knex.js Migrations

**Rejected**: Knex is a query builder, not an ORM. Doesn't provide type generation. Prisma Migrate is more integrated with our stack.

### Flyway / Liquibase

**Rejected**: Adds another tool to the stack. Prisma Migrate is sufficient and integrates with our ORM.

### Direct Database Changes

**Rejected**: Bypasses version control, can't reproduce in other environments, breaks type generation. Migrations must be in code.

## Rollback Strategy

If a migration causes issues:

1. **Immediate**: Revert the PR that introduced it
2. **Create rollback migration**: Write a migration that undoes the change
3. **Apply rollback**: Deploy the rollback migration

**Important**: Never delete migration files from git history. Always roll forward with a new migration.

## Notes

- Prisma uses `_prisma_migrations` table to track applied migrations
- Migration files in `prisma/migrations/` directory
- Shadow database needed for local migration generation (Prisma creates it automatically)
- Production DATABASE_URL must be kept secret
- Consider adding migration dry-run step in PR checks
- Document complex migrations in PR description
