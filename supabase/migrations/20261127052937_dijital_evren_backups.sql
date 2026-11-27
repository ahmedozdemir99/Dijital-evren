create table public.dijital_evren_backups (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  revision integer not null check (revision > 0),
  created_at timestamptz not null default now(),
  bundle jsonb not null check (
    jsonb_typeof(bundle) = 'object'
    and bundle @> '{"app":"Dijital Evrenim","scope":"full"}'::jsonb
    and jsonb_typeof(bundle -> 'data') is not distinct from 'object'
    and octet_length(bundle::text) <= 8388608
  ),
  primary key (user_id, revision)
);

alter table public.dijital_evren_backups enable row level security;
revoke all on public.dijital_evren_backups from public, anon, authenticated;
grant select on public.dijital_evren_backups to authenticated;
grant insert (revision, bundle) on public.dijital_evren_backups to authenticated;

create policy "Read own backups"
  on public.dijital_evren_backups for select to authenticated
  using ((select auth.uid()) = user_id and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');

create policy "Append own backups"
  on public.dijital_evren_backups for insert to authenticated
  with check ((select auth.uid()) = user_id and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
