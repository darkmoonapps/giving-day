# giving-day

Volunteer management app for monthly food-package distribution days. It handles scheduling, participation confirmations, reminders, and volunteer–elder matching, with an admin dashboard.

## Architecture

This is a pnpm workspaces monorepo with:

- **`apps/web`**: React + Vite + TypeScript + Mantine UI front-end, configured as a Progressive Web App (PWA) with mobile-first responsive design and RTL/Hebrew support
- **`apps/api`**: NestJS + TypeScript + Prisma REST API, with OpenAPI/Swagger at `/api/docs`
- **`packages/shared`**: Shared TypeScript types and Zod schemas used by both web and api
- **`packages/ui`**: Atomic design component library on Mantine, documented in Storybook

### Tech Stack

- **Frontend**: React 19, Vite 6, Mantine UI 9, react-i18next, Zustand, TanStack Query, vite-plugin-pwa
- **Backend**: NestJS 11, Prisma 6, PostgreSQL 16, @nestjs/swagger
- **Shared**: Zod schemas, Orval-generated React Query clients
- **Tooling**: TypeScript 5.7, ESLint 9 (flat config), Prettier, Vitest, Playwright, Storybook
- **Package Management**: pnpm 10+ workspaces
- **CI/CD**: GitHub Actions

## Prerequisites

- Node.js >= 22.0.0 (LTS)
- pnpm >= 10.0.0
- Docker and Docker Compose (for local PostgreSQL)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd giving-day
```

### 2. Install dependencies

```bash
pnpm install
```

This automatically:

- Generates the Prisma Client via the postinstall hook in `apps/api`
- Sets up Husky git hooks for commit message validation and pre-commit checks

Alternatively, you can manually run:

```bash
pnpm db:generate
```

If git hooks aren't working after installation, run:

```bash
pnpm prepare
```

### 3. Set up environment variables

Copy the example environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The defaults are configured for local development and should work out of the box.

**API environment variables:**

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: API server port (default: 3001)
- `CORS_ORIGINS`: Comma-separated list of allowed CORS origins (default: `http://localhost:3000`)

**Web environment variables:**

- `VITE_API_URL`: API server URL for Vite dev proxy target (default: `http://localhost:3001`)

### 4. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on `localhost:5432`.

### 5. Start the development servers

From the root directory:

```bash
pnpm dev
```

This starts:

- Web app at http://localhost:3000
- API server at http://localhost:3001

The web app uses relative `/api` URLs that are proxied to the API server in development.

## Available Scripts

From the root directory:

- `pnpm dev` - Start all apps in development mode (parallel)
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages with ESLint 9
- `pnpm typecheck` - Type-check all packages (included in build)
- `pnpm format` - Format all files with Prettier
- `pnpm format:check` - Check formatting without modifying files
- `pnpm db:generate` - Generate Prisma Client
- `pnpm test` - Run all unit and integration tests
- `pnpm test:ci` - Run all tests with coverage
- `pnpm test:e2e` - Run end-to-end tests with Playwright
- `pnpm codegen` - Generate OpenAPI spec and Orval clients
- `pnpm codegen:check` - Fail if generated clients are stale
- `pnpm --filter @giving-day/ui storybook` - Start the UI Storybook

### API-specific scripts

From `apps/api`:

- `pnpm prisma:generate` - Generate Prisma Client (also runs on postinstall)
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio (database GUI)
- `pnpm test` - Run API tests

### Web-specific scripts

From `apps/web`:

- `pnpm test` - Run web app tests

## Project Structure

```
giving-day/
├── apps/
│   ├── web/          # React + Vite PWA
│   │   ├── src/
│   │   ├── public/
│   │   └── vite.config.ts
│   └── api/          # NestJS API
│       ├── src/
│       │   ├── health/
│       │   └── prisma/
│       └── prisma/
│           └── schema.prisma
├── packages/
│   ├── shared/       # Shared TypeScript types and Zod schemas
│   │   └── src/
│   └── ui/           # Atomic design system + Storybook
│       └── src/
├── .github/
│   └── workflows/
│       └── ci.yml    # GitHub Actions CI
├── docker-compose.yml
├── pnpm-workspace.yaml
├── eslint.config.js  # ESLint 9 flat config
└── package.json
```

