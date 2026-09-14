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

-- Profile fields (username, date of birth, sex) live here rather than in
-- Supabase Auth's user_metadata, specifically so `username` can carry a real
-- UNIQUE constraint. user_metadata is just an arbitrary JSON blob with no
-- database-level constraints at all — there is no way to enforce uniqueness
-- on a value stored there. A real column with a unique index is the only
-- correct way to guarantee two accounts can't claim the same username,
-- and it's race-condition-free: Postgres rejects the second write outright
-- rather than the app having to "check first" (which two simultaneous
-- signups could both pass, then both succeed — a classic TOCTOU bug).
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  username   text,
  dob        date,
  sex        text check (sex in ('female', 'male', 'other')),
  bio        text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- `create table if not exists` above only matters on a completely fresh
-- database — since profiles already existed from a prior run of this file,
-- that statement is a no-op here and these columns need adding explicitly.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;

-- Case-insensitive uniqueness ("Arnav" and "arnav" are the same username) as
-- an expression index, rather than a plain `unique` column constraint. Users
-- with no username set (NULL) don't conflict with each other or with
-- anyone — Postgres treats NULL as distinct from every other NULL for
-- uniqueness purposes, which is exactly the behavior we want here.
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "select own profile" on public.profiles;
create policy "select own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Avatar images. Stored in Supabase Storage, not the database — the
-- `profiles.avatar_url` column above just holds a link to whatever's here.
-- Public bucket: avatar images are treated like any other avatar on the web
-- (GitHub, Discord, etc.) — visible via a plain URL to anyone who has it,
-- not searchable/listable, and each user can only write into a folder
-- matching their own user id (enforced below), so nobody can overwrite or
-- delete anyone else's picture even though everyone can view any of them.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars are publicly readable" on storage.objects;
create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Expects uploads at path `{user_id}/avatar.<ext>` — storage.foldername()
-- splits the object path on "/", so foldername(name)[1] is that first
-- segment. This is what actually restricts each user to their own folder;
-- the public-read policy above says nothing about who can WRITE.
drop policy if exists "users can upload own avatar" on storage.objects;
create policy "users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can update own avatar" on storage.objects;
create policy "users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users can delete own avatar" on storage.objects;
create policy "users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);