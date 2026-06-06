# UP CAT Simulator

>A free, full-stack practice platform for the **UP College Admission Test (UPCAT)** – timed mock exams, instant scoring, per-subject analytics, and a review mode that explains every answer.

>⚠️ **Disclaimer** – This project is an **independent, non-commercial study aid**. It is *not affiliated with*, endorsed by, or sponsored by* the University of the Philippines or the UP Office of Admissions. All question content is contributed by volunteers for educational purposes only.
>
><p>
<a href="https://upcat-simulator.example.com">Live demo ></a>
</p>

## Tech stack

![React](https://img.shields.io/badge/React-18-61D4FB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Functions-000?logo=vercel&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20%2B%20S3-F99900?logo=amazonaws&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Authentic exam flow** – 4 subjects (Language Proficiency, Reading Comprehension, Science, Math), timed, randomized question order
- 📚 **Practice modes** – full mock or per-subject quick drill
- 📊 **Instant scoring + breakdown** by subject, difficulty, and topic
- 🔄 **Review mode** – see correct answer + worked solution for every item
- 📊 **Stats dashboard** – progress over time, weak areas, leaderboard
- 🔑 **Account system** – email verification, password reset (via Resend)
- 💼 **Accessible** – skip-link, focus management, reduced-motion support
- 🔗 **Code-split** routes with a hardened security baseline (CSP/HSTS/X-Frame-Options)

## Screenshots

| Landing | Dashboard | Exam | Results |
|---------|-----------|------|---------|
| _placeholder_ | _placeholder_ | _placeholder_ | _placeholder_ |

## Prerequisites

- **Node.js 20+** (use `nvm`/`fpm` to pin)
- **MongoDB Atlas** account (free M0 cluster is enough to start)
- **Resend** API key for transactional email (verify, reset)
- One of:
    - **Vercel** account (simplest path), or
    - **AWS** account with permissions for S3, CloudFront, Lambda, API Gateway, SSM

## Getting started

```bash
# 1. Clone
git clone https://github.com/your-org/upcat-simulator.git
cd upcat-simulator

# 2. Install (npm workspaces)
npm install

# 3. Configure environment
cp client/.env.example client/.env
cp api/.env.example     api/.env
# Edit api/.env and fill in MONGODB_URI, JWT_SECRET, EMAIL_SERVICE_API_KEY, ...

# 4. One-time DB bootstrap
npm run setup:indexes   # creates MongoDB indexes
npm run seed           # safe insert (skips if collection non-empty)
npm run seed --workspace=api
# npm run seed:clean    # wipe & reseed

# 5. Run locally
npm run dev            # Vite on :5173
npm run dev:api        # vercel dev on :3001 (in another terminal)

# 6. Run all E2E tests (from project root)
npm run e2e

# (from client folder)
npx playwright test e2e/01-public-pages.spec.ts
npx playwright test e2e/01-public-pages.spec.ts --grep "redirects to /login when unauthenticated"

# 7. Open video/HTML report after run
npm run e2e:report

Open <http://localhost:5173>.

### End-to-end test

```bash
API_BASE_URL=http://localhost:3001/api \
MONGODB_URI=mongodb+srv://... \
MONGODB_DB_NAME=upcat_simulator \
| npm run test:integration
```

Registers a temp user, runs the full exam flow, fetches stats, and cleans up. Exits non-zero on any failure.

## Deployment

This project supports **three deployment options** for maximum flexibility:

### Option A - Cloudflare Pages + Workers (Recommended Primary)
Cloudflare provides zero cold-start latency, global edge network, and integrated DDoS protection.

**Setup:**

1. Create a Cloudflare account and note your **Account ID** and **Zone ID**.
2. Install Wrangler: `npm install -g wrangler`
3. Configure [wrangler.toml](wrangler.toml) with your IDs:
```toml
account_id = "YOUR_ACCOUNT_ID_HERE"
zone_id = "YOUR_ZONE_ID_HERE"
```
4. Set environment secrets:
```bash
wrangler secret put MONGODB_URI
wrangler secret put JWT_SECRET
wrangler secret put EMAIL_SERVICE_API_KEY
# ... add all secrets from api/.env.example
```
5. Deploy:
```bash
DEPLOY_TARGET=cloudflare ./scripts/deploy.sh
```

**GitHub Actions CI/CD:**

Add the official [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action) to your workflow. Set `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_PROJECT_NAME` as repository secrets.

**Key benefits:**

- Zero cold-start latency (always warm)
- Global edge network (automatic geo-replication)
- Native DDoS protection
- Built-in analytics and logging
- Cheaper than Lambda for consistent traffic

**Troubleshooting:**

- If `wrangler deploy` fails, ensure `CLOUDFLARE_API_TOKEN` has `account:cloudflare_pages:edit` permission.
- Check the [Cloudflare Pages docs](https://developers.cloudflare.com/pages/) for region/timeout limits.

---

### Option B – Vercel (Flexible Alternative)

Vercel offers integrated preview deployments, automatic CI/CD, and simplicity.

**Setup:**

1. Link your GitHub repo to Vercel.
2. Set environment variables in the Vercel Dashboard:
```bash
MONGODB_URI
JWT_SECRET
EMAIL_SERVICE_API_KEY
FRONTEND_URL
# ... all from api/.env.example
```
3. Deploy:
```bash
npm i -g vercel
vercel link      # one-time
VERCEL_PROD=1 ./scripts/deploy.sh
```

Or push to `main` – the [GitHub Actions workflow](.github/workflows/deploy.yml) will run lint/typecheck/build and deploy via `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets.

**Key benefits:**

- Integrated preview deployments per PR
- Automatic CI/CD via GitHub integration
- One-click rollbacks
- Built-in analytics
- Simpler local development with `vercel dev`

**Limitations:**

- Cold-start latency on serverless functions (~100-500ms)
- Best for variable workloads; less cost-efficient for consistent high traffic

---

### Option C – AWS (S3 + CloudFront + Lambda)

For organizations already invested in AWS infrastructure.

**Setup:**

Reference IaC fragments live in [infra/aws/](infra/aws). End-to-end flow:

1. Create the S3 bucket + CloudFront distribution
   from [infra/aws/cloudfront-distribution.json](infra/aws/cloudfront-distribution.json) (SPA fallback: 403/404 → `/index.html`).
2. Push all secrets to **SSM Parameter Store** under `/upcat/prod/...` (commands in [infra/aws/README.md](infra/aws/README.md)).
3. Deploy:
```bash
DEPLOY_TARGET=aws \
AWS_REGION=ap-southeast-1 \
S3_BUCKET=upcat_frontend \
CLOUDFRONT_DISTRIBUTION_ID=ABCDEFG \

FRONTEND_URL=https://upcat.example.com \
./scripts/deploy.sh

[scripts/deploy.sh](scripts/deploy.sh) builds the Vite bundle, syncs to S3 with the correct cache headers, invalidates CloudFront, and runs `serverless deploy` for the Lambda backend defined in [serverless.yml](serverless.yml).

**GitHub Actions CI/CD:**
Dispatch the [Deploy workflow](.github/workflows/deploy.yml) with input `target-aws`; OIDC role assumption uses `AWS_DEPLOY_ROLE_ARN`.

**Key benefits:**

- Full control of infrastructure
- Can integrate with existing AWS services (RDS, Secrets Manager, etc.)
- Predictable cost for stable workloads

**Considerations:**

- More setup and maintenance required
- Cold-start latency on Lambda functions
- Requires AWS CLI and Serverless Framework

---

### Comparison Matrix

| Feature | Cloudflare | Vercel | AWS |
|---------|------------|--------|-----|
| **Cold-start latency** | ~0ms | ~100-500ms | ~100-500ms |
| **Global CDN** | Yes (global edge) | Yes | Yes (CloudFront) |
| **Setup complexity** | Low | Very low | Medium-High |
| **Cost model** | Pay-per-request | Generous free tier | Pay-per-GB/hour |
| **CI/CD integration** | GitHub Action | Native | GitHub Action |
| **Preview deployments** | Limited | Excellent | Manual |
| **Recommended for** | Production traffic | Development/staging | Large enterprises |

---

For a detailed deployment guide covering environment setup, secret management, and troubleshooting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## API reference

All routes are mounted under `/api`. Auth-protected routes expect `Authorization: Bearer <jwt>`.

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|--------------|
| POST   | `/register` | – | Create account, send verification email |
| POST   | `/verify-email` | – | Confirm email with one-time token |
| POST   | `/login` | – | Returns JWT and user profile |
| GET    | `/me` | √ | Current user profile |
| POST   | `/forgot-password` | – | Send password-reset email |
| POST   | `/reset-password` | – | Set new password with reset token |

### Exam (`/api/exam`)

| Method | Path | Auth | Description |
|--------|------|------|--------------|
| POST   | `/start` | √ | Create a new exam session (mode: "full" \| "subject") |
| GET    | `/sessions` | √ | List user's exam sessions |
| GET    | `/:sessionId/questions` | √ | Fetch questions for a session |
| POST   | `/:sessionId/answer` | √ | Record a single answer |
| POST   | `/:sessionId/answer-bulk` | √ | Record many answers in one round-trip |
| POST   | `/:sessionId/submit` | √ | Finalize, compute score, persist results |
| GET    | `/:sessionId/review` | √ | Per-question review with correct answer + explanation |

### Stats (`/api/stats`)

| Method | Path | Auth | Description |
|--------|------|------|--------------|
| GET    | `/overview` | √ | High-level KPIs (avg score, sessions, streak) |
| GET    | `/summary` | √ | Detailed score summary |
| GET    | `/subject-breakdown` | √ | Score by subject |
| GET    | `/difficulty-breakdown` | √ | Score by question difficulty |
| GET    | `/progress-over-time` | √ | Time-series of scores |
| GET    | `/weak-areas` | √ | Topics with lowest accuracy |
| GET    | `/leaderboard` | – | Anonymized top scores |

### Misc

| Method | Path | Auth | Description |
|--------|------|------|--------------|
| POST   | `/contact` | – | Submit contact form (rate-limited 3/hour/IP) |
| GET    | `/health` | – | AWS deployment only - liveness probe |

## Security

The platform applies defense-in-depth across the stack:

- **HTTP headers** – CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy – enforced via `vercel.json` and a CloudFront `ResponseHeadersPolicy`.
- **CORS** allow-list – only `FRONTEND_URL` (plus localhost in dev) is accepted; preflight handled in [api/src/security.ts](api/src/security.ts).
- **Rate limiting** – MongoDB sliding-window limiter:
  - Auth endpoints: **5 / min / IP**
  - Exam endpoints: **30 / min / user**
  - Contact form: **3 / hour / IP**
  - Stats: **60 / min / user**
- **Input sanitization** – server-side `sanitizeText` strips HTML/control chars; client uses DOMPurify before rendering
```markdown
user-supplied strings.
- **MongoDB** - only the official Node driver with parameterized filters; no string interpolation into query bodies.
- **JWT** - HMAC-SHA256 with a 256-bit secret pulled from SSM (`SecureString`).
- **Secrets** - never committed; loaded from Vercel env or AWS SSM Parameter Store.

## Project structure

```markdown
upcat/
├── client/                   # Vite + React + Tailwind 4 frontend
│   ├── src/                  # Navbar, Footer, Modal, Toast, Seo, ...
│   │   ├── components/      # Landing, Login, Dashboard, Exam, Stats, ...
│   │   ├── pages/           # Zustand stores
│   │   ├── stores/          # Code-split routes
│   │   └── router.tsx       # App entry - ErrorBoundary > HelmetProvider > Router
│   └── main.tsx             # .env.example
├── api/                      # Vercel-style serverless functions
│   ├── functions/           # auth/, exam/, stats/, contact
│   │   ├── src/             # db, auth, email, security, exam/stats helpers
│   │   └── scripts/         # setup-indexes, seed
│   └── lambda.ts            # AWS Lambda entry (wraps functions with express)
├── shared/                   # Types shared by client + api
└── infra/aws/
    ├── scripts/             # S3 + CloudFront IaC reference docs
    │   ├── deploy.sh        # One-shot AWS deployment
    │   └── test-integration.mjs  # End-to-end API smoke test
    ├── .github/workflows/   # Lint + typecheck + test + build on PR
    │   ├── ci.yml           # Deploy to Vercel/AWS on push to main
    │   └── deploy.yml       # Lambda + API Gateway config
    ├── serverless.yml        # Vercel rewrites + security headers
    └── vercel.json           # npm workspaces root
```

## Contributing

1. Fork and create a feature branch from `main`.
2. Run `npm install` then `npm run dev` + `npm run dev:api`.
3. Keep changes focused; one feature/fix per PR.
4. Match existing style - TypeScript strict, ESLint clean, no `any` without a reason.
5. Before pushing: `npm run lint`, type-check both workspaces, and add/update tests where practical.
6. Open a PR – CI will run lint, type-check, and the build.

Bug reports and question contributions are welcome via GitHub Issues. For question submissions please include the source citation; we do not accept content copied from copyrighted review materials.

## License

[MIT](LICENSE) © UPCAT Simulator contributors.

## Social Login (Phase 10)

Reviewees can sign up or sign in with Google, LinkedIn, or Facebook in addition to email/password. Multiple social accounts can be linked to the same user. Admins enable each provider at runtime under `/admin/auth-providers`.

### Required environment variables (api/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | yes | Mongo connection string. |
| `JWT_SECRET` | yes | Symmetric secret for the user JWT (HS256). |
| `ENCRYPTION_KEY` | yes | 64-character hex (= 32 bytes) AES-256-GCM key used to encrypt OAuth client secrets and stored provider tokens. |
| `RESEND_API_KEY` | optional | Outbound email (verification + password reset). |
| `ADMIN_SEED_PASSWORD` | optional | Used by `npm run seed` to create the default admin user. |

Provider client IDs / client secrets / redirect URIs / scopes are **not** read from env; they live in the `auth_provider_settings` MongoDB document and are edited from the admin UI. Secrets are encrypted at rest with "ENCRYPTION_KEY".

### One-time migration

After deploying Phase 10, run:

```bash
cd api
npm run setup-indexes   # creates new indexes (user_identities, oauth_state, ...)
npm run migrate:auth    # backfills users.auth and seeds auth_provider_settings
```

## New API endpoints

Public:
- `GET /api/auth/providers` which providers are enabled (clientId only).
- `POST /api/auth/social/:provider/start` begin OAuth (PKCE + state + nonce).
- `POST /api/auth/social/:provider/callback` exchange code, log in or link.

Authenticated:
- `GET /api/auth/linked-accounts`
- `POST /api/auth/unlink`
- `POST /api/auth/set-password`
- `DELETE /api/account` permanent account deletion.

Admin:
- `GET /api/admin/auth/providers`
- `PUT /api/admin/auth/providers/:provider`
- `POST /api/admin/auth/providers/:provider/test`
### Security notes

- Authorization Code Flow with **PKCE (S256)** is mandatory.
- `state` is single-use and TTL-protected (10 min) via the `oauth_state`
  | collection (TTL index on `expiresAt`).
- OIDC `id_token` signatures are verified against the provider JWKS; `iss`,
  `aud`, `nonce`, and `exp` are all checked.
- Client secrets and stored OAuth tokens are encrypted with AES-256-GCM and
  versioned (`v1:iv:tag:ct`) so future key rotations remain backward-compatible.
- `/api/auth/social/:provider/start` and `/callback` are rate-limited to
  10 req/min/IP.
- Unlinking the last sign-in method is blocked when the user has no password
  set ("Set a password first or keep at least one linked provider.")

## Account recovery, support, and data rights (Phase 11)

The platform ships a full **account-recovery, support, and GDPR-style data-rights**
stack & built into the same workspace; no external services required beyond Resend for email and MongoDB for storage.

### Reviewee surface

- **Recovery codes** Generate 10 single-use codes from /settings (bcrypt-hashed).
- **Security questions** Pick 3 of 10 from the bank; answers are bcrypt-hashed.
- **Account recovery flow** /recover-account offers three pathways (recovery
  code, security questions, contact support); successful verification issues a
  short-lived recovery JWT and routes to /recover-account/reset.
- **Support tickets** /support lists the user's tickets; new ticket modal +
  /support/:ticketNumber thread for replies. Guests can open a ticket via
  /support/guest (math CAPTCHA + honeypot, rate-limited).
- **Data export** /settings panel lets users pick what to include (profile,
  exam history, stats, activity log), pick JSON or CSV, and download a packaged
  blob (inline =12 MB, GridFS bucket above). Limited to 1 export per 24 hours.
- **Scheduled deletion** /settings danger zone schedules deletion with a 7-day
  grace period. The user receives an email with a one-click confirm + cancel link
  (48-hour confirm TTL); /account/deletion/confirm handles the public landing.
  The deletion runs via the hourly cron job and emails a final receipt.

### Admin surface

- **/admin/support** KPI dashboard (open, in-progress, awaiting-user, average
  resolution time, oldest open, 30-day open/resolve trend, by-type and
  by-priority breakdowns, recent feed).
- **/admin/support/tickets** Filterable table (status, type, priority, search,
  pagination).
- **/admin/support/tickets/:n** Thread + reply (with **internal note** toggle),
  status/priority/assignee controls, identity-verification modal, unlock-account
  shortcut, link to the merge wizard.
- **/admin/support/merge** 6-step wizard for combining two accounts (re-auth
  with admin password, transfers user identities, optional exam sessions,
  always contact messages; soft-deletes secondary with mergedInto stamp).
- **/admin/support/identity-disputes** List + inline decision modal
  (transfer_identity, reject_claim, remove_identity).
- **/admin/data-requests** Three tabs: Exports, Deletions, Deletion Log (with
  emailHash search for compliance look-ups).

### Backend infrastructure

- **Endpoints** added under /api/auth/recovery-codes, /api/auth/security-questions,
  /api/auth/recover-account, /api/account/data-export, /api/account/deletion-request,
  /api/support/tickets (+ /guest, /captcha), /api/admin/support/*,
  /api/admin/support/merge-accounts, /api/admin/support/identity-disputes,
  /api/admin/data-requests, /api/admin/deletion-log, /api/admin/users/:id/unlock.
- **Login lockout** Soft (5 fails ? 15 min), medium (10 ? 1 h, locked-email),
  hard (20 ? indefinite). Returns 423 when blocked.
- **Cron jobs** (configured in vercel.json cron):
  - **execute-deletions** (hourly) runs due deletion requests.
  - **cleanup-exports** (every 6 h) removes expired export blobs.
  - **auto-close-tickets** (daily) auto-closes awaiting_user tickets >14 d.
  - **inactivity-check** (weekly) reminder at 365 d, flag at 730 d.
    All cron endpoints require the SCHEDULED_FUNCTIONS_SECRET env var (Bearer
    or ?secret=).
- **Email templates** 12 new transactional templates: export ready, deletion
  requested/confirmed/executed/cancelled, ticket received/update, account merged,
  dispute notification/resolved, account locked, inactivity reminder. All routed
  through `safeSend` which no-ops when `RESEND_API_KEY` is absent.
- **Indexes** Added in `api/src/setup-indexes.ts` for recovery_codes,
  support_tickets, data_requests, identity_disputes, deletion_log, and a shared
  counters collection (ticket numbers).
- **CAPTCHA** HMAC-SHA256 signed stateless math challenge with 10-min TTL.
- **Storage** Exports inline as `Binary` =12 MB, otherwise GridFS bucket
  `data_exports`. Tombstones in `deletion_log` for compliance audit
  (only emailHash retained, never the address itself).

### Environment variables

Add to `api.env`:

```bash
SCHEDULED_FUNCTIONS_SECRET=use-a-strong-random-string
CAPTCHA_HMAC_SECRET=another-strong-random-string
```

When deploying to Vercel, also configure these in the project's environment
variables. The 4 cron jobs are wired automatically via the `cron` block in
`vercel.json`.

---

## Phase 12 - Gamification (XP, Levels, Achievements, Streaks)

Phase 12 adds a full engagement layer on top of the existing exam workflow.

Spaced-repetition practice mode and PWA / offline support are scoped for follow-up phases.

### Mechanics

- **XP curve**: level N requires `floor(100 * (N-1)^1.5)` cumulative XP, capped at level 100 (UPCAT Champion). Titles change every 10 levels.
- **Streak multipliers**: x1.00 (0–2 days), x1.25 (3–6), x1.50 (7–13), x1.75 (14–29), x2.00 (30+). Multiplier is applied to every XP grant except the daily-login bonus and admin grants.
- **Per-event XP** (configurable through the achievements/challenges catalog, default values in `XP_REWARDS`):
  - Exam completion: 50 + 2/correct + 25 (>80%) + 50 (>90%) + 200 (perfect)
  - Per-subject perfect: 30
  - Daily login: 10 (no multiplier)
  - Review all incorrect: 20
- **Achievements**: 30+ seeded across `milestone`, `performance`, `streak`, `dedication`, `mastery`, and `social` categories with five rarities (common → legendary). Each unlock awards XP + points and emits a toast.
- **Weekly challenges**: a single random challenge is assigned every Monday (cron `assign-weekly-challenges`) drawn from `weekly_challenges_catalog`, weighted by `weight`. Progress increments on exam/practice activity; rewards are paid on the next API call after the target is met.

### New collections & indexes

- `xp_transactions` – every XP grant. Indexed by `userId+createdAt`.
- `achievements_catalog` – definitions seeded by `seed.js` or by the admin "Re-seed defaults" button. Unique on `id`.
- `weekly_challenges_catalog` – same shape. Unique on `id`.

The `users.gamification` sub-document holds level/XP/streak/stats. Legacy users are auto-backfilled with a default block on first read.

### Endpoints

- `GET /api/gamification/profile` – full profile (level, streak, recent XP).
- `GET /api/gamification/achievements` – every catalog entry + per-user progress and unlock state (hidden achievements remain blanked until unlocked).
- `GET /api/gamification/leaderboard?scope=weekly|monthly|all_time`
- `GET /api/gamification/weekly-challenge` – active challenge for caller.
- `POST /api/gamification/dismiss-notifications` – acknowledges pending achievement notifications so they stop nagging.
- `GET /api/admin/gamification` – admin overview stats.
- `POST /api/admin/gamification/grant-xp` – manually award/penalise XP.
- `GET/POST/DELETE /api/admin/gamification/achievements[:id]`
- `GET/POST /api/admin/gamification/challenges`

### Frontend

- **/profile** – level / XP progress, streak meter, weekly challenge, recent XP transactions, and the achievement gallery (filterable by category).
- **/leaderboard** – weekly / monthly / all-time tabs; the current user's rank is highlighted (or pinned below the table when off-screen).
- **Dashboard** – new gradient card surfaces level + XP progress + streak.
- **Admin → Gamification** – overview tiles, achievements table (with deactivate + re-seed), challenges table, and a manual grant-XP form.
- **XpAwardOverlay** + **AchievementToast** – celebration UI that fires on the Results page after every exam (driven by the `gamification` envelope returned from `POST /api/exam/:sessionId/submit`).

### Cron

Phase 12 adds one extra cron entry in `vercel.json`:

```
ash
0 4 * * 1    /api/cron/assign-weekly-challenges
```

Triggered by Vercel with the standard `Authorization: Bearer <SCHEDULED_FUNCTIONS_SECRET>` header.

### Seeding

`npm run -w api seed` now also calls `seedGamificationCatalogs(db)`, upserting the 30+ default achievements and 10 default weekly challenges. Re-running is idempotent.

---

## Phase 13 – Spaced Repetition Practice Mode

Phase 13 adds a personal **practice deck** powered by a relaxed SM-2 spaced-repetition algorithm. Every question a user gets wrong on an exam is automatically enrolled as a practice card; cards then resurface on a schedule that adapts to how well the user remembers them.

### Card lifecycle & SM-2

Cards transition through four statuses:

```
new → learning → review → mastered
↑    ↓
     (lapse on "again")
```

Each card stores an **ease factor** (default 2.5, floor 1.3, ceiling 3.0), an **interval** (days until next review), and a **repetitions** counter. The user rates each answered card on a four-button scale:

| Rating | Effect on ease | Interval |
|--------|-----------------|----------|
| Again | -0.20 | reset to learning (interval 0) |
| Hard | -0.15 | x `max(0.5 * ease, 1.2)` |
| Good | unchanged | x ease (standard SM-2) |
| Easy | +0.15 | x ease × 1.3 |

A card is promoted to **mastered** once its interval reaches 30 days *and* its ease is at least 2.5. A lapse ("Again") demotes it back to learning.

### Modes

- **Review Due** – only cards whose `nextReviewDate < now`.
- **Weak Areas** – auto-targets the two subjects with the lowest accuracy across your deck, then fills with due + a few new cards.
- **Subject Focus** – restrict practice to a single subject area.
- **Mixed** – due cards plus a small batch of fresh ones to keep the deck moving when nothing is overdue.

### Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/practice/start` | POST | Pick cards + create a new session. |
| `/api/practice/:sessionId/answer` | POST | Grade a card; reveal answer + rationale. |
| `/api/practice/:sessionId/rate` | POST | Apply SM-2 rating; advance card schedule. |
| `/api/practice/:sessionId/complete` | POST | Finalize, award XP, evaluate achievements. |
| `/api/practice/stats` | GET | Deck snapshot + 7-day review forecast. |
| `/api/practice/cards` | GET | Paginated deck browser (filter + search). |

`POST /api/exam/:sessionId/submit` is also extended: incorrect questions are now appended to the user's deck via `addCardsForQuestions`, and the response envelope includes `practiceCardsAdded`.

### Gamification wiring

Completing a practice session calls the same `applyRewards` / weekly challenge / achievement evaluator path as exam submit:

- `+XP_REWARDS.PRACTICE_COMPLETED` (default **30 XP**)
- `+XP_REWARDS.PRACTICE_PER_CORRECT × correctCount` (default **2 XP** each).
- Bumps `gamification.stats.practiceSessions`, feeding the `practiceSessions` achievement condition.
- Updates weekly-challenge counters `practice_sessions` and `questions_correct`.

### Collections & indexes

`practice_cards` (per-user x question):

- unique compound `{ userId: 1, questionId: 1 }`
- `{ userId: 1, status: 1, nextReviewDate: 1 }` – daily-due query
- `{ userId: 1, subjectArea: 1, status: 1 }` – subject focus & weak areas

`practice_sessions`:

- `{ userId: 1, startedAt: -1 }` – session history
- `{ userId: 1, status: 1, completedAt: -1 }` – recent completions

All Phase 13 indexes are created by `npm run -w api setup-indexes`.

### Client pages

- **/practice** – landing page with the mode picker, deck-overview tiles (deck size, due today, mastered, retention), and recent sessions.
- **/practice/:sessionId** – card-by-card flashcard UI: answer → reveal correctness + rationale → rate (Again / Hard / Good / Easy) → next card. On the final card, the session is finalized and the standard `XpAwardOverlay` + "AchievementToast" celebration UI fires.
- **/practice/stats** – deck health: status breakdown, retention %, per-subject table, 7-day review forecast, and a paginated card browser with status / search filters.

The Dashboard also surfaces an **"X cards due today"** call-to-action card once the user's deck is non-empty.

## Phase 14 – PWA, Offline Cache & Push Notifications

Phase 14 ships the final subsystem: an installable Progressive Web App, a service worker with offline caching, and Web Push notifications driven by VAPID keys and Vercel cron.

### Installable PWA

- `[client/public/manifest.webmanifest]` (client/public/manifest.webmanifest) declares the app identity, theme color, icons (192/512/maskable + SVG), and two app shortcuts (Dashboard, Practice).
- Icons are generated by a zero-dependency Node script: `node client/scripts/generate-pwa-icons.mjs`. Re-run it whenever the brand mark or palette changes.
- `[InstallPwaCard]` (client/src/components/InstallPwaCard.tsx) listens for the browser's `beforeinstallprompt` event and surfaces an unobtrusive bottom-right card. Dismissals are remembered for `PWA_INSTALL_DISMISS_DAYS` (7 days); it never appears when the app is already running in standalone mode.

### Service worker (offline + caching)

[client/public/service-worker.js] (client/public/service-worker.js) registers under scope `/` and uses three caches:

| Cache | Strategy | Contents |
|-------|----------|-----------|
| `SHELL_CACHE` | cache-first (pre-cached on install) | `"/", "/index.html", "/manifest.webmanifest"`, brand icons |
| `RUNTIME_CACHE` | cache-first + stale-while-revalidate | hashed JS/CSS chunks, fonts, images |
| `API_CACHE` | network-first with 24h TTL | allow-listed read-only API endpoints |

The cacheable API allow-list is intentionally narrow – only `/api/announcements`, `/api/status`, `/api/practice/stats`, and `/api/gamification/profile`. Authenticated mutations always go to the network. Navigation requests fall back to a minimal inline HTML page when offline.

### Push notifications (Web Push + VAPID)

- Server uses [web-push](https://www.npmjs.com/package/web-push). On push failure with `404` / `410`, the subscription is auto-pruned; other errors increment `failureCount`.
- VAPID keys are read from environment variables – set them once per deployment:

```bash
npx web-push generate-vapid-keys
# then set on Vercel / your host:
#   VAPID_PUBLIC_KEY=<generated>
#   VAPID_PRIVATE_KEY=<generated>
#   VAPID_SUBJECT=mailto:admin@example.com
```

- The client calls `GET /api/push/public-key` to fetch the public key on demand, subscribes via `PushManager.subscribe`, then POSTs the subscription record to `/api/push/subscribe`.

### API endpoints (Phase 14)

User-facing:

- `GET /api/push/public-key` – VAPID public key (503 when unset).
- `POST /api/push/subscribe` – upsert subscription by endpoint.
- `POST /api/push/unsubscribe` – remove a subscription owned by the caller.
- `GET /api/push/preferences` – list this user's subscriptions + per-type preferences.
- `PATCH /api/push/preferences` – update preferences and/or `reminderTime` (HH:mm, local) for one endpoint or all of the user's endpoints.

Admin-only:

- `POST /api/admin/push/test` – sends a test push to the admin's own subscriptions.
- `POST /api/admin/push/broadcast` – push to every subscription opted in to a notification type; optionally filtered by role.

### Notification types

Five preference keys (`PUSH_NOTIFICATION_TYPES` in `[shared/src/constants.ts]`) (shared/src/constants.ts)) – every user can toggle each one per device:

- `daily_reminder` – gentle nudge at the user's chosen local time.
- `streak_alert` – evening warning when the streak is about to lapse.
- `achievement` – fired by the gamification engine on unlock / level-up.
- `weekly_challenge` – new weekly challenge available.
- `announcement` – admin-broadcast announcements.

### Cron handlers

Both run on Vercel cron (see `[vercel.json]`):

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/study-reminders` | `0,30 * * * *` | Every 30 min; sends `daily_reminder` to subscriptions whose local time matches `reminderTime` (+30 min) and who haven't been active today. |
| `/api/cron/streak-warnings` | `* 19 * * *` | Daily 19:00 UTC; warns users with `streak.current > 0` and no activity today. |

Both endpoints require the `SCHEDULED_FUNCTIONS_SECRET` bearer token – Vercel cron is configured to send it automatically.

### Storage & indexes

`push_subscriptions` collection (one document per browser/device):

```ts
{
    userId, endpoint /* unique */, keys;
    {
        p256dh, auth
    }
    userAgent, timezone, reminderTime /* "HH:mm" */, preferences: {
        daily_reminder, streak_alert, achievement,
        weekly_challenge, announcement
    },
    createdAt, lastUsedAt, failureCount
}
```

Indexes created by `npm run -w api setup-indexes`:

- `endpoint_unique` – unique on `endpoint`.
- `by_user` – `{ userId: 1 }`.
- `daily_reminder_filter` – `{ "preferences.daily_reminder": 1, reminderTime: 1 }`.
- `streak_alert_filter` – `{ "preferences.streak_alert": 1, userId: 1 }`.

### Client surfaces

**Settings → Notifications** – per-device toggles for all 5 types, daily reminder time picker, "Disable on this device" button, and an
```markdown
"Enable notifications" CTA when no subscription exists.
- **Install banner** - global `InstallPwaCard` rendered from `main.tsx`, auto-hidden once installed.
- **Service worker registration** - `registerServiceWorker()` runs on `window.load`; it skips localhost+DEV to avoid clashing with Vite's HMR.

### Required environment

| Variable | Where | Notes |
|----------|-------|-------|
| `VAPID_PUBLIC_KEY` | api | base64url; also exposed via `/api/push/public-key`. |
| `VAPID_PRIVATE_KEY` | api | keep secret. |
| `VAPID_SUBJECT` | api | `mailto:` or `https:` URL; defaults to `mailto:admin@upcat.local`. |
| `SCHEDULED_FUNCTIONS_SECRET` | api | Reused from earlier phases; protects cron routes.

## Phase 15 - Security Hardening

Phase 15 ships a production-grade defense-in-depth security layer:
rate limiting, IP intelligence, threat scoring, CAPTCHA, bot detection,
admin console, user session management, and edge WAF configs.

### Pipeline overview

Every API handler is wrapped in `withSecurity()`
([api/src/security/middleware.ts](api/src/security/middleware.ts)), which runs the following checks **before** the handler executes:

1. **CORS** - strict allow-list of origins.
2. **Lockdown gate** - when emergency lockdown is on, non-admin traffic gets `503 Service Unavailable`.
3. **Block-list match** - IP, CIDR, fingerprint, email-domain, or UA regex (cached 60 s in [blockedEntities.ts](api/src/security/blockedEntities.ts)).
4. **Size limits** - body ≤ 1 MiB, URL ≤ 2 KiB.
5. **Sliding-window rate limits** - global → per-IP → per-endpoint ([rateLimit.ts](api/src/security/rateLimit.ts)).
6. **Body sanitization** - strips Mongo operators (`$`, `.`), prototype pollution (`__proto__`, `constructor`, `prototype`), limits depth.
7. **Security headers** - HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
8. **IP intelligence** - fire-and-forget upsert into `ip_intelligence` tracks request counts, fingerprints, associated user IDs, threat score.

### CAPTCHA system

Four challenge types ([captcha.ts](api/src/security/captcha.ts) + [Captcha_bk.tsx](client/src/components/Captcha_bk.tsx)):

| Type | Implementation |
|------|----------------|
| math | Arithmetic problem (`12 + 7 = ?`) - fast, accessible. |
| image | "Pick all the X" 3x3 grid of procedural SVG icons. |
| puzzle | Slide a piece into a notch - verifies tolerance + min solve ms. |
| pow | Client computes a SHA-256 with N leading zero bits. |

Verified challenges return a short-lived JWT (`aud: "captcha"`) that the client auto-attaches as `X-Captcha-Token` for the next request, via the [apiClient interceptor](client/src/lib/api.ts).

### Device fingerprinting

[client/src/lib/fingerprint.ts](client/src/lib/fingerprint.ts) hashes screen/timezone/language/canvas/WebGL/font signals into a SHA-256 fingerprint, sent as `X-Device-Fingerprint`. It feeds session tracking and helps detect account-sharing or credential stuffing.

#### Threat scoring

Every event nudges the source IP's threat score ([ipIntel.ts](api/src/security/ipIntel.ts)):

| Range | Reputation | Effect |
|-------|------------|--------|
| 0–24  | trusted    | Normal traffic. |
| 25–49 | neutral    | Default. |
| 50–74 | suspicious | Soft-block: CAPTCHA required. |
| 75–89 | high_risk  | Reduced rate limits. |
| 90–100| malicious  | Hard-block candidate; lockdown counts critical hits. |

Scores decay by 2 points/hour via cron so legitimate users recover.

### Admin Security Console

`/admin/security` ([AdminSecurityPage.tsx](client/src/pages/admin/AdminSecurityPage.tsx)) provides six tabs:

- **Dashboard** - KPIs, recent events, top threats, geo distribution.
- **Events** - filterable feed with dismiss / block-IP / block-user actions.
- **IP Intelligence** - sortable IP list with one-click block / unblock + CIDR block form.
- **Blocked** - CRUD across all 5 block types.
- **Config** - live JSON editor for `security_config` (password re-auth required) + lockdown control.
- **Reports** - 24h / 7d / 30d attack summaries with auto recommendations.

### User session management

`/settings` now includes a **Sessions & activity** section ([SessionsSection.tsx](client/src/components/SessionsSection.tsx)). Users see every active session (IP, location, last active) and can revoke individual sessions or every other device at once. Successful logins mint JWTs with a unique `jti` claim, tracked in `user_sessions`.

### Cron jobs
| Path | Schedule | Purpose |
|-----------------------------------|-----------|-----------------------------|
| `/api/cron/threat-score-decay` | hourly | Decay scores; reset daily counters at 00:00 UTC. |
| `/api/cron/security-cleanup` | every 15 min | Expire blocks, sessions, CAPTCHAS. |
| `/api/cron/security-report` | daily 00:00 UTC | Snapshot 24h activity to `security_reports`. |
| `/api/cron/ip-intelligence-aggregation` | daily 00:30 UTC | Flag noisy / multi-user IPs. |

### Edge WAF

Pre-built configs in [infra/edge/](infra/edge/):
- `[aws-waf.json](infra/edge/aws-waf.json) - AWS WAFv2 WebACL.
- `[cloudflare-rules.json](infra/edge/cloudflare-rules.json) - Cloudflare custom ruleset.
- `[infra/edge/README.md](infra/edge/README.md) - deployment + origin lockdown instructions.

These shed the bulk of malicious traffic at the edge so the app tier stays healthy under DDoS / scraping / credential-stuffing attacks.

### Collections introduced

- `security_config` - singleton `_id: "global"` config doc.
- `security_events` - append-only event log (TTL 90 days).
- `ip_intelligence` - per-IP record (score, activity, fingerprints).
- `blocked_entities` - active block rules across 5 entity types.
- `rate_limit_buckets` - sliding-window counters (TTL 24h).
- `captcha_challenges` - pending challenges (TTL 10 min).
- `user_sessions` - JWT `jti` tracking (TTL 30 days).
- `security_reports` - daily snapshot for audit trail.

### Required environment

| Variable | Where | Notes |
|----------|-------|--------------------------------|
| `JWT_SECRET` | api | Existing – now also signs CAPTCHA tokens + session `jti`s. |
| `ADMIN_WHITELIST_IPS` | api | Optional comma-separated list; bypasses rate limits. |
| `SCHEDULED_FUNCTIONS_SECRET` | api | Existing – protects all new cron routes. |
| `ALLOWED_ORIGINS` | api | Existing – strict CORS allow-list. |