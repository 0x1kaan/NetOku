-- Migration 0004: School team invites + webhook idempotency
--
-- 1) webhook_events: dedup table for Polar webhook deliveries (event_id UNIQUE).
-- 2) organizations: 1 owner, up to seat_limit members sharing School entitlements.
-- 3) organization_invites: token-based invite links sent via email.
-- 4) profiles.organization_id: optional FK so a member's plan mirrors org plan.
--
-- Cascade rules:
--   - organizations.owner_id -> auth.users ON DELETE CASCADE
--   - profiles.organization_id -> organizations ON DELETE SET NULL
--   - invites.organization_id -> organizations ON DELETE CASCADE

-- ============================================================
-- WEBHOOK EVENTS (idempotency)
-- ============================================================
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  received_at timestamptz not null default now()
);

create index if not exists webhook_events_received_idx
  on public.webhook_events (received_at desc);

-- No RLS: only service-role writes; never read from client.
alter table public.webhook_events enable row level security;

-- ============================================================
-- ORGANIZATIONS (School plan teams)
-- ============================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  seat_limit int not null default 5,
  polar_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_owner_idx
  on public.organizations (owner_id);

create unique index if not exists organizations_subscription_idx
  on public.organizations (polar_subscription_id)
  where polar_subscription_id is not null;

alter table public.organizations enable row level security;

-- ============================================================
-- PROFILES: link to organization
-- ============================================================
alter table public.profiles
  add column if not exists organization_id uuid
    references public.organizations(id) on delete set null;

create index if not exists profiles_organization_idx
  on public.profiles (organization_id)
  where organization_id is not null;

-- Owners: full access to their org
drop policy if exists "organizations_owner_all" on public.organizations;
create policy "organizations_owner_all" on public.organizations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Members: can read the org they belong to
drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select" on public.organizations
  for select using (
    id in (select organization_id from public.profiles where id = auth.uid())
  );

-- ============================================================
-- ORGANIZATION INVITES (token-based)
-- ============================================================
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invites_org_idx
  on public.organization_invites (organization_id);

create index if not exists invites_email_idx
  on public.organization_invites (email)
  where accepted_at is null;

alter table public.organization_invites enable row level security;

-- Org owners: manage invites for their org
drop policy if exists "invites_owner_all" on public.organization_invites;
create policy "invites_owner_all" on public.organization_invites
  for all using (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations where owner_id = auth.uid()
    )
  );

-- ============================================================
-- HELPER: count current members of an organization
-- ============================================================
create or replace function public.organization_member_count(p_org uuid)
returns int
language sql
security definer set search_path = public
as $$
  select count(*)::int
    from public.profiles
   where organization_id = p_org;
$$;

grant execute on function public.organization_member_count(uuid) to authenticated;
