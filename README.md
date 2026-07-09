# Fund Platform

Fund Platform is a Next.js + Supabase MVP for tracking public fund holdings, personal positions, cached market quotes, and estimated daily portfolio movement. The app uses Supabase Auth with email confirmation, user-scoped private data, and a GitHub Actions AKShare worker for shared data ingestion.

## Project Goals

- Track funds by fund code.
- Sync fund basic information, disclosed holdings, and market quotes.
- Store personal position data, including holding amount, cost, shares, daily investment amount, and notes.
- Estimate fund and portfolio daily movement from public holdings and quotes.
- Collect market insights without generating investment advice in the MVP.
- Keep mock providers available so the app works without third-party API keys.

## Tech Stack

- Monorepo: `pnpm` workspace + Turborepo
- Web: Next.js App Router, React, TypeScript
- UI: shadcn/ui-style components in `packages/ui`, Tailwind CSS
- Icons: `lucide-react`
- Database: Supabase Postgres
- Data providers: mock fund and market providers for local mode; AKShare runs only in GitHub Actions
- Deployment target: Vercel

## shadcn/ui Configuration

UI primitives live in `packages/ui/src/components` and are imported from the workspace package:

```tsx
import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
```

To add a shadcn/ui component, run from the repository root:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

The CLI is configured to place shared UI components in `packages/ui`. App-specific components live in `apps/web/components`.

## Environment Variables

Copy `.env.example` to `.env.local` at the repository root and fill values for the services you enable. Root scripts explicitly load `.env` and `.env.local` through `scripts/with-root-env.sh`, so run commands from the repository root.

| Variable | Required | Scope | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preferred | Browser and server | Supabase publishable key for public client access. Preferred over legacy anon key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional fallback | Browser and server | Legacy Supabase anon key fallback. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase service role key for admin/server operations. Never expose in client components. |
| `GITHUB_WORKFLOW_DISPATCH_TOKEN` | Optional | Vercel server only | GitHub token used by the web app to trigger `workflow_dispatch` after a user adds a fund. Requires workflow permission. |
| `GITHUB_WORKFLOW_REPOSITORY` | Optional | Vercel server only | Repository slug for dispatch, for example `MetalLee/FundPlatform`. Required when dispatch token is set. |
| `GITHUB_WORKFLOW_FILE` | Optional | Vercel server only | Workflow file name. Defaults to `akshare-sync.yml`. |
| `GITHUB_WORKFLOW_REF` | Optional | Vercel server only | Git ref used for dispatch. Defaults to `main`. |
| `USE_MOCK_DATA` | Optional | Server/build | Use mock providers when `true`. Recommended for MVP local development. |
| `FINNHUB_API_KEY` | Optional | Server only | Reserved for future Finnhub market data integration. |
| `ALPHA_VANTAGE_API_KEY` | Optional | Server only | Reserved for future Alpha Vantage market data integration. |
| `CRON_SECRET` | Yes for cron | Server only | Bearer token secret for protected cron routes. |

Do not run `pnpm --filter web dev` directly when local env values are required. Use root scripts so env values are injected through Turborepo.

## Supabase Initialization

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Execute `supabase/schema.sql`.
4. Execute migrations in `supabase/migrations/`, including the auth/RLS migration.
5. Optionally execute `supabase/seed.sql`.
6. Copy project URL, publishable key, and service role key into root `.env.local`.
7. Keep `USE_MOCK_DATA=true` until real third-party providers are implemented.

Email confirmation must be enabled in Supabase Auth for local and production projects. Registration intentionally shows a confirmation-required state and app data pages require a confirmed email session.

The auth migration adds `profiles` and `user_settings`, and migrates private tables to `auth.uid() = user_id` RLS policies. The shared-data migration splits data ownership:

- Shared public cache: `funds`, `fund_navs`, `fund_holdings`, `fund_asset_allocations`, `market_quotes`, `data_sync_logs`
- User private data: `user_tracked_funds`, `user_positions`, `user_investment_plans`, `user_investment_orders`, `insight_sources`

Shared tables are readable to authenticated users. Writes are performed by the GitHub Actions worker with `SUPABASE_SERVICE_ROLE_KEY`.

## Local Development

Install dependencies:

```bash
pnpm install
```

