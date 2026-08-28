# Political Social Command Center

An AI-assisted social media command center for an elected representative and
their authorized communications team: monitor approved public sources,
research facts, draft original posts in the politician's voice, require
human approval, then schedule and publish through official platform APIs.

This system does **not** run automated engagement (no bot follows, likes,
comments, DMs, or replies), does not scrape private/authenticated content,
and never publishes anything without an explicit human approval. See
[Product Principles](#product-principles) below.

## What's built

- **Auth & multi-tenancy** — Auth.js v5 (Credentials + JWT), an
  `Organization` / `User` / `Membership` model, 6-tier RBAC (`SUPER_ADMIN`,
  `ADMIN`, `APPROVER`, `EDITOR`, `ANALYST`, `VIEWER`), and a server-side
  tenant-isolation boundary (`requireOrganizationAccess()`) that every
  cross-organization query goes through.
- **Politician Profile, Knowledge Base, Reference Sources** — the grounding
  material the AI pipeline draws from; document upload with text extraction
  (PDF/DOCX/TXT/CSV) and embeddings-backed retrieval.
- **Content Radar + Research Agent** — surfaces content opportunities from
  approved sources, researches a topic and labels every fact VERIFIED,
  USER_PROVIDED, AI_INFERENCE, or UNVERIFIED — never presented as more
  certain than it is.
- **Content Generation + Fact-Check + Approval workflow** — drafts are
  generated grounded only in VERIFIED/USER_PROVIDED facts, rule-based
  fact-checked against that same research (word-overlap matching, not an
  LLM re-guessing its own output), and require an Approver's sign-off
  before they can be scheduled or published.
- **Calendar** — a month view of scheduled and published posts.
- **Media Library** — image/video uploads with server-side file-signature
  verification (not just the client-supplied Content-Type).
- **Social Publishing** — connect X/Facebook/Instagram accounts (tokens
  encrypted at rest, AES-256-GCM), publish now or schedule, idempotent
  retry-after-failure. Runs against a deterministic mock provider by
  default (`MOCK_SOCIAL_APIS=true`) so the whole flow is testable without
  developer credentials on any platform.
- **Analytics** — engagement totals and a top-posts view, sourced from
  `SocialProvider.getAnalytics()`.
- **In-app Notifications** — draft lifecycle events (needs review, approved,
  rejected, published, publish failed) routed to the right role.
- **Billing (Stripe)** — mock mode by default (plan changes apply instantly
  with a full audit trail, no real subscription); real Checkout/webhooks/
  Billing Portal when Stripe keys are configured.
- **Audit Log** — an append-only trail of every sensitive action, written
  only by `recordAuditLog()`.
- **Security hardening** — Postgres-backed rate limiting (login,
  signup, AI-cost actions), upload magic-byte verification, and a fixed
  cross-tenant data-isolation bug in the publish flow (see
  `src/lib/social/publish.ts` and its test).
- **Automated tests** — `pnpm test` (Vitest) against a real Postgres test
  database; see [Testing](#testing) below.

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
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) + Phosphor icons + Framer Motion |
| Database | PostgreSQL |
| ORM | Prisma 7 (`prisma-client` ESM generator + `@prisma/adapter-pg`) |
| Auth | Auth.js v5 (Credentials provider, JWT sessions) |
| AI | Internal `AIProvider` interface — OpenAI or a deterministic mock (`src/lib/ai`) |
| Social publishing | Internal `SocialProvider` interface — X/Meta Graph API or a deterministic mock (`src/lib/social`) |
| Object storage | Internal `StorageProvider` interface — S3-compatible or local disk (`src/lib/storage`) |
| Billing | Stripe, or a mock mode that flips plan state directly |
| Scheduled jobs | Vercel Cron (no Redis/BullMQ — see [docs/deployment.md](docs/deployment.md) for why and its Hobby-plan tradeoff) |
| Testing | Vitest against a real Postgres test database |
| Validation | Zod |
| Forms | react-hook-form |

## Project structure

```
src/
  app/
    (auth)/         # /login, /signup — public
    (dashboard)/    # /dashboard, /radar, /approvals, /calendar, /media,
                     # /knowledge, /sources, /analytics, /audit, /settings/*
    api/
      auth/          # Auth.js route handler
      cron/          # Vercel Cron endpoints (CRON_SECRET-gated, fail closed)
      media/ knowledge/  # Upload endpoints
      webhooks/stripe/   # Signature-verified Stripe webhook
  components/
    ui/             # shadcn/ui primitives
    dashboard/      # sidebar, header, notifications bell, empty states
  config/           # navigation.ts, roles/content config
  lib/
    auth/           # Auth.js config (edge-safe + full split), session, signup
    db/             # Prisma client singleton
    security/       # requireOrganizationAccess(), rate-limit, file-signature
    audit/          # the only writer to AuditLog
    notifications/  # the only writer to Notification
    ai/             # AIProvider: OpenAI + mock
    social/         # SocialProvider: X/Meta + mock, token encryption, publish/schedule
    storage/        # StorageProvider: S3 + local disk
    radar/ research/ content/ factcheck/ drafts/  # the content pipeline
    knowledge/ sources/ politician/  # grounding material
    media/ analytics/ billing/       # supporting features
  test/             # shared test fixtures (src/test/fixtures.ts)
  types/            # Auth.js module augmentation
  proxy.ts          # route protection (Next.js 16's middleware.ts successor)
prisma/
  schema.prisma
  seed.ts
docs/
  deployment.md
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

Fill in `DATABASE_URL` to match the database from step 2, and generate an
`AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Also generate `ENCRYPTION_KEY` the same way (needed even locally — the
Social Publishing connect flow encrypts stored tokens with it, mock
accounts included). Leave `AUTH_URL` unset locally — Auth.js infers the
origin from the request (`trustHost: true`), which matters because the dev
server's port auto-shifts when 3000 is taken. Leave `OPENAI_API_KEY`,
`STRIPE_*`, and the `X_*`/`META_*` credentials unset to run everything in
mock mode.

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
| `pnpm test` | Run the test suite once |
| `pnpm test:watch` | Run the test suite in watch mode |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:migrate` | Create/apply a migration (dev) |
| `pnpm db:deploy` | Apply migrations (production) |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Testing

```bash
pnpm test        # run once
pnpm test:watch  # watch mode
```

Tests run against a dedicated `political_command_center_test` database
(same Postgres container as dev), not a mocked Prisma client — set it up
once:

```bash
docker exec pscc-db psql -U pscc -d postgres -c "CREATE DATABASE political_command_center_test;"
DATABASE_URL="postgresql://pscc:pscc_dev_local_only@localhost:5544/political_command_center_test?schema=public" pnpm db:deploy
```

(Swap the container name/port if yours differ from the `docker run` command
above.) Each test file creates its own `Organization` and cleans it up in
`afterEach` — see `src/test/fixtures.ts`.

## Mock mode

Three independent switches let the whole app run locally with zero external
credentials:

- **AI** — unset `OPENAI_API_KEY` and `getAIProvider()` returns a
  deterministic mock that never fabricates content (it only rearranges
  text it was actually given — see `src/lib/ai/mock-provider.ts`).
- **Social publishing** — `MOCK_SOCIAL_APIS=true` (the default) makes
  connect/publish/analytics fully simulated, no platform contacted.
- **Billing** — unset `STRIPE_*` and plan changes apply instantly in the
  database with a full audit trail, no real Stripe subscription created.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12); never stored in
  plaintext, never logged.
- `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) enforces
  authentication on `/dashboard/**` using an edge-safe config with zero
  Node-only dependencies — Prisma and bcrypt only ever run in the full
  config used by route handlers and server actions.
