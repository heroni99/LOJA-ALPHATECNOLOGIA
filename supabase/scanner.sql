begin;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'scanner_session_status'
  ) then
    create type public.scanner_session_status as enum (
      'WAITING',
      'CONNECTED',
      'CLOSED'
    );
  end if;
end $$;

create table if not exists public.scanner_sessions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  pairing_code varchar(6) not null,
  status public.scanner_session_status not null default 'WAITING',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  constraint scanner_sessions_pairing_code_key unique (pairing_code),
  constraint scanner_sessions_pairing_code_length_check check (
    pairing_code ~ '^[A-Z0-9]{6}$'
  )
);

create index if not exists idx_scanner_sessions_store_status
  on public.scanner_sessions(store_id, status);

create index if not exists idx_scanner_sessions_expires_at
  on public.scanner_sessions(expires_at);

alter table public.scanner_sessions enable row level security;

drop policy if exists scanner_sessions_tenant_policy on public.scanner_sessions;
create policy scanner_sessions_tenant_policy
on public.scanner_sessions
for all
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.store_id = scanner_sessions.store_id
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.store_id = scanner_sessions.store_id
  )
);

commit;
