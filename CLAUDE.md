# Zipmart Backend (NestJS) — Project Context & Coding Conventions

## Project Context

This repo is 1 of 5 sibling repos in the Zipmart system (`zipmart-frontend-web`,
`zipmart-admin-web`, `zipmart-mobile`, `zipmart-backend-nest`, `zipmart-backend-spring`).
This repo (`zipmart-backend-nest`) is the **single API Gateway/BFF** for all 3
clients — none of them ever call `zipmart-backend-spring` directly, they all
call this repo, which proxies to Spring for recommendations only.

Ports (local dev): `frontend-web:4200`, `admin-web:4300`, **`backend-nest:3000`**,
`backend-spring:8080`. Auth is Bearer JWT in the `Authorization` header for
every client (no cookies). All routes are versioned under `/api/v1/...`.

Data ownership: this repo owns and migrates (TypeORM) `users`, `products`,
`orders`, `order_items`, `cart_items`, `behavior_events` — it writes
`behavior_events`, and `zipmart-backend-spring` only reads them. The
`recommendations` table is owned exclusively by `zipmart-backend-spring`
(migrated via Flyway there, not here) — this repo only calls its REST API.

## NestJS Coding Conventions

- Each feature = **1 Module** (controller, service, entity, dto) — see
  `src/auth`, `src/products`, `src/cart`, `src/orders`, `src/behaviors`,
  `src/recommendations`.
- Validation: `class-validator` DTOs + the global `ValidationPipe` registered
  in `main.ts` (`whitelist: true, transform: true`).
- Auth: JWT Strategy via Passport (`src/auth/jwt.strategy.ts`), **Bearer token
  only** — never cookies. `@UseGuards(JwtAuthGuard)` protects authenticated
  routes; `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)`
  protects admin-only routes (`zipmart-admin-web` traffic).
- **Any module whose controller uses `JwtAuthGuard`/`RolesGuard` must import
  `AuthModule`** — the guard resolves `PassportModule`/`JwtStrategy` from the
  importing module's own DI context, not globally. `AuthModule` exports
  `PassportModule.register({ defaultStrategy: 'jwt' })` (not bare
  `PassportModule` — that omits the `AuthModuleOptions` provider the guard
  needs) and `JwtStrategy` for this reason.
- TypeORM entities use `@Entity`/`@Column` and **must give every column an
  explicit `type`** (e.g. `@Column({ type: 'varchar' })`, not bare `@Column()`)
  — migrations run through `tsx`, which doesn't emit the decorator metadata
  TypeORM needs to infer a column's type by reflection.
- Errors: throw Nest's built-in `HttpException` subclasses
  (`NotFoundException`, `ConflictException`, etc.); the global
  `HttpExceptionFilter` (`src/common/filters/`) formats all responses
  consistently.
- API versioning: global prefix `/api/v1` is set in `main.ts` — never add
  routes outside it. Bump to `/api/v2` for breaking changes and keep `v1`
  running until mobile clients on old versions age out (mobile releases lag
  behind web due to app store review).

## ESM specifics (this project uses `"type": "module"` + NodeNext)

- **Every relative import needs an explicit `.js` extension**, even though
  the source file is `.ts` (e.g. `import { AuthService } from './auth.service.js'`).
  This is required by `moduleResolution: nodenext`, not a typo.
- When importing a CJS-only package (`bcrypt`, `passport-jwt`, `ioredis`,
  etc.), check whether the installed type definitions expose a default or
  named export before assuming — `tsc` will tell you immediately if you guess
  wrong (`This expression is not constructable` = wrong style). Currently:
  `import bcrypt from 'bcrypt'` (default), `import { Redis } from 'ioredis'`
  (named), `import { Strategy, ExtractJwt } from 'passport-jwt'` (named).
- `jsonwebtoken`'s `expiresIn` option in this installed version only accepts
  **numeric seconds** (`number`), not duration strings like `'15m'`. Env vars
  `JWT_ACCESS_EXPIRES_IN_SECONDS` / `JWT_REFRESH_EXPIRES_IN_SECONDS` are
  seconds, not the `15m`/`7d` style you'd see in older Nest/JWT tutorials.

## Local Dev

- Postgres runs **natively on the host** (not Docker) — role/database `zipmart`
  on the default port `5432`. See
  `docs/PROJECT-DATABASE-LOCAL-POSTGRES-MIGRATION.md` (monorepo root) for how
  it was set up. `docker-compose.yml` only runs Redis for local dev
  (backend-spring service is commented out until that repo exists as a
  sibling checkout). Redis's host port is remapped to `6380` (not the
  default `6379`) because this machine already runs another Redis container
  on `6379` for an unrelated project — check `.env.example` before assuming
  standard ports.
- Migrations: `npm run migration:run` / `npm run migration:revert`, using
  `src/database/data-source.ts` (must have exactly **one** export — TypeORM's
  CLI loader errors if it finds more than one `DataSource` instance in the
  file, even a duplicate named+default export of the same object).
- `zipmart-backend-spring` doesn't exist yet — `RecProxyService` calling it
  fails by design right now, and that failure IS the cold-start path
  (`RecProxyService` catches the connection error and falls back to
  top-selling products, exactly like it would for a real cold-start user).
  This is expected, not a bug, until that repo is built.

## Current State

Full module skeleton implemented and verified end-to-end against a local
Postgres/Redis (via Docker) instance: register/login/refresh, RBAC-gated
product CRUD, cart, checkout → orders, behavior tracking with the event
weight config from `docs/PROJECT-IMPLEMENTATION-PLAN.md` §4.4 (monorepo
root), and the recommendations
proxy with Redis caching + cold-start fallback. Not yet implemented: PostgreSQL
`tsvector` full-text search on products (currently plain `ILIKE`), refresh
token revocation/rotation (refresh tokens are stateless JWTs, not stored —
fine for a bootstrap, revisit before this handles real user accounts), and
cache invalidation of `rec:{userId}` on purchase events (noted as optional in
`docs/PROJECT-IMPLEMENTATION-PLAN.md` §10 at the monorepo root).
