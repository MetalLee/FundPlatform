create extension if not exists pgcrypto;

create table if not exists public.tracked_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  fund_code text not null,
  fund_name text,
  fund_type text,
  manager text,
  company text,
  latest_nav numeric,
  latest_nav_date date,
  latest_nav_change_pct numeric,
  source text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, fund_code)
);

create table if not exists public.fund_holdings (
  id uuid primary key default gen_random_uuid(),
  fund_code text not null,
  report_period text not null,
  asset_type text not null,
  market text,
  symbol text not null,
  name text,
  weight_pct numeric not null,
  shares numeric,
  market_value numeric,
  source text,
  source_report_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(fund_code, report_period, symbol)
);

create table if not exists public.market_quotes (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  symbol text not null,
  name text,
  price numeric,
  previous_close numeric,
  change_pct numeric,
  currency text,
  quote_time timestamptz,
  source text,
  raw jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(market, symbol)
);

create table if not exists public.user_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  fund_code text not null,
  holding_amount numeric default 0,
  holding_shares numeric default 0,
  cost_amount numeric default 0,
  daily_invest_amount numeric default 0,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, fund_code)
);

create table if not exists public.estimate_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  fund_code text not null,
  estimate_date date not null,
  estimated_change_pct numeric,
  estimated_profit_amount numeric,
  covered_weight_pct numeric,
  top_contributors jsonb,
  warnings jsonb,
  created_at timestamptz default now(),
  unique(user_id, fund_code, estimate_date)
);

create table if not exists public.insight_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  title text not null,
  source_type text not null,
  url text,
  content text,
  related_markets text[],
  related_symbols text[],
  related_fund_codes text[],
  sentiment text,
  importance int default 3,
  collected_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists tracked_funds_fund_code_idx
  on public.tracked_funds(fund_code);

create index if not exists fund_holdings_fund_code_idx
  on public.fund_holdings(fund_code);

create index if not exists fund_holdings_symbol_idx
  on public.fund_holdings(symbol);

create index if not exists market_quotes_symbol_idx
  on public.market_quotes(symbol);

create index if not exists user_positions_fund_code_idx
  on public.user_positions(fund_code);

create index if not exists estimate_snapshots_fund_code_date_idx
  on public.estimate_snapshots(fund_code, estimate_date);

create index if not exists insight_sources_collected_at_idx
  on public.insight_sources(collected_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tracked_funds_updated_at on public.tracked_funds;
create trigger set_tracked_funds_updated_at
before update on public.tracked_funds
for each row execute function public.set_updated_at();

drop trigger if exists set_fund_holdings_updated_at on public.fund_holdings;
create trigger set_fund_holdings_updated_at
before update on public.fund_holdings
for each row execute function public.set_updated_at();

drop trigger if exists set_market_quotes_updated_at on public.market_quotes;
create trigger set_market_quotes_updated_at
before update on public.market_quotes
for each row execute function public.set_updated_at();

drop trigger if exists set_user_positions_updated_at on public.user_positions;
create trigger set_user_positions_updated_at
before update on public.user_positions
for each row execute function public.set_updated_at();

alter table public.tracked_funds enable row level security;
alter table public.fund_holdings enable row level security;
alter table public.market_quotes enable row level security;
alter table public.user_positions enable row level security;
alter table public.estimate_snapshots enable row level security;
alter table public.insight_sources enable row level security;

drop policy if exists "tracked_funds_mvp_permissive" on public.tracked_funds;
create policy "tracked_funds_mvp_permissive"
on public.tracked_funds
for all
using (user_id is null or auth.uid() = user_id)
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "fund_holdings_mvp_permissive" on public.fund_holdings;
create policy "fund_holdings_mvp_permissive"
on public.fund_holdings
for all
using (true)
with check (true);

drop policy if exists "market_quotes_mvp_permissive" on public.market_quotes;
create policy "market_quotes_mvp_permissive"
on public.market_quotes
for all
using (true)
with check (true);

drop policy if exists "user_positions_mvp_permissive" on public.user_positions;
create policy "user_positions_mvp_permissive"
on public.user_positions
for all
using (user_id is null or auth.uid() = user_id)
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "estimate_snapshots_mvp_permissive" on public.estimate_snapshots;
create policy "estimate_snapshots_mvp_permissive"
on public.estimate_snapshots
for all
using (user_id is null or auth.uid() = user_id)
with check (user_id is null or auth.uid() = user_id);

drop policy if exists "insight_sources_mvp_permissive" on public.insight_sources;
create policy "insight_sources_mvp_permissive"
on public.insight_sources
for all
using (user_id is null or auth.uid() = user_id)
with check (user_id is null or auth.uid() = user_id);
