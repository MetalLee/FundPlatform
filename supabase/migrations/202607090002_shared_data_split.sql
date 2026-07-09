create table if not exists public.funds (
  fund_code text primary key,
  fund_name text,
  fund_type text,
  manager text,
  company text,
  data_source text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.fund_navs (
  id uuid primary key default gen_random_uuid(),
  fund_code text not null references public.funds(fund_code) on delete cascade,
  nav_date date not null,
  nav numeric,
  accumulated_nav numeric,
  nav_change_pct numeric,
  data_source text,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(fund_code, nav_date)
);

alter table public.fund_holdings
  add column if not exists data_source text,
  add column if not exists last_synced_at timestamptz;

update public.fund_holdings
set data_source = coalesce(data_source, source),
    last_synced_at = coalesce(last_synced_at, updated_at, created_at, now())
where data_source is null or last_synced_at is null;

create table if not exists public.fund_asset_allocations (
  id uuid primary key default gen_random_uuid(),
  fund_code text not null references public.funds(fund_code) on delete cascade,
  report_period text not null,
  asset_type text not null,
  weight_pct numeric not null default 0,
  amount numeric,
  data_source text,
  source_report_date date,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(fund_code, report_period, asset_type)
);

alter table public.market_quotes
  add column if not exists data_source text,
  add column if not exists last_synced_at timestamptz;

update public.market_quotes
set data_source = coalesce(data_source, source),
    last_synced_at = coalesce(last_synced_at, updated_at, created_at, now())
where data_source is null or last_synced_at is null;

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

create table if not exists public.user_tracked_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_code text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, fund_code)
);

create table if not exists public.user_investment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_code text not null,
  daily_invest_amount numeric default 0,
  is_active boolean default true,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, fund_code)
);

create table if not exists public.user_investment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fund_code text not null,
  trade_date date not null,
  amount numeric not null,
  status text not null default 'pending_nav',
  estimated_nav numeric,
  estimated_shares numeric,
  official_nav numeric,
  confirmed_shares numeric,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.funds (
  fund_code,
  fund_name,
  fund_type,
  manager,
  company,
  data_source,
  last_synced_at,
  created_at,
  updated_at
)
select
  fund_code,
  max(fund_name),
  max(fund_type),
  max(manager),
  max(company),
  coalesce(max(source), 'legacy'),
  max(last_synced_at),
  min(created_at),
  max(updated_at)
from public.tracked_funds
where user_id is null
  and fund_code is not null
group by fund_code
on conflict (fund_code) do update set
  fund_name = excluded.fund_name,
  fund_type = excluded.fund_type,
  manager = excluded.manager,
  company = excluded.company,
  data_source = excluded.data_source,
  last_synced_at = excluded.last_synced_at,
  updated_at = now();

insert into public.fund_navs (
  fund_code,
  nav_date,
  nav,
  nav_change_pct,
  data_source,
  last_synced_at
)
select
  nav_rows.fund_code,
  nav_rows.latest_nav_date,
  nav_rows.latest_nav,
  nav_rows.latest_nav_change_pct,
  coalesce(nav_rows.source, 'legacy'),
  coalesce(nav_rows.last_synced_at, nav_rows.updated_at, nav_rows.created_at, now())
from (
  select distinct on (fund_code, latest_nav_date)
    fund_code,
    latest_nav_date,
    latest_nav,
    latest_nav_change_pct,
    source,
    last_synced_at,
    updated_at,
    created_at
  from public.tracked_funds
  where user_id is null
    and fund_code is not null
    and latest_nav_date is not null
  order by
    fund_code,
    latest_nav_date,
    coalesce(last_synced_at, updated_at, created_at, now()) desc
) as nav_rows
on conflict (fund_code, nav_date) do update set
  nav = excluded.nav,
  nav_change_pct = excluded.nav_change_pct,
  data_source = excluded.data_source,
  last_synced_at = excluded.last_synced_at;