## Ports

- **3000**: Web app (Vite dev server)
- **3001**: API server (NestJS)
- **5432**: PostgreSQL database

## CI/CD

Three GitHub Actions workflows run on pull requests to `master`:

1. **CI** (`.github/workflows/ci.yml`):
   - Lint and Build Job:
     - Installs dependencies with pnpm 10
     - Runs ESLint on all packages
     - Type-checks all packages
     - Checks generated OpenAPI/Orval clients
     - Checks code formatting with Prettier
     - Pushes the Prisma schema to CI Postgres (`prisma db push`)
     - Builds all packages
     - Runs unit and integration tests (including Supertest against `/api/health`)
   - E2E Tests Job:
     - Sets up PostgreSQL and pushes the Prisma schema
     - Installs Playwright browsers (`pnpm exec playwright install`) and caches them
     - Builds the apps, then runs Playwright against `api start` + `web preview`
     - Waits for `GET :3001/api/health` before UI assertions
     - Covers Hebrew RTL to English LTR and the color-scheme toggle
     - Uploads Playwright reports as artifacts **only on failure**

2. **Commit Lint** (`.github/workflows/commitlint.yml`):
   - Validates all commits in the PR follow Conventional Commits format

3. **PR Title Check** (`.github/workflows/pr-title.yml`):
   - Validates the PR title follows Conventional Commits format
   - Important for squash merges (PR title becomes the commit message)

## PWA Features

The web app is configured as an installable Progressive Web App:

- Service worker for offline support
- Web app manifest for install prompts
- Mobile-first responsive design
- RTL/Hebrew layout support (via Mantine DirectionProvider)
- Placeholder PWA icons (192x192, 512x512, and 512x512 maskable)

**Note**: The current PWA icons are minimal placeholders. For production, replace them with actual branded icons at the correct sizes.

## Database

PostgreSQL is managed via Docker Compose and Prisma ORM. The schema currently has no domain models (skeleton setup only).

To view/edit the database:

```bash
cd apps/api
pnpm prisma:studio
```

## Commit Standards

This project uses **Conventional Commits** to maintain a clean git history. All commits and PR titles must follow this format:

```
<type>(<scope>): <description>
```

**Examples**:

- `feat(web): add volunteer list component`
- `fix(api): correct elder assignment logic`
- `docs: update installation instructions`
- `ci: add commitlint workflow`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Scopes**: `web`, `api`, `shared`, `ui`, `ci`, `docs`, `deps`

**Git Hooks**:

- **commit-msg**: Validates commit messages (runs commitlint)
- **pre-commit**: Formats and lints staged files (runs lint-staged with Prettier + ESLint)

These hooks are automatically installed when you run `pnpm install` via the `prepare` script.

See [AGENTS.md](AGENTS.md) and [docs/adr/0008-conventional-commits.md](docs/adr/0008-conventional-commits.md) for complete details.

## Security & Data Policy

**Important**: No real personal data (names, phone numbers, addresses, etc.) may ever be committed to this repository, including in seeds, fixtures, or test data. Use obviously fake data only.

## API

The API uses CORS with an origin allowlist. Configure allowed origins via the `CORS_ORIGINS` environment variable (comma-separated list). Default: `http://localhost:3000`.

OpenAPI/Swagger UI is available at http://localhost:3001/api/docs while the API is running. After changing controllers or DTOs, run `pnpm codegen` and commit the updated spec and generated client.

The web app makes requests to relative `/api/*` URLs, which are:

- Proxied to the API server in development (via Vite proxy)
- Handled as same-origin requests in production

## License

MIT
