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

alter table public.data_sync_logs
  add column if not exists source text,
  add column if not exists task text,
  add column if not exists status text,
  add column if not exists target text,
  add column if not exists item_count int default 0,
  add column if not exists duration_ms int,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists created_at timestamptz default now();

update public.data_sync_logs
set source = coalesce(source, 'unknown'),
    task = coalesce(task, 'unknown'),
    status = coalesce(status, 'failed'),
    item_count = coalesce(item_count, 0),
    created_at = coalesce(created_at, now())
where source is null
   or task is null
   or status is null
   or item_count is null
   or created_at is null;

alter table public.data_sync_logs
  alter column source set not null,
  alter column task set not null,
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'data_sync_logs_status_check'
      and conrelid = 'public.data_sync_logs'::regclass
  ) then
    alter table public.data_sync_logs
      add constraint data_sync_logs_status_check
      check (status in ('success', 'failed'));
  end if;
end $$;

create index if not exists data_sync_logs_created_at_idx
on public.data_sync_logs (created_at desc);

create index if not exists data_sync_logs_task_created_at_idx
on public.data_sync_logs (task, created_at desc);

create index if not exists data_sync_logs_status_created_at_idx
on public.data_sync_logs (status, created_at desc);

alter table public.data_sync_logs enable row level security;

drop policy if exists "data_sync_logs_read_shared" on public.data_sync_logs;
create policy "data_sync_logs_read_shared" on public.data_sync_logs
for select to authenticated using (true);
