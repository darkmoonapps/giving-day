# giving-day

Volunteer management app for monthly food-package distribution days. It handles scheduling, participation confirmations, reminders, and volunteer–elder matching, with an admin dashboard.

## Architecture

This is a pnpm workspaces monorepo with:

- **`apps/web`**: React + Vite + TypeScript + Mantine UI front-end, configured as a Progressive Web App (PWA) with mobile-first responsive design and RTL/Hebrew support
- **`apps/api`**: NestJS + TypeScript + Prisma REST API
- **`packages/shared`**: Shared TypeScript types used by both web and api

### Tech Stack

- **Frontend**: React 18, Vite 5, Mantine UI 7, vite-plugin-pwa
- **Backend**: NestJS 10, Prisma 5, PostgreSQL 16
- **Tooling**: TypeScript 5, ESLint, Prettier
- **Package Management**: pnpm workspaces
- **CI/CD**: GitHub Actions

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
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

### 3. Set up environment variables

Copy the example environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The defaults are configured for local development and should work out of the box.

### 4. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on `localhost:5432`.

### 5. Generate Prisma Client

```bash
cd apps/api
pnpm prisma:generate
```

### 6. Start the development servers

From the root directory:

```bash
pnpm dev
```

This starts:

- Web app at http://localhost:3000
- API server at http://localhost:3001

The web app will automatically proxy `/api` requests to the API server.

## Available Scripts

From the root directory:

- `pnpm dev` - Start all apps in development mode (parallel)
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages
- `pnpm typecheck` - Type-check all packages (included in build)
- `pnpm format` - Format all files with Prettier
- `pnpm format:check` - Check formatting without modifying files

### API-specific scripts

From `apps/api`:

- `pnpm prisma:generate` - Generate Prisma Client
- `pnpm prisma:migrate` - Run database migrations
- `pnpm prisma:studio` - Open Prisma Studio (database GUI)

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
│   └── shared/       # Shared TypeScript types
│       └── src/
├── .github/
│   └── workflows/
│       └── ci.yml    # GitHub Actions CI
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## Ports

- **3000**: Web app (Vite dev server)
- **3001**: API server (NestJS)
- **5432**: PostgreSQL database

## CI/CD

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `master`:

1. Installs dependencies with pnpm
2. Runs ESLint on all packages
3. Type-checks and builds all packages
4. Checks code formatting with Prettier

## PWA Features

The web app is configured as an installable Progressive Web App:

- Service worker for offline support
- Web app manifest for install prompts
- Mobile-first responsive design
- RTL/Hebrew layout support (via Mantine DirectionProvider)

## Database

PostgreSQL is managed via Docker Compose and Prisma ORM. The schema currently has no domain models (skeleton setup only).

To view/edit the database:

```bash
cd apps/api
pnpm prisma:studio
```

## License

MIT