Start the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm start:web
```

## Mock Mode

`USE_MOCK_DATA=true` makes the app use local mock fund and market providers. This mode supports:

- Funds: `000001`, `161725`, `006327`
- A-share examples: `600519`, `300750`, `000858`
- US examples: `NVDA`, `AAPL`, `MSFT`
- HK examples: `00700`, `09988`
- Mixed positive and negative quote changes

Real provider files exist as typed placeholders and intentionally do not call third-party APIs in the MVP.

## Vercel Deployment

1. Import the repository into Vercel.
2. Set the root project command to use the repository scripts.
3. Add all required environment variables in Vercel Project Settings.
4. Use the same Supabase project or a production Supabase project.
5. Deploy.

Recommended build command:

```bash
pnpm build
```

The web app is under `apps/web`, but root scripts are preferred because they load env consistently.

## Vercel Cron Configuration

The old Vercel cron routes are retained as protected no-op compatibility endpoints:

- `GET /api/cron/sync-market-data`
- `GET /api/cron/sync-fund-holdings`

Both require:

```http
Authorization: Bearer ${CRON_SECRET}
```

They do not run AKShare, scrape EastMoney/Tiantian, or perform long Python jobs. Real ingestion runs in GitHub Actions.

## AKShare GitHub Actions Worker

Worker files live under `workers/akshare_sync`. Required GitHub Secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The workflow is `.github/workflows/akshare-sync.yml` and supports manual `workflow_dispatch` with a selected task and an optional single `fund_code`.

Business data does not live in GitHub variables or GitHub Actions environment values. When a user adds a fund, the app writes `user_tracked_funds`, upserts `funds.sync_status = 'pending'`, and triggers `workflow_dispatch` for that fund if the Vercel-side GitHub dispatch token is configured. Scheduled GitHub Actions jobs query active tracked funds from Supabase instead of reading a fund list from GitHub environment variables.

Scheduled jobs use UTC cron for Beijing-time business events:

- `30 8 * * 1-5` UTC: 16:30 Beijing, sync A-share and HK quotes
- `30 13 * * 1-5` UTC: 21:30 Beijing, sync latest fund NAV
- `30 15 * * 1-5` UTC: 23:30 Beijing, sync US quotes and recalculate fund estimates
- `0 22 * * 0` UTC: Monday 06:00 Beijing, weekly fund basic information refresh
- `0 18 1 * *` UTC: first day of each month 02:00 Beijing, sync holdings disclosures, asset allocations, and bond holdings

Worker tasks:

- `sync-fund-basic`
- `sync-latest-nav`
- `sync-nav-history`
- `sync-stock-holdings`
- `sync-bond-holdings`
- `sync-asset-allocations`
- `sync-fund-disclosures`
- `sync-a-share-quotes`
- `sync-hk-quotes`
- `sync-us-quotes`
- `recalculate-estimates`
- `sync-all`

Each task writes a row to `data_sync_logs` with `source`, `task`, `status`, `target`, `item_count`, `duration_ms`, `error_code`, and `error_message`. Public table writes are idempotent upserts, so a failed worker run does not clear existing cached data.

Dashboard, Funds, and Fund Detail pages read only the Supabase cache and display freshness metadata such as `last_synced_at` and `data_source`. Estimate warnings call out stale quotes, stale public holdings, low holding coverage, failed worker runs, and workers that have not run recently without changing the estimate formula.

## Data Source Limits

- Holdings are based on public disclosures and may be delayed.
- Public reports may only include top holdings or partial asset details.
- Bonds, cash, derivatives, and manager trading between reports may be missing.
- Mock providers are deterministic and are not real market data.
- Real third-party provider integrations are not implemented in the MVP.

## Daily Investment Plan Rules

`daily_invest_amount` is an MVP planning display only. Saving it writes `user_investment_plans`; it does not create real subscription orders and does not automatically increase `holding_amount`, `cost_amount`, or `holding_shares`.

Users can still manually maintain official `holding_amount`, `holding_shares`, and `cost_amount` in Portfolio. Future automated order confirmation must use `user_investment_orders`:

- Daytime order creation can create `status = pending_nav` and may calculate `estimated_shares` from an estimated NAV.
- Pending orders must not update official `holding_shares`.
- After official NAV is published, confirmation writes `official_nav`, calculates `confirmed_shares`, sets `status = confirmed`, and only then may update official positions.
- Supported order statuses are `pending_nav`, `confirmed`, `failed`, and `cancelled`.

## Why Gains and Losses Are Estimates

The estimated change is computed from disclosed holding weights and quote changes:

```text
estimatedChangePct = sum(weightPct * quote.changePct) / 100
```

This does not represent the fund company's official NAV because:

- The latest disclosed holdings can be stale.
- The app may only cover part of the portfolio.
- Intraday manager trades are unknown.
- Non-stock assets may not be covered.
- Fund fees, subscriptions, redemptions, valuation adjustments, and FX effects may be missing.

The official NAV is always subject to fund company disclosure.

## Insights and AI Roadmap

The Insights MVP only collects structured information:

- title
- source type
- URL
- content
- related markets, symbols, and funds
- sentiment
- importance

The AI buy/sell assistance module is intentionally disabled in the MVP. A later version may add:

- source summarization
- relevance scoring against tracked funds
- risk explanations
- scenario analysis
- user-confirmed watchlist actions

It should not produce direct investment instructions without additional product, compliance, and risk controls.
