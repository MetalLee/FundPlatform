alter table public.funds
  add column if not exists sync_status text not null default 'synced',
  add column if not exists sync_requested_at timestamptz,
  add column if not exists sync_completed_at timestamptz,
  add column if not exists sync_error_message text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'funds_sync_status_check'
      and conrelid = 'public.funds'::regclass
  ) then
    alter table public.funds
      add constraint funds_sync_status_check
      check (sync_status in ('pending', 'syncing', 'synced', 'failed'));
  end if;
end $$;

alter table public.user_tracked_funds
  add column if not exists is_active boolean not null default true;

update public.user_tracked_funds
set is_active = true
where is_active is null;

create index if not exists funds_sync_status_idx
on public.funds (sync_status, sync_requested_at desc);

create index if not exists user_tracked_funds_active_fund_idx
on public.user_tracked_funds (fund_code)
where is_active = true;