insert into public.user_tracked_funds (user_id, fund_code, created_at, updated_at)
select user_id, fund_code, min(created_at), max(updated_at)
from public.tracked_funds
where user_id is not null
group by user_id, fund_code
on conflict (user_id, fund_code) do nothing;

drop trigger if exists set_funds_updated_at on public.funds;
create trigger set_funds_updated_at
before update on public.funds
for each row execute function public.set_updated_at();

drop trigger if exists set_fund_asset_allocations_updated_at on public.fund_asset_allocations;
create trigger set_fund_asset_allocations_updated_at
before update on public.fund_asset_allocations
for each row execute function public.set_updated_at();

drop trigger if exists set_user_tracked_funds_updated_at on public.user_tracked_funds;
create trigger set_user_tracked_funds_updated_at
before update on public.user_tracked_funds
for each row execute function public.set_updated_at();

drop trigger if exists set_user_investment_plans_updated_at on public.user_investment_plans;
create trigger set_user_investment_plans_updated_at
before update on public.user_investment_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_user_investment_orders_updated_at on public.user_investment_orders;
create trigger set_user_investment_orders_updated_at
before update on public.user_investment_orders
for each row execute function public.set_updated_at();

alter table public.funds enable row level security;
alter table public.fund_navs enable row level security;
alter table public.fund_holdings enable row level security;
alter table public.fund_asset_allocations enable row level security;
alter table public.market_quotes enable row level security;
alter table public.data_sync_logs enable row level security;
alter table public.user_tracked_funds enable row level security;
alter table public.user_positions enable row level security;
alter table public.user_investment_plans enable row level security;
alter table public.user_investment_orders enable row level security;
alter table public.insight_sources enable row level security;

drop policy if exists "funds_read_shared" on public.funds;
create policy "funds_read_shared" on public.funds
for select to authenticated using (true);

drop policy if exists "fund_navs_read_shared" on public.fund_navs;
create policy "fund_navs_read_shared" on public.fund_navs
for select to authenticated using (true);

drop policy if exists "fund_holdings_read_shared" on public.fund_holdings;
create policy "fund_holdings_read_shared" on public.fund_holdings
for select to authenticated using (true);

drop policy if exists "fund_asset_allocations_read_shared" on public.fund_asset_allocations;
create policy "fund_asset_allocations_read_shared" on public.fund_asset_allocations
for select to authenticated using (true);

drop policy if exists "market_quotes_read_shared" on public.market_quotes;
create policy "market_quotes_read_shared" on public.market_quotes
for select to authenticated using (true);

drop policy if exists "data_sync_logs_read_shared" on public.data_sync_logs;
create policy "data_sync_logs_read_shared" on public.data_sync_logs
for select to authenticated using (true);

drop policy if exists "user_tracked_funds_select_own" on public.user_tracked_funds;
create policy "user_tracked_funds_select_own" on public.user_tracked_funds
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_tracked_funds_insert_own" on public.user_tracked_funds;
create policy "user_tracked_funds_insert_own" on public.user_tracked_funds
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_tracked_funds_update_own" on public.user_tracked_funds;
create policy "user_tracked_funds_update_own" on public.user_tracked_funds
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_tracked_funds_delete_own" on public.user_tracked_funds;
create policy "user_tracked_funds_delete_own" on public.user_tracked_funds
for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "user_investment_plans_select_own" on public.user_investment_plans;
create policy "user_investment_plans_select_own" on public.user_investment_plans
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_investment_plans_insert_own" on public.user_investment_plans;
create policy "user_investment_plans_insert_own" on public.user_investment_plans
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_investment_plans_update_own" on public.user_investment_plans;
create policy "user_investment_plans_update_own" on public.user_investment_plans
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_investment_orders_select_own" on public.user_investment_orders;
create policy "user_investment_orders_select_own" on public.user_investment_orders
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_investment_orders_insert_own" on public.user_investment_orders;
create policy "user_investment_orders_insert_own" on public.user_investment_orders
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_investment_orders_update_own" on public.user_investment_orders;
create policy "user_investment_orders_update_own" on public.user_investment_orders
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
