-- Catalyst — Supabase schema
-- Run this once in your project's SQL Editor (Supabase dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is guarded (if not exists / drop-then-create for policies).

-- One row per user, holding their entire tracked dataset as JSON. This
-- mirrors exactly what used to live in localStorage under
-- `catalyst:data:${userId}` — same shape, same LifeOSState type, just server-side.
create table if not exists public.life_os_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security is what actually enforces "users can only see their own
-- data" — without this, the anon key alone would let any authenticated user
-- read or write any row via the client SDK. This is the part that matters
-- most for correctness; everything else is just structure.
alter table public.life_os_data enable row level security;

-- Supabase changed how new projects work as of 2026-05-30: newly created
-- tables no longer automatically grant privileges to the `authenticated`
-- role (previously this was automatic, before it became an opt-in dashboard
-- setting). Without these grants, RLS policies below would never even get
-- evaluated — PostgREST would reject the query at the table-privilege level
-- before RLS has a chance to run. This is a table-level permission (can this
-- role touch this table at all), separate from RLS (which specific rows).
-- Deliberately NOT granting anything to `anon` — only signed-in users should
-- ever reach this table.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.life_os_data to authenticated;

drop policy if exists "select own data" on public.life_os_data;
create policy "select own data"
  on public.life_os_data for select
  using (auth.uid() = user_id);

drop policy if exists "insert own data" on public.life_os_data;
create policy "insert own data"
  on public.life_os_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own data" on public.life_os_data;
create policy "update own data"
  on public.life_os_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own data" on public.life_os_data;
create policy "delete own data"
  on public.life_os_data for delete
  using (auth.uid() = user_id);

-- Keeps updated_at accurate without the client having to remember to set it
-- on every write.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_life_os_data_updated_at on public.life_os_data;
create trigger set_life_os_data_updated_at
  before update on public.life_os_data
  for each row execute function public.set_updated_at();