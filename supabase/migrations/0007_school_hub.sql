-- Migration 0007: School hub foundation
--
-- Goals:
-- 1) Organization roles (owner / manager / teacher / viewer)
-- 2) Shared organization archive + shared presets
-- 3) Persist full analysis payload for progress/comparison/report features
-- 4) Shareable student/parent report links backed by signed-style tokens
-- 5) Organization branding for printable/PDF-ready reports

create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.org_role as enum ('owner', 'manager', 'teacher', 'viewer');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.record_visibility as enum ('private', 'organization');
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- ROLE / BRANDING FOUNDATION
-- ============================================================
alter table public.profiles
  add column if not exists organization_role public.org_role not null default 'teacher';

alter table public.organizations
  add column if not exists brand_name text,
  add column if not exists logo_url text,
  add column if not exists brand_primary_color text not null default '#0F172A',
  add column if not exists brand_accent_color text not null default '#F4D35E';

alter table public.organization_invites
  add column if not exists role public.org_role not null default 'teacher';

update public.profiles as p
set
  organization_id = o.id,
  organization_role = 'owner',
  plan = 'school'
from public.organizations as o
where p.id = o.owner_id
  and (
    p.organization_id is distinct from o.id
    or p.organization_role is distinct from 'owner'::public.org_role
    or p.plan is distinct from 'school'
  );

create or replace function public.current_org_role(p_org uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_role
  from public.profiles as p
  where p.id = auth.uid()
    and p.organization_id = p_org
  limit 1;
$$;

create or replace function public.user_can_manage_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_org_role(p_org) in ('owner', 'manager'), false);
$$;

create or replace function public.user_can_contribute_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_org_role(p_org) in ('owner', 'manager', 'teacher'), false);
$$;

grant execute on function public.current_org_role(uuid) to authenticated;
grant execute on function public.user_can_manage_org(uuid) to authenticated;
grant execute on function public.user_can_contribute_org(uuid) to authenticated;

drop policy if exists "organizations_owner_all" on public.organizations;
create policy "organizations_owner_all" on public.organizations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select" on public.organizations
  for select using (
    id in (select organization_id from public.profiles where id = auth.uid())
  );

drop policy if exists "organizations_manager_update" on public.organizations;
create policy "organizations_manager_update" on public.organizations
  for update using (public.user_can_manage_org(id))
  with check (public.user_can_manage_org(id));

drop policy if exists "invites_owner_all" on public.organization_invites;
create policy "invites_manager_all" on public.organization_invites
  for all using (
    organization_id in (
      select p.organization_id
      from public.profiles as p
      where p.id = auth.uid()
        and p.organization_role in ('owner', 'manager')
    )
  )
  with check (
    organization_id in (
      select p.organization_id
      from public.profiles as p
      where p.id = auth.uid()
        and p.organization_role in ('owner', 'manager')
    )
  );

-- ============================================================
-- ANALYSES: detailed payload + organization sharing
-- ============================================================
alter table public.analyses
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists visibility public.record_visibility not null default 'private',
  add column if not exists exam_date date,
  add column if not exists exam_type text,
  add column if not exists result jsonb,
  add column if not exists report_meta jsonb not null default '{}'::jsonb;

create index if not exists analyses_org_created_idx
  on public.analyses (organization_id, created_at desc)
  where organization_id is not null;

create index if not exists analyses_visibility_idx
  on public.analyses (visibility, created_at desc);

drop policy if exists "analyses_owner_all" on public.analyses;
drop policy if exists "analyses_owner_select" on public.analyses;
create policy "analyses_owner_select" on public.analyses
  for select using (auth.uid() = user_id);

drop policy if exists "analyses_org_select" on public.analyses;
create policy "analyses_org_select" on public.analyses
  for select using (
    visibility = 'organization'::public.record_visibility
    and organization_id is not null
    and organization_id = (
      select p.organization_id
      from public.profiles as p
      where p.id = auth.uid()
    )
  );

drop policy if exists "analyses_owner_insert" on public.analyses;
create policy "analyses_owner_insert" on public.analyses
  for insert with check (
    auth.uid() = user_id
    and (
      organization_id is null
      or (
        organization_id = (
          select p.organization_id
          from public.profiles as p
          where p.id = auth.uid()
        )
        and public.user_can_contribute_org(organization_id)
      )
    )
  );

drop policy if exists "analyses_owner_update" on public.analyses;
create policy "analyses_owner_update" on public.analyses
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      organization_id is null
      or (
        organization_id = (
          select p.organization_id
          from public.profiles as p
          where p.id = auth.uid()
        )
        and public.user_can_contribute_org(organization_id)
      )
    )
  );

drop policy if exists "analyses_owner_delete" on public.analyses;
create policy "analyses_owner_delete" on public.analyses
  for delete using (auth.uid() = user_id);

