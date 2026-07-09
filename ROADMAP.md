# Fund Platform Roadmap

This roadmap covers the next development phase after the MVP: user authentication, shared market/fund data tables, scheduled AKShare data workers, user-private portfolio data, and estimate display.

## Current Baseline

- Next.js App Router app under `apps/web`.
- Shared shadcn/ui-style components under `packages/ui`.
- Supabase clients exist in `apps/web/lib/supabase`.
- Provider interfaces exist for mock/local development, but production MVP data ingestion will move to GitHub Actions workers.
- Mock mode supports full local flow with `USE_MOCK_DATA=true`.
- MVP tables already include nullable `user_id` for future multi-user support.
- Cron routes exist from the MVP, but the next architecture moves long-running market/fund sync to GitHub Actions workers.

## Product Principles

- Keep `USE_MOCK_DATA=true` fully working at every stage.
- Never expose third-party API keys or Supabase service keys to Client Components.
- Prefer shared Supabase data access and worker-owned ingestion over API-specific code in service/page layers.
- Treat fund gains/losses as estimates, not official NAV.
- Store raw third-party responses only where useful for debugging and audit.
- Use RLS and `auth.uid()` as the source of user isolation once auth ships.
- Add migrations incrementally; do not overwrite existing `schema.sql` without a clear migration path.
- Use root scripts (`pnpm typecheck`, `pnpm lint`, `pnpm build`) so env values are injected consistently.

## External References

- Supabase recommends `@supabase/ssr` for SSR clients and cookie-based auth in server-rendered apps: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase Next.js Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/nextjs
- AKShare documentation: https://akshare.akfamily.xyz/
- AKShare is the selected real data source for fund basic info, public holdings disclosure, NAVs, asset allocation, and market quotes.
- MVP AKShare runtime is GitHub Actions scheduled Python worker, not a long-running FastAPI service.

## Product Decisions

- Real fund and market data source: AKShare Python worker in GitHub Actions.
- EastMoney/Tiantian direct integration: Vercel does not call them directly; AKShare worker is the only MVP ingestion path.
- Public fund metadata, NAVs, holdings, asset allocations, and quote cache are global shared data.
- User tracked status, personal positions, investment plans, investment orders, and notes are user-private data.
- Daily auto-investment in MVP is a plan display only. It does not create real subscription orders and does not update official `holding_shares`.
- Official `holding_shares` uses official NAV confirmation only; estimated NAV must never update official shares.
- Real market data coverage for the next phase starts with CN, while AKShare function choices for HK/US are documented for future QDII support.
- Daily investment cron timezone: Beijing time, `Asia/Shanghai`.
- Local auth email confirmation: required, including local development.

### Estimation Rule

Fund daily movement is an estimate only:

```text
estimated_change_pct = sum(holding_weight_pct * stock_change_pct) / 100
```

The UI must always explain:

- The estimate is based on publicly disclosed holdings.
- Holdings may be stale.
- It does not represent the fund's real NAV.
- The fund company's official disclosure is the source of truth for real NAV.

## Target MVP Architecture

```text
GitHub Actions Cron
  -> Python + AKShare
  -> Supabase Postgres
  -> Vercel Next.js App reads Supabase
```

### Vercel Role

- Serve Next.js pages.
- Handle user interaction APIs.
- Read shared data from Supabase.
- Write user-private data to Supabase.
- Display estimates and warnings.

Vercel must not:

- run AKShare
- directly scrape EastMoney or Tiantian Fund
- run long Python data sync tasks
- perform real trades
- generate deterministic buy/sell advice

### Supabase Role

- Act as the system source of truth.
- Store all fund basic information, NAVs, holdings, asset allocations, quotes, user positions, investment plans, investment orders, estimates, and insight sources.
- Enforce RLS for user-private tables.
- Allow GitHub Actions worker to write shared public data through the service role key.

### GitHub Actions Worker Role

