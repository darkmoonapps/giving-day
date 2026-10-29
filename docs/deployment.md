# Free-tier deployment

Giving Day deploys on **free tiers only**. Do not enable paid plans, paid add-ons,
or paid Sentry products (Session Replay, Profiling, Performance tracing).

| Piece    | Service                                                              | Region / notes                                |
| -------- | -------------------------------------------------------------------- | --------------------------------------------- |
| Web PWA  | [Cloudflare Pages](https://developers.cloudflare.com/pages/)         | Global CDN, direct-upload from GitHub Actions |
| API      | [Render](https://render.com/docs/web-services) free web service      | Frankfurt (`frankfurt` in `render.yaml`)      |
| Postgres | [Neon](https://neon.com/docs/introduction/regions) free project      | Frankfurt (`aws-eu-central-1`)                |
| Errors   | [Sentry EU](https://docs.sentry.io/product/security/data-residency/) | `https://de.sentry.io` ingest                 |

The API health endpoints are:

- `GET /health` — used by Render health checks and the keep-awake workflow
- `GET /api/health` — used by the web app and OpenAPI client

Both return the same payload.

## 1. Neon (Postgres, Frankfurt)

1. Create a free account at [Neon](https://console.neon.tech/).
2. Create a project:
   - **Region**: Frankfurt (`aws-eu-central-1`)
   - **Postgres** version 16 when offered
   - Stay on the [Free plan](https://neon.com/docs/introduction/plans)
3. Open **Dashboard → Connection details**.
4. Copy the **direct** (non-pooled) connection string. Prisma Migrate cannot
   run through the pooled endpoint. It should include `sslmode=require`.
5. Save that value as `DATABASE_URL`. You will paste it into GitHub and Render.
   Never commit it.

### Neon free limits (verify on the live docs)

Source: [Neon plans](https://neon.com/docs/introduction/plans) and
[Free plan limits](https://neon.com/faqs/free-plan-limits-and-quotas).

- **Price**: $0/month
- **Projects**: 100
- **Branches**: 10 per project
- **Compute**: 100 CU-hours per project per month
- **Autoscaling**: up to 2 CU (~8 GB RAM)
- **Scale to zero**: after 5 minutes of inactivity (cannot be disabled on Free)
- **Storage**: 1 GB Postgres per project, 20 GB across the account
- **Public network transfer**: 5 GB per project per month
- **Instant restore**: 6 hours, capped at 1 GB of change history
- **Manual snapshots**: 1
- Compute and transfer reset each monthly billing period; storage does not

## 2. Render (API, Frankfurt)

1. Create a free account at [Render](https://dashboard.render.com/).
2. New → **Blueprint**. Connect this GitHub repository.
3. Render reads [`render.yaml`](../render.yaml):
   - Web service `giving-day-api`
   - `plan: free`
   - `region: frankfurt`
   - `healthCheckPath: /health`
   - `preDeployCommand` runs `prisma migrate deploy`
   - `autoDeployTrigger: 'off'` so GitHub Actions is the deploy trigger
     (migrations run first)
4. When prompted, set the `sync: false` environment variables listed below.
5. After the first Blueprint apply, open the service → **Settings → Deploy
   Hook** and copy the hook URL. You will store it as
   `RENDER_DEPLOY_HOOK_URL`.
6. Confirm the public URL (for example `https://giving-day-api.onrender.com`).
   The keep-awake variable `API_HEALTH_URL` is that origin plus `/health`.

Do **not** create a Render Postgres instance. Neon is the database.

### Render free limits (verify on the live docs)

Source: [Deploy for Free](https://render.com/docs/free).

- **750 Free instance hours** per workspace per calendar month
- Hours are consumed only while the service is running; a spun-down service
  does not consume hours
- Unused hours do not roll over
- If the 750 hours are exhausted, all Free web services in the workspace are
  suspended until the next calendar month
- Free web services spin down after **15 minutes** without inbound traffic
  and take about **one minute** to spin back up
- Free web services cannot use persistent disks, SSH, or scaling past one
  instance
- Outbound bandwidth and build pipeline minutes count against the workspace
  included amounts ([bandwidth](https://render.com/docs/outbound-bandwidth),
  [build pipeline](https://render.com/docs/build-pipeline))

Keep-awake is limited to 08:00–22:00 Asia/Jerusalem **and**
`KEEPAWAKE_START`–`KEEPAWAKE_END` so a single always-on service does not
burn the full 750 hours. Fourteen hours a day is about 420 instance-hours in
a 30-day month, which stays under 750. See the keep-awake notes below.

## 3. Cloudflare Pages (web)

1. Create a free Cloudflare account at
   [dash.cloudflare.com](https://dash.cloudflare.com/).
2. **Workers & Pages → Create → Pages → Direct Upload**. Name the project
   (store that name as GitHub variable `CLOUDFLARE_PAGES_PROJECT`).
3. Do **not** connect Git-based Pages builds. GitHub Actions builds the app
   and uploads `apps/web/dist` with Wrangler, which avoids the Pages
   Git-build quota.
4. Create an API token:
   [Create token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
   using the **Edit Cloudflare Pages** template (Account → Cloudflare Pages →
   Edit, plus User → User Details → Read if the template asks for it).
5. Copy the **Account ID** from the Pages overview (right sidebar).
6. After the first deploy, copy the `*.pages.dev` URL and add it to Render
   `CORS_ORIGINS`.

### Cloudflare Pages free limits

Source: [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
and [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/).

- **Git-triggered builds**: 500 per month, 1 at a time, 20 minute timeout
  (this project uses Wrangler direct upload instead)
- **Files per site**: 20,000
- **File size**: 25 MiB
- **Projects**: 100 per account
- **Custom domains**: 100 on the Free plan
- **Static asset requests**: free and unlimited
- This app ships no Pages Functions, so it does not consume the Workers
  Free daily request quota

## 4. Sentry (EU, errors only)

1. Create projects at **[https://de.sentry.io](https://de.sentry.io)** (EU).
   Use two projects, for example `giving-day-web` and `giving-day-api`.
2. Copy each **DSN**. EU ingest hosts look like `ingest.de.sentry.io`.
3. In each project: **Settings → Security & Privacy → Data Privacy**:
   - Turn **off** storing IP addresses
   - Leave default PII collection off (`sendDefaultPii` is `false` in code)
4. Create an auth token with `project:releases` and `org:read` so the Vite
   plugin can upload web source maps:
   [Auth tokens](https://docs.sentry.io/account/auth-tokens/).
5. Leave `VITE_SENTRY_DSN` / `SENTRY_DSN` empty in any environment where
   Sentry should stay a no-op.

The SDKs set `sendDefaultPii: false`, `tracesSampleRate: 0`, and a
`beforeSend` PII scrubber. Missing DSNs skip `Sentry.init`.

Paid Sentry features (Replay, Profiling, Performance) stay disabled.

## 5. GitHub Actions secrets and variables

Open the repository → **Settings → Secrets and variables → Actions**.

### Repository secrets

Store **values** only in the GitHub UI. This repository contains **names**,
never values.

| Secret                   | Used by          | Purpose                                                   |
| ------------------------ | ---------------- | --------------------------------------------------------- |
| `DATABASE_URL`           | `deploy-api.yml` | Neon direct connection string for `prisma migrate deploy` |
| `RENDER_DEPLOY_HOOK_URL` | `deploy-api.yml` | Render deploy hook that starts a new API deploy           |
| `CLOUDFLARE_API_TOKEN`   | `deploy-web.yml` | Pages direct upload                                       |
| `CLOUDFLARE_ACCOUNT_ID`  | `deploy-web.yml` | Cloudflare account that owns the Pages project            |
| `SENTRY_AUTH_TOKEN`      | `deploy-web.yml` | Upload web source maps to Sentry EU                       |
| `VITE_SENTRY_DSN`        | `deploy-web.yml` | Web EU DSN baked in at build time                         |

`GITHUB_TOKEN` is provided by GitHub. Do not add it yourself.

### Repository variables

| Variable                   | Used by          | Purpose                                                                                  |
| -------------------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `VITE_API_URL`             | `deploy-web.yml` | Render API origin, for example `https://giving-day-api.onrender.com` (no trailing slash) |
| `CLOUDFLARE_PAGES_PROJECT` | `deploy-web.yml` | Cloudflare Pages project name                                                            |
| `SENTRY_ORG`               | `deploy-web.yml` | Sentry organization slug                                                                 |
| `SENTRY_PROJECT`           | `deploy-web.yml` | Sentry **web** project slug                                                              |
| `SENTRY_URL`               | `deploy-web.yml` | Optional. Default `https://de.sentry.io`                                                 |
| `API_HEALTH_URL`           | `keep-awake.yml` | Full health URL, for example `https://giving-day-api.onrender.com/health`                |
| `KEEPAWAKE_START`          | `keep-awake.yml` | Inclusive start (`YYYY-MM-DD` or ISO-8601 datetime)                                      |
| `KEEPAWAKE_END`            | `keep-awake.yml` | Inclusive end (`YYYY-MM-DD` or ISO-8601 datetime)                                        |

### Render dashboard environment variables

Set these on the `giving-day-api` service (`sync: false` in `render.yaml`):

| Variable            | Purpose                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `DATABASE_URL`      | Same Neon direct URL as the GitHub secret                                                  |
| `CORS_ORIGINS`      | Cloudflare Pages origin (and custom domain if you add one), comma-separated                |
| `SENTRY_DSN`        | API EU DSN. Empty disables Sentry                                                          |
| `VAPID_PUBLIC_KEY`  | Web Push VAPID public key. Empty uses the log/no-op provider                               |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key. Never commit. Generate with `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT`     | `mailto:` or `https:` contact URI for VAPID (example: `mailto:noreply@example.com`)        |

`NODE_VERSION=22`, `NODE_ENV=production`, and `SENTRY_ENVIRONMENT=production`
are already in `render.yaml`. Render injects `PORT`.

## 6. First-time connection order

1. Create the Neon project in Frankfurt and copy `DATABASE_URL`.
2. Apply the Blueprint on Render (Frankfurt, free) and paste `DATABASE_URL`,
   `CORS_ORIGINS` (temporary `http://localhost:3000` is fine), and `SENTRY_DSN`.
3. Copy the Render deploy hook and public origin.
4. Create the Cloudflare Pages project and API token.
5. Create the Sentry EU projects and tokens.
6. Fill in every GitHub secret and variable in the tables above.
   `KEEPAWAKE_START` / `KEEPAWAKE_END` can be the current month, for example
   `2026-10-01` and `2026-10-31`.
7. Push to `master` (or run **Deploy API** and **Deploy Web** from
   Actions → workflow_dispatch).
8. Set Render `CORS_ORIGINS` to the live Pages URL.
9. Confirm `GET $API_HEALTH_URL` returns JSON with `"status":"healthy"`.
10. Confirm the Pages site loads and the health card is healthy.

## 7. What each workflow does

### `Deploy API` (`.github/workflows/deploy-api.yml`)

On push to `master`:

1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @giving-day/api exec prisma migrate deploy`
3. `POST` `RENDER_DEPLOY_HOOK_URL`

Render then builds the API, runs `prisma migrate deploy` again (idempotent),
and starts the process. Health checks hit `/health`.

### `Deploy Web` (`.github/workflows/deploy-web.yml`)

On push to `master`:

1. Build the web app with `VITE_API_URL` and `VITE_SENTRY_DSN`
2. Upload source maps to Sentry EU when `SENTRY_AUTH_TOKEN` is set
3. Delete `*.map` files from `apps/web/dist`
4. `wrangler pages deploy` to Cloudflare Pages

### `Keep awake` (`.github/workflows/keep-awake.yml`)

GitHub cron: `*/10 * * * *` (UTC). The job then decides locally:

1. Skip unless `API_HEALTH_URL`, `KEEPAWAKE_START`, and `KEEPAWAKE_END` are set
2. Skip unless "now" is between those bounds
3. Skip unless the clock in `Asia/Jerusalem` is 08:00–21:59
4. Otherwise `GET` `/health`

A skip exits 0. A failed ping fails the job.

Scheduled workflows run only on the default branch (`master`).

## 8. Local and production environment files

Copy the examples; do not commit `.env` files.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

| File                    | Variables                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `apps/api/.env.example` | `DATABASE_URL`, `PORT`, `CORS_ORIGINS`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, OAuth/JWT, `VAPID_*` |
| `apps/web/.env.example` | `VITE_API_URL`, `VITE_SENTRY_DSN`                                                                |

In development the web app still uses relative `/api` URLs through the Vite
proxy when `VITE_API_URL` is the local API. Production builds prefix fetches
with `VITE_API_URL` so the Pages origin can call Render.

## 9. Prisma migrate on deploy

`prisma migrate deploy` is the only production schema apply path (see
[ADR 0010](./adr/0010-db-migrations-prisma-github-actions.md)).

- GitHub Actions runs it **before** the Render deploy hook
- Render `preDeployCommand` runs it again on the service

There is a baseline migration for the existing placeholder table. This is
not a domain schema change. Future model changes still need
`pnpm --filter @giving-day/api prisma migrate dev --name <description>`
and a committed migration folder.

If a database was created earlier with `prisma db push`, baseline it once:

```bash
pnpm --filter @giving-day/api exec prisma migrate resolve --applied 20261014120000_init
```

## 10. TanStack Query persistence

The web app uses `persistQueryClient` with `localStorage`. Only queries whose
key starts with `distribution-day-details` are persisted. Health polling is
not persisted. Use `distributionDayDetailsQueryKey(dayId)` when the
distribution-day details API exists.

## 11. Out of scope

- Paid Render, Neon, Cloudflare, or Sentry plans
- Render Postgres
- Database domain-schema changes
- New product features beyond deploy, Sentry, keep-awake, and query persist
