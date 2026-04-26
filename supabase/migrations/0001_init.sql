-- NetOku v1 schema
-- Supabase Dashboard > SQL Editor'de çalıştır.
-- Gereken uzantılar: pgcrypto (UUID üretimi için — Supabase'de default ON).

-- ============================================================
-- PROFILES: auth.users'a 1:1 bağlı kullanıcı profili
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'school')),
  usage_count int not null default 0,
  usage_reset_at timestamptz not null default date_trunc('month', now()) + interval '1 month',
  polar_customer_id text,
  polar_subscription_id text,
  polar_subscription_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ANALYSES: her tamamlanmış analiz kaydı
-- ============================================================
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text,
  file_size int,
  settings jsonb not null,
  summary jsonb not null,
  student_count int not null default 0,
  excluded_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

drop policy if exists "analyses_owner_all" on public.analyses;
create policy "analyses_owner_all" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- PRESETS: kayıtlı form şablonları
-- ============================================================
create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  settings jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists presets_user_idx on public.presets (user_id);

alter table public.presets enable row level security;

drop policy if exists "presets_owner_all" on public.presets;
create policy "presets_owner_all" on public.presets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- USAGE HELPERS
-- ============================================================
create or replace function public.increment_usage(p_user uuid)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  r public.profiles;
begin
  update public.profiles
     set usage_count = case
                         when usage_reset_at <= now() then 1
                         else usage_count + 1
                       end,
         usage_reset_at = case
                            when usage_reset_at <= now()
                              then date_trunc('month', now()) + interval '1 month'
                            else usage_reset_at
                          end,
         updated_at = now()
   where id = p_user
  returning * into r;
  return r;
end;
$$;

grant execute on function public.increment_usage(uuid) to authenticated;