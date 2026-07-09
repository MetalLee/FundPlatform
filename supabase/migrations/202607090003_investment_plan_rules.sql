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

alter table public.user_investment_plans enable row level security;
alter table public.user_investment_orders enable row level security;

alter table public.user_investment_orders
  drop constraint if exists user_investment_orders_status_check;

alter table public.user_investment_orders
  add constraint user_investment_orders_status_check
  check (status in ('pending_nav', 'confirmed', 'failed', 'cancelled'));

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

insert into public.user_investment_plans (
  user_id,
  fund_code,
  daily_invest_amount,
  is_active,
  created_at,
  updated_at
)
select
  user_id,
  fund_code,
  coalesce(daily_invest_amount, 0),
  true,
  coalesce(created_at, now()),
  coalesce(updated_at, now())
from public.user_positions
where user_id is not null
  and coalesce(daily_invest_amount, 0) > 0
on conflict (user_id, fund_code) do update set
  daily_invest_amount = excluded.daily_invest_amount,
  is_active = true,
  updated_at = now();

comment on table public.user_investment_plans is
  'MVP daily investment display plans only. These rows do not create real subscription orders.';

comment on table public.user_investment_orders is
  'Future order workflow. pending_nav may store estimated shares, but official holding_shares are updated only after confirmed official NAV.';
