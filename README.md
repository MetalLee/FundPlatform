# Fund Platform

Fund Platform is a Next.js + Supabase MVP for tracking public fund holdings, personal positions, mock market quotes, and estimated daily portfolio movement. The app is built for a single-user development flow first, while keeping `user_id` fields and service boundaries ready for future Supabase Auth.

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
- Data providers: mock fund and market providers, with real-provider placeholders
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
| `USE_MOCK_DATA` | Optional | Server/build | Use mock providers when `true`. Recommended for MVP local development. |
| `FINNHUB_API_KEY` | Optional | Server only | Reserved for future Finnhub market data integration. |
| `ALPHA_VANTAGE_API_KEY` | Optional | Server only | Reserved for future Alpha Vantage market data integration. |
| `CRON_SECRET` | Yes for cron | Server only | Bearer token secret for protected cron routes. |

Do not run `pnpm --filter web dev` directly when local env values are required. Use root scripts so env values are injected through Turborepo.

## Supabase Initialization

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Execute `supabase/schema.sql`.
4. Optionally execute `supabase/seed.sql`.
5. Copy project URL, publishable key, and service role key into root `.env.local`.
6. Keep `USE_MOCK_DATA=true` until real third-party providers are implemented.

The schema enables RLS on all MVP tables and uses permissive development policies. Tables keep nullable `user_id` columns so future Supabase Auth can replace the current `userId = null` single-user flow.

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

Protected cron routes:

- `GET /api/cron/sync-market-data`
- `GET /api/cron/sync-fund-holdings`

Both require:

```http
Authorization: Bearer ${CRON_SECRET}
```

Suggested schedule:

- Market data sync: during market hours or near close, depending on the markets you support.
- Fund holdings sync: once per day at most. Public holdings usually update by report cycle, not intraday.

Example `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-market-data",
      "schedule": "0 8 * * 1-5"
    },
    {
      "path": "/api/cron/sync-fund-holdings",
      "schedule": "0 20 * * *"
    }
  ]
}
```

Vercel Cron cannot set arbitrary headers directly in `vercel.json`; use Vercel's cron protection patterns or call these endpoints from a scheduler that can attach the Authorization header.

## Data Source Limits

- Holdings are based on public disclosures and may be delayed.
- Public reports may only include top holdings or partial asset details.
- Bonds, cash, derivatives, and manager trading between reports may be missing.
- Mock providers are deterministic and are not real market data.
- Real third-party provider integrations are not implemented in the MVP.

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
