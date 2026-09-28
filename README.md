# SerVe Server

Backend API for **SerVe (ResPOS)** — a multi-tenant restaurant management and POS SaaS. Restaurant businesses subscribe as tenants and run day-to-day operations (POS, kitchen, floor, staff) under plan limits, while platform admins manage tenants, plans, and subscriptions.

This repository is the NestJS modular monolith that powers that platform.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22+, NestJS 12 (TypeScript, ESM) |
| Database | PostgreSQL 17 + Prisma ORM 7 |
| Auth | JWT (cookie-based), Passport |
| Media | Cloudinary |
| API docs | Swagger / OpenAPI |
| Containers | Docker + Docker Compose |

---

## Prerequisites

- [Node.js](https://nodejs.org/) **22+** and npm
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose (for Postgres and/or full stack)

---

## Quick start

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and JWT secrets
```

### Option A — Full stack with Docker

Runs the API and PostgreSQL together. Migrations apply on container start.

```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| API | http://localhost:5001 |
| Swagger | http://localhost:5001/api/docs |
| Postgres (host) | `localhost:5433` |

Stop:

```bash
docker compose down
```

Reset database volume (destructive):

```bash
docker compose down -v
```

> Compose overrides `DATABASE_URL` inside the app container to use host `postgres:5432`. Your local `.env` can keep `localhost:5433` for host-side tools.

---

### Option B — Local Nest + Docker Postgres only

Best for day-to-day development (hot reload).

**1. Start Postgres**

```bash
docker compose up -d postgres
```

**2. Configure `.env`**

```env
DATABASE_URL=postgresql://serv:serv-sd-password@localhost:5433/serv_db
PORT=5000
NODE_ENV=development
```

**3. Install, generate client, migrate, run**

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:5000 |
| Swagger | http://localhost:5000/api/docs |

---

## Useful scripts

```bash
npm run start:dev       # Nest watch mode
npm run build           # Compile to dist/
npm run start:prod      # Run compiled app
npm run prisma:generate # Generate Prisma Client
npm run prisma:migrate  # Create/apply migrations (dev)
npm run prisma:deploy   # Apply migrations (CI/prod)
npm run prisma:studio   # Prisma Studio GUI
npm run lint            # Oxlint
npm run test            # Unit tests
npm run test:e2e        # E2E tests
```

---

## Environment

Copy `.env.example` → `.env`. The database side is intentionally a single URL:

```env
DATABASE_URL=postgresql://serv:serv-sd-password@localhost:5433/serv_db
```

| Context | Host / port |
|---------|-------------|
| Nest on host | `localhost:5433` |
| Nest in Compose | `postgres:5432` (set by compose) |

Also configure Cloudinary, JWT secrets, `PORT`, `NODE_ENV`, and `CORS_ORIGINS` as needed. See `.env.example`.

---

## Project structure (high level)

```text
Serv-server/
├── prisma/                 # Schema + migrations
├── src/
│   ├── config/             # App, DB, JWT, Cloudinary config
│   ├── common/             # Guards, filters, interceptors, strategies
│   ├── services/           # Prisma, Cloudinary
│   └── modules/            # Domain modules (admin, tenants, …)
├── docs/                   # Concept, Prisma/Docker guide, feedback
├── docker-compose.yml
└── Dockerfile
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/Respos_project_concept.md](./docs/Respos_project_concept.md) | Product & architecture concept |
| [docs/PRISMA_POSTGRES_DOCKER.md](./docs/PRISMA_POSTGRES_DOCKER.md) | Prisma 7 + Postgres + Compose deep dive |
| [docs/PROJECT_BASE_FEEDBACK.md](./docs/PROJECT_BASE_FEEDBACK.md) | Current base status & next milestones |

---

## License

UNLICENSED — private project.