- Use Python + AKShare on scheduled jobs.
- Sync shared public data into Supabase.
- Use GitHub Secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- No AKShare API key is required.
- No internal token, mTLS, or private network is required for MVP.

### Data Ownership Split

Global shared data:

- `funds`
- `fund_navs`
- `fund_holdings`
- `fund_asset_allocations`
- `market_quotes`
- `data_sync_logs`

User private data:

- `user_tracked_funds`
- `user_positions`
- `user_investment_plans`
- `user_investment_orders`
- `insight_sources`

### On-Demand Sync Policy

MVP does not implement true realtime sync. When a user clicks "sync":

- Prefer reading the latest available Supabase data.
- Display `last_synced_at`.
- Display `data_source`.
- Display `data_stale_warning` when data is old or missing.

Future immediate sync path:

```text
Vercel
  -> Cloud Run / VPS FastAPI
  -> AKShare
  -> Supabase
```

## Phase 1: Supabase Auth, User Scope, and RLS

### Goals

- Add registration and login.
- Require email confirmation for registration, including local development.
- Replace `userId = null` application flow with authenticated `user.id`.
- Keep a local/dev fallback path only when explicitly configured.
- Convert permissive RLS policies to user-scoped policies.

### Scope

1. Add auth pages:
   - `apps/web/app/[lang]/auth/login/page.tsx`
   - `apps/web/app/[lang]/auth/register/page.tsx`
   - `apps/web/app/auth/callback/route.ts`
   - optional `apps/web/components/auth-form.tsx`

2. Add auth utilities:
   - server helper to get the verified current user
   - route guard helper
   - client sign-out action or route
   - middleware/session refresh if required by the current Supabase SSR pattern

3. Update Supabase clients:
   - Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - Use SSR cookie-aware server/browser clients.
   - Keep admin client server-only.

4. Database changes:
   - Add `profiles` table keyed by `auth.users.id`.
   - Add `user_settings` table for future preferences.
   - Migrate RLS policies on:
     - `tracked_funds`
     - `user_positions`
     - `estimate_snapshots`
     - `insight_sources`
   - Keep shared market/fund reference data readable where appropriate:
     - `fund_holdings`
     - `market_quotes`
   - Decide whether `tracked_funds` remains per-user or becomes shared catalog plus user watchlist.

5. Service updates:
   - API routes must call `getCurrentUserId()`.
   - Pages must load data for the authenticated user.
   - Remove direct hardcoded `null` user IDs from user-facing flows.

### Suggested Database Additions

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_currency text default 'CNY',
  timezone text default 'Asia/Shanghai',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Acceptance Criteria

- User can register, log in, log out.
- Registration requires email confirmation in local development and production.
- Unauthenticated users are redirected from app pages to login.
- Each user sees only their own tracked funds, positions, snapshots, and insights.
- Existing mock mode still works after login.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

## Phase 2: Shared Data Schema and AKShare GitHub Actions Worker

### Goals

- Split global shared fund/market data from user-private tracking and positions.
- Add Supabase schema for shared fund metadata, NAVs, holdings, asset allocations, quote cache, and sync logs.
- Add a GitHub Actions scheduled Python worker that runs AKShare and writes shared public data into Supabase.
- Keep Mock Provider available for local UI/service development.

### Database Split

Create or migrate toward these global shared tables:

- `funds`
- `fund_navs`
- `fund_holdings`
- `fund_asset_allocations`
- `market_quotes`
- `data_sync_logs`

Create or migrate toward these user-private tables:

- `user_tracked_funds`
- `user_positions`
- `user_investment_plans`
- `user_investment_orders`
- `insight_sources`

### Worker Strategy

Add a Python worker under a dedicated directory, for example:

- `workers/akshare_sync/`

The worker:

- runs in GitHub Actions
- uses `akshare`
- writes to Supabase with service role key
- logs each job to `data_sync_logs`
- is the only MVP path that talks to AKShare
- has no public HTTP endpoint

