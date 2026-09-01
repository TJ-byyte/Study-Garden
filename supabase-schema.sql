-- Study Garden — database schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.garden (
  id          text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Lock the table down. Only the service_role key (used server-side by the
-- Vercel function) can touch it; the anon/public API cannot read or write.
alter table public.garden enable row level security;
revoke all on public.garden from anon, authenticated;

-- Seed the single row the app uses.
insert into public.garden (id, data)
values ('me', '{}'::jsonb)
on conflict (id) do nothing;