-- ============================================================
-- PRESETS: scope / organization sharing / metadata
-- ============================================================
alter table public.presets
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists scope public.record_visibility not null default 'private',
  add column if not exists description text,
  add column if not exists category text not null default 'custom',
  add column if not exists usage_count int not null default 0;

create index if not exists presets_org_updated_idx
  on public.presets (organization_id, updated_at desc)
  where organization_id is not null;

drop policy if exists "presets_owner_all" on public.presets;
drop policy if exists "presets_owner_select" on public.presets;
create policy "presets_owner_select" on public.presets
  for select using (auth.uid() = user_id);

drop policy if exists "presets_org_select" on public.presets;
create policy "presets_org_select" on public.presets
  for select using (
    scope = 'organization'::public.record_visibility
    and organization_id is not null
    and organization_id = (
      select p.organization_id
      from public.profiles as p
      where p.id = auth.uid()
    )
  );

drop policy if exists "presets_owner_insert" on public.presets;
create policy "presets_owner_insert" on public.presets
  for insert with check (
    auth.uid() = user_id
    and (
      organization_id is null
      or (
        organization_id = (
          select p.organization_id
          from public.profiles as p
          where p.id = auth.uid()
        )
        and public.user_can_contribute_org(organization_id)
      )
    )
  );

drop policy if exists "presets_owner_update" on public.presets;
create policy "presets_owner_update" on public.presets
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      organization_id is null
      or (
        organization_id = (
          select p.organization_id
          from public.profiles as p
          where p.id = auth.uid()
        )
        and public.user_can_contribute_org(organization_id)
      )
    )
  );

drop policy if exists "presets_owner_delete" on public.presets;
create policy "presets_owner_delete" on public.presets
  for delete using (auth.uid() = user_id);

-- ============================================================
-- TEAM MANAGEMENT RPC HELPERS
-- ============================================================
create or replace function public.update_org_member_role(
  p_member uuid,
  p_role public.org_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.profiles;
  target public.profiles;
begin
  select * into caller
  from public.profiles
  where id = auth.uid();

  if caller.organization_id is null or caller.organization_role not in ('owner', 'manager') then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  select * into target
  from public.profiles
  where id = p_member;

  if not found or target.organization_id is distinct from caller.organization_id then
    raise exception 'Üye bulunamadı.';
  end if;

  if target.organization_role = 'owner' and target.id <> auth.uid() then
    raise exception 'Kurucu rolü değiştirilemez.';
  end if;

  if p_role = 'owner' and caller.organization_role <> 'owner' then
    raise exception 'Sadece kurucu owner atayabilir.';
  end if;

  update public.profiles
  set organization_role = p_role
  where id = p_member
  returning * into target;

  return target;
end;
$$;

create or replace function public.remove_org_member(
  p_member uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller public.profiles;
  target public.profiles;
begin
  select * into caller
  from public.profiles
  where id = auth.uid();

  if caller.organization_id is null or caller.organization_role not in ('owner', 'manager') then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  select * into target
  from public.profiles
  where id = p_member;

  if not found or target.organization_id is distinct from caller.organization_id then
    raise exception 'Üye bulunamadı.';
  end if;

  if target.organization_role = 'owner' then
    raise exception 'Kurucu ekipten çıkarılamaz.';
  end if;

  update public.profiles
  set
    organization_id = null,
    organization_role = 'teacher',
    plan = 'free'
  where id = p_member;
end;
$$;

grant execute on function public.update_org_member_role(uuid, public.org_role) to authenticated;
grant execute on function public.remove_org_member(uuid) to authenticated;

-- ============================================================
-- SHAREABLE STUDENT REPORTS
-- ============================================================
create table if not exists public.student_report_shares (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  student_id text not null,
  student_name text not null,
  share_token text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  report_payload jsonb not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_report_shares_analysis_idx
  on public.student_report_shares (analysis_id, created_at desc);

create index if not exists student_report_shares_org_idx
  on public.student_report_shares (organization_id, created_at desc)
  where organization_id is not null;

alter table public.student_report_shares enable row level security;

drop policy if exists "student_report_shares_creator_all" on public.student_report_shares;
create policy "student_report_shares_creator_all" on public.student_report_shares
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

drop policy if exists "student_report_shares_org_select" on public.student_report_shares;
create policy "student_report_shares_org_select" on public.student_report_shares
  for select using (
    organization_id is not null
    and organization_id = (
      select p.organization_id
      from public.profiles as p
      where p.id = auth.uid()
    )
  );

create or replace function public.get_shared_student_report(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select s.report_payload || jsonb_build_object(
    'shareToken', s.share_token,
    'expiresAt', s.expires_at,
    'createdAt', s.created_at
  )
  from public.student_report_shares as s
  where s.share_token = p_token
    and (s.expires_at is null or s.expires_at > now())
  limit 1;
$$;

grant execute on function public.get_shared_student_report(text) to anon, authenticated;
