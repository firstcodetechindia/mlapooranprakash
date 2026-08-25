# Political Social Command Center

An AI-assisted social media command center for an elected representative and
their authorized communications team: monitor approved public sources,
research facts, draft original posts in the politician's voice, require
human approval, then schedule and publish through official platform APIs.

This system does **not** run automated engagement (no bot follows, likes,
comments, DMs, or replies), does not scrape private/authenticated content,
and never publishes anything without an explicit human approval. See
[Product Principles](#product-principles) below.

## Status: Phase 1 of 10

This repository is being built incrementally, phase by phase, rather than
all at once. **Phase 1 (this commit) ships the foundation only:**

- Next.js 16 (App Router) + TypeScript (strict) + Tailwind v4 + shadcn/ui
- PostgreSQL via Prisma 7 (driver adapter: `@prisma/adapter-pg`)
- Auth.js v5 (Credentials + JWT sessions) with an edge-safe / full config
  split so `src/proxy.ts` never touches Prisma or bcrypt
- Multi-tenant `Organization` / `User` / `Membership` model with 6-tier RBAC
  (`SUPER_ADMIN`, `ADMIN`, `EDITOR`, `APPROVER`, `ANALYST`, `VIEWER`)
- An append-only `AuditLog` (only ever written by `src/lib/audit/log.ts`)
- Sign up (creates an Organization + its first Super Admin), sign in, sign
  out, a dashboard shell with real empty states, and a real (non-mocked)
  Team & Roles page
- Dark/light mode, responsive layout, seed script with one demo account per
  role

Everything else in the full product spec — content radar, research agent,
content generation, fact-checking, the approval workflow, the calendar,
social publishing, analytics, and so on — lands in later phases on top of
this foundation. Nothing below is a stub pretending to be finished; sections
not yet built simply aren't in the codebase yet, and their nav entries are
visibly marked "Soon" rather than linking to something fake.

## Product principles

- **Human review, always.** The AI pipeline (discover → filter → research →
  analyze → generate → fact-check → **human review** → schedule → publish)
  never skips human review for political publishing.
- **No coordinated inauthentic behavior.** No fake accounts, no bot
  engagement, no automated replies to citizens, no unauthorized scraping,
  no CAPTCHA/rate-limit bypassing.
- **Facts are labeled, not asserted.** The system distinguishes VERIFIED
  FACT, USER-PROVIDED FACT, AI INFERENCE, and UNVERIFIED INFORMATION, and
  never presents an inference as a verified fact.
- **Originality.** Reference-account monitoring produces inspiration
  summaries (topic, format, structure), never copied wording.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) + Lucide icons |
| Database | PostgreSQL |
| ORM | Prisma 7 (`prisma-client` ESM generator + `@prisma/adapter-pg`) |
| Auth | Auth.js v5 (Credentials provider, JWT sessions) |
| Validation | Zod |
| Forms | react-hook-form |

Redis/BullMQ (background jobs), S3-compatible storage, and the OpenAI
provider abstraction are wired into `.env.example` and the folder structure
already, and get their implementations in the phases that need them
(Phase 2+), per `/docs` (added as those phases land).

## Project structure

```
src/
  app/
    (auth)/         # /login, /signup — public
    (dashboard)/    # /dashboard, /settings/* — requires a session
    api/auth/       # Auth.js route handler
  components/
    ui/             # shadcn/ui primitives
    dashboard/      # sidebar, header, empty states, nav
    providers/      # theme provider, etc.
  config/           # navigation.ts, roles config
  lib/
    auth/           # Auth.js config (edge-safe + full split), session, signup
    db/             # Prisma client singleton
    audit/          # the only writer to AuditLog
    security/       # requireOrganizationAccess() — server-side tenant isolation
    ai/ social/ research/ content/ analytics/ scheduler/ storage/  # Phase 2+
  types/            # Auth.js module augmentation
  proxy.ts          # route protection (Next.js 16's middleware.ts successor)
prisma/
  schema.prisma
  seed.ts
```

Business logic stays out of UI components — pages call into `src/lib/*`
services, never Prisma directly for anything beyond simple reads.

## Local setup

### Prerequisites

- Node.js 20+
- pnpm
- A PostgreSQL database (a local Docker container is easiest)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker run -d --name pscc-db \
  -e POSTGRES_USER=pscc \
  -e POSTGRES_PASSWORD=pscc_dev_local_only \
  -e POSTGRES_DB=political_command_center \
  -p 5544:5432 \
  postgres:16-alpine
```

(Already have Postgres running some other way? Just point `DATABASE_URL` at
it instead.)

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` / `DIRECT_URL` to match the database from step 2, and
generate an `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Leave `AUTH_URL` unset locally — Auth.js infers the origin from the request
(`trustHost: true`), which matters because the dev server's port
auto-shifts when 3000 is taken.

### 4. Run migrations and seed demo data

```bash
pnpm db:migrate
pnpm db:seed
```

The seed script creates one demo organization ("Demo Office of Public
Affairs") with one account per role, all using the password `Demo12345!`:

- `super-admin@demo.local`
- `admin@demo.local`
- `editor@demo.local`
- `approver@demo.local`
- `analyst@demo.local`
- `viewer@demo.local`

### 5. Run the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000`, sign in with a demo account, or use
`/signup` to create your own organization from scratch.

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create/apply a migration (dev) |
| `pnpm db:deploy` | Apply migrations (production) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Mock mode

`MOCK_SOCIAL_APIS=true` (the `.env.example` default) is reserved for the
Phase 6 social-provider adapters, so the whole app will be runnable locally
without X/Meta developer credentials once publishing is implemented.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12); never stored in
  plaintext, never logged.
- `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) enforces
  authentication on `/dashboard/**` and `/onboarding/**` using an edge-safe
  config with zero Node-only dependencies — Prisma and bcrypt only ever run
  in the full config used by route handlers and server actions.
- `requireOrganizationAccess()` in `src/lib/security/authorize.ts` is the
  server-side tenant-isolation boundary: every cross-organization query
  must go through it rather than trusting a client-supplied
  `organizationId`.
- `AuditLog` rows are only ever written by `recordAuditLog()` — nothing else
  in the app writes to that table.
- Secrets (`AUTH_SECRET`, `DATABASE_URL`, future `OPENAI_API_KEY`, OAuth
  client secrets) are read server-side only and never sent to the browser.

## Deployment (planned — Phase 10)

Target architecture: Next.js app on Vercel, managed PostgreSQL, managed
Redis, S3-compatible object storage, and Vercel Cron triggering queued
background jobs (Vercel serverless functions cannot host a persistent
worker process, so heavy/background workloads run on separate managed
worker infrastructure). Full deployment documentation lands in
`/docs/deployment.md` alongside the Phase 10 build.