### Standardized AKShare Functions

Fund basic information:

- `fund_name_em`
- `fund_overview_em`

Latest NAV:

- `fund_open_fund_daily_em`

Historical NAV:

- `fund_open_fund_info_em`

Fund stock holdings:

- `fund_portfolio_hold_em`

Fund bond holdings:

- `fund_portfolio_bond_hold_em`

Fund asset allocation:

- `fund_individual_detail_hold_xq`

Market quotes:

- A-share: `stock_zh_a_spot_em`
- Hong Kong: `stock_hk_spot_em`
- US: `stock_us_spot_em`

### Implementation Tasks

1. Add SQL migration for the global/user split.
2. Add compatibility views or service adapters so existing pages can migrate gradually.
3. Add `workers/akshare_sync` Python project:
   - dependency manifest
   - Supabase client setup
   - sync modules for funds, NAVs, holdings, asset allocations, quotes
   - idempotent upserts
   - sync logging
4. Add GitHub Actions workflows:
   - market quote sync
   - fund latest NAV sync
   - weekly fund metadata sync
   - monthly/quarterly holdings disclosure sync
5. Update Next.js services:
   - user "add tracked fund" writes `user_tracked_funds`
   - fund detail reads `funds`, latest `fund_navs`, `fund_holdings`, `fund_asset_allocations`, and `market_quotes`
   - sync button reads Supabase freshness data, not AKShare
6. Add stale data warnings:
   - missing quote
   - stale quote
   - stale holdings disclosure
   - missing NAV
   - low coverage

### Acceptance Criteria

- GitHub Actions worker can run manually and write shared data into Supabase.
- Adding a tracked fund writes only user-private tracking state.
- Fund detail reads shared data from Supabase without calling AKShare.
- Sync logs are written for each worker job.
- Stale data warnings are visible in the UI.
- Existing mock funds still work.
- Build and lint pass.

## Phase 3: Scheduled Quote, NAV, and Holding Sync

### Goals

- Run scheduled AKShare jobs with Beijing-time business meaning.
- Keep `market_quotes`, `fund_navs`, `fund_holdings`, and `fund_asset_allocations` fresh enough for estimates.
- Use quote freshness and source metadata in estimates.

### Recommended GitHub Actions Schedule

GitHub Actions cron is UTC. The times below are Beijing time and must be converted to UTC in workflow files.

- Every day 16:30 Beijing time:
  - sync A-share quotes
  - sync Hong Kong quotes
- Every day 21:30 Beijing time:
  - sync latest fund NAV
- Every day 23:30 Beijing time:
  - sync US quotes
  - recalculate QDII / US-related fund estimates
- Weekly:
  - sync fund basic information
- Monthly or quarterly:
  - sync fund holdings disclosure
  - sync asset allocation
  - sync bond holdings

### Implementation Tasks

1. Add worker commands:
   - `sync-fund-basic`
   - `sync-latest-nav`
   - `sync-nav-history`
   - `sync-stock-holdings`
   - `sync-bond-holdings`
   - `sync-asset-allocations`
   - `sync-a-share-quotes`
   - `sync-hk-quotes`
   - `sync-us-quotes`
   - `recalculate-estimates`

2. Add workflow files:
   - `.github/workflows/sync-market-quotes.yml`
   - `.github/workflows/sync-fund-nav.yml`
   - `.github/workflows/sync-fund-metadata.yml`
   - `.github/workflows/sync-fund-disclosures.yml`

3. Add data freshness fields:
   - `last_synced_at`
   - `data_source`
   - `source_report_date`
   - `quote_time`

4. Update estimate logic:
   - read cached quotes from Supabase
   - never fetch realtime data inside Vercel request handlers
   - include estimate warnings

### Acceptance Criteria

- Scheduled worker can be run manually from GitHub Actions.
- Shared tables are updated with AKShare data.
- Vercel app displays latest cached data and freshness warnings.
- No Vercel API route calls AKShare.
- Build and lint pass.

