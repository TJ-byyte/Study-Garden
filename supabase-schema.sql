-- Study Garden — database schema (multi-user)
-- Run once: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run; every statement is idempotent.

-- One row per signed-in user. The browser reads and writes this table directly
-- with the public anon key + the user's login token; Row-Level Security below is
-- what keeps one person's garden private from everyone else.
create table if not exists public.gardens (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.gardens enable row level security;

drop policy if exists "own garden read"   on public.gardens;
drop policy if exists "own garden insert" on public.gardens;
drop policy if exists "own garden update" on public.gardens;

create policy "own garden read"
  on public.gardens for select
  using (auth.uid() = user_id);

create policy "own garden insert"
  on public.gardens for insert
  with check (auth.uid() = user_id);

create policy "own garden update"
  on public.gardens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.gardens to authenticated;

-- The legacy single-row table from the passcode era. Kept only as a backup of the
-- original owner's garden so the one-time migration below can read from it.
-- You can `drop table public.garden;` once migration is done and verified.
create table if not exists public.garden (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.garden enable row level security;
revoke all on public.garden from anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- ONE-TIME MIGRATION — run this SEPARATELY, only after you have signed in with
-- Google on the live site at least once (that creates your auth user + row).
-- It copies the old shared garden into your personal account.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- insert into public.gardens (user_id, data, updated_at)
-- select u.id, g.data, now()
-- from auth.users u
-- join public.garden g on g.id = 'me'
-- where u.email = 'tima.janayev@gmail.com'
-- on conflict (user_id) do update set data = excluded.data, updated_at = now();
