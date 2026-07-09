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

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tracked_funds_mvp_permissive" on public.tracked_funds;
drop policy if exists "tracked_funds_select_own" on public.tracked_funds;
create policy "tracked_funds_select_own"
on public.tracked_funds
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "tracked_funds_insert_own" on public.tracked_funds;
create policy "tracked_funds_insert_own"
on public.tracked_funds
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "tracked_funds_update_own" on public.tracked_funds;
create policy "tracked_funds_update_own"
on public.tracked_funds
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tracked_funds_delete_own" on public.tracked_funds;
create policy "tracked_funds_delete_own"
on public.tracked_funds
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_positions_mvp_permissive" on public.user_positions;
drop policy if exists "user_positions_select_own" on public.user_positions;
create policy "user_positions_select_own"
on public.user_positions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_positions_insert_own" on public.user_positions;
create policy "user_positions_insert_own"
on public.user_positions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_positions_update_own" on public.user_positions;
create policy "user_positions_update_own"
on public.user_positions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_positions_delete_own" on public.user_positions;
create policy "user_positions_delete_own"
on public.user_positions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "estimate_snapshots_mvp_permissive" on public.estimate_snapshots;
drop policy if exists "estimate_snapshots_select_own" on public.estimate_snapshots;
create policy "estimate_snapshots_select_own"
on public.estimate_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "estimate_snapshots_insert_own" on public.estimate_snapshots;
create policy "estimate_snapshots_insert_own"
on public.estimate_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "estimate_snapshots_update_own" on public.estimate_snapshots;
create policy "estimate_snapshots_update_own"
on public.estimate_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "estimate_snapshots_delete_own" on public.estimate_snapshots;
create policy "estimate_snapshots_delete_own"
on public.estimate_snapshots
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insight_sources_mvp_permissive" on public.insight_sources;
drop policy if exists "insight_sources_select_own" on public.insight_sources;
create policy "insight_sources_select_own"
on public.insight_sources
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insight_sources_insert_own" on public.insight_sources;
create policy "insight_sources_insert_own"
on public.insight_sources
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "insight_sources_update_own" on public.insight_sources;
create policy "insight_sources_update_own"
on public.insight_sources
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "insight_sources_delete_own" on public.insight_sources;
create policy "insight_sources_delete_own"
on public.insight_sources
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "fund_holdings_mvp_permissive" on public.fund_holdings;
drop policy if exists "fund_holdings_read_shared" on public.fund_holdings;
create policy "fund_holdings_read_shared"
on public.fund_holdings
for select
to authenticated
using (true);

drop policy if exists "market_quotes_mvp_permissive" on public.market_quotes;
drop policy if exists "market_quotes_read_shared" on public.market_quotes;
create policy "market_quotes_read_shared"
on public.market_quotes
for select
to authenticated
using (true);