## Phase 4: User Investment Plans and Future Orders

### Goals

- Keep MVP daily investment amount as a user plan display.
- Do not auto-generate real subscription orders in MVP.
- Do not auto-increase official `holding_shares` in MVP.
- Prepare schema for future pending/confirmed investment orders.

### MVP Rules

- User manually enters `holding_shares`.
- User manually enters `holding_amount`.
- `daily_invest_amount` is stored as a plan, not executed automatically.
- The app displays the plan and can include it in summary metrics.
- No true trade/order is created by daily plan display.

### Future Order Rules

When real auto-investment records are implemented, use `user_investment_orders`:

- `trade_date`
- `amount`
- `status`: `pending_nav` / `confirmed` / `failed` / `cancelled`
- `estimated_nav`
- `estimated_shares`
- `official_nav`
- `confirmed_shares`
- `confirmed_at`

Daytime investment flow:

- create pending order
- optionally calculate `estimated_shares`
- do not update official `holding_shares`

After official NAV is published:

- use `official_nav` to calculate `confirmed_shares`
- update `user_positions.holding_shares`
- update `user_positions.cost_amount`
- set order status to `confirmed`

### Implementation Tasks

1. Add `user_investment_plans`.
2. Add `user_investment_orders` for future order workflow.
3. Update Portfolio page:
   - show daily investment plan
   - show no-auto-execution notice
   - keep manual holding amount and shares editing
4. Remove or defer any cron that mutates shares from daily plan alone.

### Acceptance Criteria

- Daily investment amount persists as a plan.
- No cron mutates official `holding_shares` from estimated NAV.
- User can still manually edit official holding amount and shares.
- Future order table supports pending and confirmed NAV workflow.
- Build and lint pass.

## Phase 5: Unified Real Sync Pipeline

### Goals

- Combine fund disclosure sync, NAV sync, quote sync, and estimate recalculation into a reliable worker-driven sync model.
- Track sync status and data quality.
- Make data freshness visible in the UI.

### Suggested Additions

```sql
create table if not exists public.data_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  task text not null,
  status text not null,
  target text,
  item_count int default 0,
  duration_ms int,
  error_code text,
  error_message text,
  created_at timestamptz default now()
);
```

### Implementation Tasks

1. Add sync run logging helpers.
2. Add freshness indicators:
   - last fund disclosure sync
   - last quote sync
   - last estimate snapshot
3. Add admin/debug page or logs panel for sync status.
4. Split GitHub Actions worker jobs:
   - low-frequency fund disclosure sync
   - market quote sync during trading windows
   - NAV sync after fund company disclosure windows
   - estimate snapshot generation after quote/NAV sync
5. Add graceful degradation:
   - stale fund holdings warning
   - stale quote warning
   - low coverage warning
   - worker unavailable warning

### Acceptance Criteria

- `data_sync_logs` show success/failure and item counts.
- UI can explain when data was last synced.
- Estimate warnings reflect stale/missing data.
- Worker failures do not corrupt existing data.

## Phase 6: QA, Security, and Release Hardening

### Required Checks

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- SQL can run in Supabase SQL Editor.
- Auth routes work in both `/zh` and `/en`.
- RLS denies cross-user access.
- Vercel API routes do not call AKShare.
- GitHub Actions worker writes shared tables with Supabase service role key.
- Mock mode and real mode both work.

### Security Checklist

- No service role key in client bundle.
- No GitHub Actions service role key in Vercel client bundle.
- Server route errors do not leak Supabase or worker secrets.
- RLS policies use `auth.uid()` for user-owned tables.
- `getUser()` or equivalent verified auth call is used for authorization decisions.
- GitHub Actions worker secrets are stored only in GitHub Secrets.
- Raw AKShare data is sanitized before storing if needed.

### UX Checklist

- Auth pages support Chinese and English.
- Loading states only affect content regions, not stable navigation shell.
- Error states explain recovery actions.
- Data freshness and estimate limitations remain visible.
- Mobile navigation remains usable after auth changes.