- `requireOrganizationAccess()` in `src/lib/security/authorize.ts` is the
  server-side tenant-isolation boundary: every cross-organization query
  must go through it rather than trusting a client-supplied
  `organizationId`.
- Rate limiting (`src/lib/security/rate-limit.ts`) is Postgres-backed, not
  in-memory — a fixed-window counter via one atomic upsert, so it works the
  same across every serverless instance without needing Redis. Applied to
  login (per email), signup (per IP), and every AI-triggering action (per
  organization).
- File uploads are checked against their actual byte signature
  (`src/lib/security/file-signature.ts`), not just the client-supplied
  Content-Type, which is trivially spoofable.
- `AuditLog` rows are only ever written by `recordAuditLog()`;
  `Notification` rows only ever by `createNotification()` — nothing else in
  the app writes to either table.
- Secrets (`AUTH_SECRET`, `DATABASE_URL`, `ENCRYPTION_KEY`,
  `OPENAI_API_KEY`, Stripe/social platform keys) are read server-side only
  and never sent to the browser.

## Deployment

See **[docs/deployment.md](docs/deployment.md)** for the full guide:
managed Postgres, object storage (required — Vercel's filesystem is
ephemeral), environment variables, the Vercel Cron Hobby-plan schedule
tradeoff, Stripe webhook setup, and social platform credentials.
