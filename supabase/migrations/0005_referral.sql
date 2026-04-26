-- Migration 0005: Referral attribution
-- Adds referred_by column to profiles so we can track who invited whom.
-- referral_code: unique short code generated on first read (handled by app layer).
--
-- Flow:
--   1. User A shares link: https://netoku.app/auth?ref=<referral_code>
--   2. User B signs up → frontend captures ref param → calls update-referral edge function
--      (or we write it directly during signup via the welcome hook).
--   3. profiles.referred_by = User A's id gets stored.
--
-- No reward automation in this migration — attribution first, rewards later.

alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references auth.users(id) on delete set null;

create index if not exists profiles_referral_code_idx
  on public.profiles (referral_code)
  where referral_code is not null;

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by)
  where referred_by is not null;

-- Function: generate a short random referral code (8 hex chars) if not set.
create or replace function public.ensure_referral_code(p_user uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  code text;
begin
  select referral_code into code from public.profiles where id = p_user;
  if code is not null then return code; end if;

  loop
    code := substring(replace(encode(gen_random_bytes(4), 'hex'), '-', ''), 1, 8);
    begin
      update public.profiles set referral_code = code where id = p_user;
      return code;
    exception when unique_violation then
      -- Try again with a different code
      null;
    end;
  end loop;
end;
$$;

grant execute on function public.ensure_referral_code(uuid) to authenticated;