## Suggested Codex Prompts

Use these prompts one at a time. Each prompt assumes the current repository state and should be run from the repository root.

### Prompt 1: Add Supabase Auth and User-Scoped Data

```text
请在当前 Next.js + Supabase 项目中实现 Supabase Auth 注册/登录/登出。

要求：
1. 使用 Supabase SSR/cookie 模式，优先使用 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY。
2. 新增 /[lang]/auth/login 和 /[lang]/auth/register 页面，支持中英文 i18n。
3. 新增 auth callback route，完成邮箱登录/注册后的跳转。
4. 注册必须要求邮箱确认，本地开发和生产环境保持一致。
5. 新增服务端 getCurrentUser/getCurrentUserId helper，API routes 和页面不能再硬编码 userId = null。
6. 未登录访问 /[lang]/dashboard、/funds、/portfolio、/insights、/settings 时跳转登录。
7. 登录后只能读取当前用户的 tracked_funds、user_positions、estimate_snapshots、insight_sources。
8. 补充 Supabase SQL migration，增加 profiles/user_settings，并将 RLS 从 MVP permissive policy 迁移到 auth.uid() 用户隔离。
9. 保持 USE_MOCK_DATA=true 可用。
10. 更新 README/AGENTS 如有必要。

验收：
- 可以注册、登录、登出。
- 注册后未确认邮箱前不能进入应用数据页。
- 两个用户数据互不可见。
- pnpm typecheck、pnpm lint、pnpm build 全部通过。
```

### Prompt 2: Add Shared Data Schema and AKShare Worker

```text
请按 ROADMAP 的新架构实现共享数据 schema 和 AKShare GitHub Actions worker。

目标：
基金基础信息、基金净值、基金持仓、资产配置、行情缓存作为公共数据存储；用户跟踪状态和个人持仓作为用户私有数据存储。

范围：
1. 新增 Supabase migration，将数据拆成：
   Global shared data: funds, fund_navs, fund_holdings, fund_asset_allocations, market_quotes, data_sync_logs。
   User private data: user_tracked_funds, user_positions, user_investment_plans, user_investment_orders, insight_sources。
2. 设计 RLS：公共数据可读，写入仅由 service role；用户私有数据按 auth.uid() 隔离。
3. 新增 workers/akshare_sync Python worker，使用 AKShare + Supabase Service Role Key 写入公共表。
4. 新增 GitHub Actions workflow，支持手动触发和定时触发。
5. Worker 使用 GitHub Secrets：SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY。
6. Vercel/Next.js 不调用 AKShare，不运行 Python 长任务，不抓取东方财富/天天基金。
7. Next.js 服务层改为读取 Supabase 公共数据和写入用户私有数据。
8. 用户点击“同步”时读取 Supabase 最近一次同步数据，并显示 last_synced_at、data_source、data_stale_warning。

验收：
- SQL migration 可在 Supabase 执行。
- GitHub Actions worker 可手动运行并写入 data_sync_logs。
- 添加跟踪基金只写 user_tracked_funds，不写公共基金元数据。
- 基金详情从 Supabase 公共表读取，不实时请求 AKShare。
- Mock 模式仍支持 000001、161725、006327。
- pnpm typecheck、pnpm lint、pnpm build 全部通过。
```

### Prompt 3: Implement AKShare Scheduled Quote/NAV/Holding Sync

