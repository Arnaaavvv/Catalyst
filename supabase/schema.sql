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