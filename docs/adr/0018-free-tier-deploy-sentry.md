# ADR 0018: Free-tier Cloudflare, Render, Neon, and Sentry

**Status**: Accepted

**Date**: 2026-10-14

## Context

Giving Day needs a hosted environment for the React PWA and NestJS API without
paid infrastructure. The coordinator works in Israel, so the API and database
should be in the EU (Frankfurt) and error monitoring should use Sentry's EU
region. Render free web services sleep after 15 minutes; a bounded keep-awake
ping is required so daytime use does not hit a cold start, without burning
the monthly instance-hour budget.

## Decision

- **Web**: Cloudflare Pages, deployed from GitHub Actions via Wrangler
  direct upload.
- **API**: Render free web service in Frankfurt, declared in `render.yaml`,
  with `GET /health` for platform health checks.
- **Postgres**: Neon free project in Frankfurt. Render Postgres is not used
  (Free Render databases expire after 30 days).
- **Migrations**: `prisma migrate deploy` in GitHub Actions before the
  Render deploy hook, and again as Render `preDeployCommand`.
- **Keep-awake**: GitHub Actions cron every 10 minutes, pinging `/health`
  only 08:00–22:00 Asia/Jerusalem and only inside `KEEPAWAKE_START` /
  `KEEPAWAKE_END`.
- **Sentry**: `@sentry/react` (Vite plugin source maps) and `@sentry/nestjs`,
  EU DSNs from env, `sendDefaultPii: false`, `beforeSend` PII scrubber, IP
  storage off, no-op when the DSN is missing. Tracing, Replay, and Profiling
  stay off.
- **Client cache**: TanStack Query `persistQueryClient` + `localStorage` for
  distribution-day details keys only.

Step-by-step connection, secret names, and live limit links live in
[docs/deployment.md](../deployment.md).

## Consequences

### Positive

- Zero-cost hosting on published free tiers
- EU data residency for the API, database, and Sentry ingest
- Migrations are applied automatically and versioned
- Keep-awake is bounded so Render's 750 hours/month remain headroom
- PII is scrubbed before events leave the client or API

### Negative

- Render and Neon both scale to zero; the first request after idle is slow
- GitHub cron is UTC and not exact to the minute
- Cloudflare Pages and Render are different origins, so CORS and
  `VITE_API_URL` must be set correctly

### Mitigation

- Keep-awake covers 08:00–22:00 Jerusalem inside an explicit campaign window
- Deployment docs list every secret and variable by name
- Source maps are uploaded to Sentry then deleted from the Pages artifact
