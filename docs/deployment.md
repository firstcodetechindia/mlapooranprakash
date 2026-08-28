# Deployment

Target architecture: the Next.js app on Vercel, a managed PostgreSQL
database, S3-compatible object storage, and Vercel Cron for the two
background sweeps (scheduled publishing, analytics refresh) — no separate
worker process, since Vercel's serverless functions can't host one.

## 1. Database

Any standard PostgreSQL connection string works — the app talks to it
through `@prisma/adapter-pg`, not a Prisma-specific pooler. Managed options
that work out of the box: Neon, Supabase, Vercel Postgres, or a
self-managed instance.

1. Create the database and copy its connection string into `DATABASE_URL`.
2. Apply migrations:
   ```bash
   DATABASE_URL="<production connection string>" pnpm db:deploy
   ```
   Run this from your machine before the first deploy, and again after
   every deploy that adds a migration — `pnpm db:deploy` runs
   `prisma migrate deploy`, which only applies migrations that don't exist
   yet in that database, so it's safe to re-run.
3. Don't run `pnpm db:seed` against production — it creates demo accounts
   with a published password (`Demo12345!`), meant for local development
   only.

## 2. Object storage (required for a serverless deploy)

`getStorageProvider()` (`src/lib/storage/index.ts`) falls back to writing
uploads to local disk (`.data/uploads`) when `STORAGE_ENDPOINT` etc. are
unset. That's fine locally, but **Vercel's filesystem is ephemeral and not
shared across invocations** — an upload written by one serverless function
call is gone by the next, so local-disk storage effectively means uploads
silently disappear in production. Configure all four `STORAGE_*` variables
before going live; any S3-compatible provider works (S3 itself, Cloudflare
R2, Backblaze B2, DigitalOcean Spaces).

## 3. Environment variables

Copy every key from `.env.example` into your Vercel project's environment
variables. The ones that need care:

| Variable | Notes |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32`. Required. |
| `AUTH_URL` | Set to your production origin (e.g. `https://app.yourdomain.com`). Auth.js won't reliably infer it behind Vercel's proxy. |
| `ENCRYPTION_KEY` | `openssl rand -base64 32`. Encrypts stored social-account tokens (AES-256-GCM). **Rotating this after tokens have been stored breaks decryption of those existing tokens** — connected accounts would need to be reconnected. Generate it once, keep it stable. |
| `CRON_SECRET` | `openssl rand -base64 32`. Both cron routes return 401 if this is unset — they fail closed, never open. |
| `OPENAI_API_KEY` | Leave unset to run in AI mock mode (deterministic, no external calls, no cost) — useful for a staging environment. Set it to use real generation. |
| `MOCK_SOCIAL_APIS` | `"true"` (default) simulates every platform with no real API calls. Set to `"false"` and provide `X_CLIENT_ID`/`X_CLIENT_SECRET`/`META_APP_ID`/`META_APP_SECRET` to publish for real — see [Social platform credentials](#5-social-platform-credentials) below. |
| `STRIPE_*` | Leave all three unset to run billing in mock mode (upgrades flip the org's plan in the database instantly, no real subscription). Set all three for real Stripe billing — see [Stripe](#6-stripe-billing) below. |

## 4. Vercel project settings

- `vercel.json` sets `"framework": "nextjs"` explicitly — without it,
  Vercel has previously failed to auto-detect the framework in this repo
  ("No Output Directory named 'public' found").
- `package.json`'s `postinstall` script runs `prisma generate` — required
  because Vercel's fresh installs don't carry over the generated Prisma
  client from a previous build.
- Deploy, then visit `/signup` to create the first real organization and
  Super Admin account.

### Cron schedule and the Hobby-plan limit

`vercel.json` currently runs both crons **once daily**:

```json
"crons": [
  { "path": "/api/cron/publish-scheduled", "schedule": "0 0 * * *" },
  { "path": "/api/cron/refresh-analytics", "schedule": "0 12 * * *" }
]
```

This is a deliberate tradeoff, not the ideal behavior: Vercel's **Hobby
plan rejects any cron expression that fires more than once a day**. On
Hobby, a post scheduled for a specific time can publish up to ~24h late,
and analytics only refresh once a day (the on-page-load refresh in
`getAnalyticsSummary()` covers most of the gap for anyone actively using
the app). If real-time scheduling matters for your use case:

- **Upgrade to Vercel Pro** ($20/mo per member) and tighten the schedules
  back to something like `*/5 * * * *` for publishing and
  `*/30 * * * *` for analytics, or
- **Keep Hobby and trigger the routes externally** instead of through
  `vercel.json` — an external scheduler (cron-job.org, GitHub Actions on a
  schedule, etc.) hitting `GET /api/cron/publish-scheduled` with
  `Authorization: Bearer $CRON_SECRET` every few minutes achieves the same
  result without a Vercel plan change.

## 5. Social platform credentials

With `MOCK_SOCIAL_APIS=false`, connecting an account in Settings →
Integrations takes an access token obtained from each platform's own
developer console (X Developer Portal / Meta for Developers) — there's no
in-app OAuth redirect yet, since that needs a stable public callback URL
to register with each platform, which only exists once you have a
production domain. `X_CLIENT_ID`/`X_CLIENT_SECRET`/`META_APP_ID`/
`META_APP_SECRET` are reserved for that OAuth flow when it's built.

## 6. Stripe billing

1. Create a Product + recurring Price for the Pro plan in the Stripe
   Dashboard; copy the Price ID into `STRIPE_PRICE_ID_PRO`.
2. Copy your Secret Key into `STRIPE_SECRET_KEY`.
3. Add a webhook endpoint pointing at
   `https://<your-domain>/api/webhooks/stripe`, subscribed to at least
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
4. The webhook route verifies the Stripe signature before trusting any
   payload (`src/app/api/webhooks/stripe/route.ts`) — a request without a
   valid `stripe-signature` header is rejected with 400.

## 7. Operational notes

- **Audit log**: every sensitive action (approvals, publishes, role
  changes, billing changes) is recorded in the immutable `AuditLog` table,
  visible at `/audit` to any signed-in member. This is the first place to
  look when investigating unexpected account activity.
- **Rate limiting**: login (per email), signup (per IP), and AI-triggering
  actions (per organization) are throttled via a Postgres-backed counter
  (`RateLimitBucket` — see `src/lib/security/rate-limit.ts`). No Redis
  required; it works the same across every serverless instance since the
  counter lives in the same database as everything else.
- **Local disk vs. S3**: see [§2](#2-object-storage-required-for-a-serverless-deploy) above — don't deploy to Vercel without configuring S3-compatible storage.