```text
请实现 AKShare GitHub Actions scheduled sync，不在 Vercel 内执行实时抓取。

要求：
1. Worker 标准化使用 AKShare 函数：
   fund_name_em、fund_overview_em、fund_open_fund_daily_em、fund_open_fund_info_em、
   fund_portfolio_hold_em、fund_portfolio_bond_hold_em、fund_individual_detail_hold_xq、
   stock_zh_a_spot_em、stock_hk_spot_em、stock_us_spot_em。
2. 新增或更新 GitHub Actions schedule：
   每天 16:30 北京时间同步 A 股和港股行情；
   每天 21:30 北京时间同步基金最新净值；
   每天 23:30 北京时间同步美股行情并重新计算 QDII/美股相关基金估算；
   每周同步基金基础信息；
   每月或每季度同步基金持仓披露、资产配置、债券持仓。
3. Workflow cron 使用 UTC 表达，并在 README 注明对应北京时间。
4. market_quotes、fund_navs、fund_holdings、fund_asset_allocations 必须幂等 upsert。
5. 每个 worker job 写入 data_sync_logs。
6. Next.js 页面只读取 Supabase 缓存，并展示数据新鲜度。

验收：
- GitHub Actions 可手动触发每类同步。
- 公共表有 last_synced_at/data_source/source_report_date/quote_time 等新鲜度字段。
- Vercel API 不调用 AKShare。
- 估算逻辑读取 Supabase 缓存 quote changePct。
- pnpm typecheck、pnpm lint、pnpm build 全部通过。
```

### Prompt 4: Add User Investment Plans and Future Orders

```text
请按 MVP 规则实现用户每日定投计划展示和未来订单表，不要自动生成真实申购订单。

目标：
daily_invest_amount 只作为计划展示；正式 holding_shares 只由用户手动录入或未来官方 NAV 确认订单更新。

要求：
1. 新增 user_investment_plans 表，保存每日定投计划。
2. 新增 user_investment_orders 表，为后续自动定投确认流程预留字段：
   trade_date、amount、status、estimated_nav、estimated_shares、official_nav、confirmed_shares、confirmed_at。
3. MVP 不新增 apply-daily-investments cron。
4. MVP 不根据 daily_invest_amount 自动增加 holding_amount/cost_amount/holding_shares。
5. Portfolio 页面展示 daily_invest_amount 计划，并明确“不会自动生成真实申购订单”。
6. 用户仍可手动维护 holding_amount、holding_shares、cost_amount。
7. 后续订单确认规则：
   白天生成 pending_nav order 时可计算 estimated_shares，但不更新正式 holding_shares；
   官方 NAV 发布后用 official_nav 计算 confirmed_shares，并更新正式持仓。

验收：
- daily_invest_amount 作为计划持久化。
- 没有任何 cron 或 API 会用估算 NAV 更新正式 holding_shares。
- 用户手动录入 holding_amount、holding_shares、cost_amount 后刷新仍保留。
- user_investment_orders schema 支持 pending_nav/confirmed/failed/cancelled。
- pnpm typecheck、pnpm lint、pnpm build 全部通过。
```

### Prompt 5: Add Data Sync Logs and Data Freshness UI

```text
请为真实数据同步增加审计日志和数据新鲜度展示。

要求：
1. 新增或完善 data_sync_logs 表，记录 source、task、status、target、item_count、duration_ms、error_code、error_message。
2. 所有 GitHub Actions AKShare worker 任务都写入 data_sync_logs。
3. Dashboard/Funds/Fund Detail 展示最后同步时间和数据源。
4. estimate warnings 增加：行情过期、公开持仓过期、覆盖比例不足、worker 同步失败或长时间未运行。
5. 不改变估算公式，只增强可解释性。

验收：
- 成功和失败同步都能写入 data_sync_logs。
- UI 能看到关键数据 freshness。
- Worker 失败不会清空已有可用数据。
- pnpm typecheck、pnpm lint、pnpm build 全部通过。
```

### Prompt 6: Final Production Hardening

