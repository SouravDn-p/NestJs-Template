# NestJS Template

NestJS API template with Prisma, PostgreSQL, JWT auth, and Docker.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

API: `http://localhost:5000`

Compose starts PostgreSQL + the API and runs migrations on boot.

## Local setup (without Docker app)

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

Use Docker only for the database if you want:

```bash
docker compose up postgres -d
```

## Environment variables

Copy `.env.example` → `.env` and fill in values:

| Variable | Example | Required |
|---|---|---|
| `PORT` | `5000` | yes |
| `NODE_ENV` | `development` | yes |
| `POSTGRES_USER` | `postgres` | yes (Docker) |
| `POSTGRES_PASSWORD` | `postgres` | yes (Docker) |
| `POSTGRES_DB` | `nest_template` | yes (Docker) |
| `POSTGRES_PORT` | `5432` | yes (Docker) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/nest_template?schema=public` | yes |
| `JWT_ACCESS_SECRET` | long random string | yes |
| `JWT_REFRESH_SECRET` | long random string | yes |
| `JWT_ACCESS_EXPIRES_IN` | `900` (seconds) | yes |
| `JWT_REFRESH_EXPIRES_IN` | `604800` (seconds) | yes |
| `CLOUDINARY_CLOUD_NAME` | your cloud name | for uploads |
| `CLOUDINARY_API_KEY` | your key | for uploads |
| `CLOUDINARY_API_SECRET` | your secret | for uploads |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | yes |

Notes:
- Local `DATABASE_URL` uses `localhost`.
- `docker compose` overrides `DATABASE_URL` to use the `postgres` service host.

## Scripts

```bash
npm run start:dev      # watch mode
npm run build          # compile
npm run start:prod     # run dist
npx prisma migrate dev # create/apply migrations
npx prisma studio      # DB UI
```

## Project layout

```
src/
  prisma/           Prisma module
  modules/auth/     register, login, refresh, logout, me
  modules/users/    users
  modules/projects/ projects CRUD + image upload
  common/           guards, filters, interceptors
prisma/
  schema.prisma
docker/
  entrypoint.sh     migrate then start
```

## Main routes

| Method | Path | Auth |
|---|---|---|
| `GET` | `/` | public |
| `POST` | `/auth/register` | public |
| `POST` | `/auth/login` | public |
| `POST` | `/auth/refresh` | refresh cookie |
| `POST` | `/auth/logout` | access cookie |
| `GET` | `/auth/me` | access cookie |
| `GET` | `/users` | public |
| `GET` | `/projects` | public |
| `GET` | `/projects/:id` | public |
| `POST` | `/projects` | auth |
| `PATCH` | `/projects/:id` | auth |
| `DELETE` | `/projects/:id` | admin |

Auth tokens are set as HTTP-only cookies (`accessToken`, `refreshToken`).