```text
请对 Auth + Supabase shared/user split + AKShare GitHub Actions worker + Vercel app 功能做最终生产化检查和修复。

检查范围：
1. 所有 API route 的错误响应符合 ApiResponse<T>。
2. Supabase service role key 只在 admin/server 文件中使用。
3. RLS 策略能阻止跨用户读取/写入。
4. 未登录用户不能访问应用数据页。
5. Mock 模式和真实模式都能跑通。
6. README、ROADMAP、AGENTS 中的开发规范保持一致。
7. 页面加载态不替换稳定顶栏和左侧栏。
8. 中英文 UI 文案完整。
9. Vercel API 不调用 AKShare，不运行 Python 长任务。
10. GitHub Actions worker 使用 Supabase Service Role Key 写公共表。

执行：
- pnpm typecheck
- pnpm lint
- pnpm build
- 必要时用 curl 验证关键 API 行为。
- 必要时手动触发 GitHub Actions workflow 验证 worker。

输出：
- 修复所有发现的问题。
- 在最终回复中列出验证结果和剩余风险。
```

## Recommended Execution Order

1. Prompt 1: Auth and user isolation.
2. Prompt 2: Shared data schema and AKShare worker foundation.
3. Prompt 3: Scheduled quote/NAV/holding sync.
4. Prompt 4: User investment plans and future orders.
5. Prompt 5: Sync logging and freshness UI.
6. Prompt 6: Production hardening.

## Resolved Decisions

- Fund metadata and market data ownership: global shared data.
- Tracked status and personal positions: per-user private data.
- Database split:
  - Global shared data: `funds`, `fund_navs`, `fund_holdings`, `fund_asset_allocations`, `market_quotes`, `data_sync_logs`.
  - User private data: `user_tracked_funds`, `user_positions`, `user_investment_plans`, `user_investment_orders`, `insight_sources`.
- MVP AKShare deployment: GitHub Actions scheduled Python worker.
- Vercel role: Next.js UI, user interaction APIs, Supabase reads, user-private writes, estimate display.
- Vercel non-goals: no AKShare runtime, no EastMoney/Tiantian realtime scraping, no long-running Python sync.
- Supabase role: system source of truth for shared data and user-private data.
- GitHub Actions auth: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only; no AKShare API key, internal token, mTLS, or private network.
- On-demand sync: MVP reads latest Supabase cached data and displays freshness/stale warnings.
- Standard AKShare functions:
  - `fund_name_em`
  - `fund_overview_em`
  - `fund_open_fund_daily_em`
  - `fund_open_fund_info_em`
  - `fund_portfolio_hold_em`
  - `fund_portfolio_bond_hold_em`
  - `fund_individual_detail_hold_xq`
  - `stock_zh_a_spot_em`
  - `stock_hk_spot_em`
  - `stock_us_spot_em`
- Sync schedule:
  - 16:30 Beijing time: A-share and Hong Kong quotes.
  - 21:30 Beijing time: latest fund NAV.
  - 23:30 Beijing time: US quotes and QDII/US-related estimate recalculation.
  - Weekly: fund basic information.
  - Monthly or quarterly: holdings disclosure, asset allocation, bond holdings.
- Holding shares rule: official `holding_shares` only uses official NAV confirmation; estimated NAV must not update official shares.
- MVP investment rule: `daily_invest_amount` is a plan display only; no real subscription order and no automatic share increase.
- Future investment order rule: use `user_investment_orders` with `pending_nav` then `confirmed` after official NAV.
- Estimate rule: fund daily movement is only an estimate based on public disclosed holdings and quote changes.
- MVP Next.js API role: add tracked fund, query fund list/detail, set personal positions/plans, save insights, read estimates.
- MVP Next.js API non-goals: no AKShare calls, no long sync tasks, no realtime scraping, no real trades, no deterministic buy/sell advice.
- Upgrade path:
  - MVP: GitHub Actions + AKShare + Supabase + Vercel.
  - Enhanced: GitHub Actions scheduled sync plus Cloud Run / Oracle Free VM / VPS FastAPI for user-triggered sync.
  - Production: independent sync service + queue + task status table + data quality monitoring + multi-source fallback.
- Daily investment timezone: Beijing time, `Asia/Shanghai`.
- Local auth email confirmation: yes, required in local development.
