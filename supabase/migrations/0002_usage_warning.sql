-- Migration 0002: Usage warning email tracking + updated increment_usage
-- Adds email_warnings_sent to avoid duplicate usage-warning emails.
-- The warning is sent at 80% of the free plan limit (e.g. 2 → at count=2 exactly at limit).
-- Since free limit is 2 we fire at count=1 (50%) — skip threshold logic for tiny limit;
-- instead track a flag so we only email once per reset period.

alter table public.profiles
  add column if not exists usage_warning_sent boolean not null default false;

-- Updated increment_usage: returns profile AND signals whether to send warning email
-- by embedding a flag in the returned row (usage_warning_sent flips true at 80%).
create or replace function public.increment_usage(p_user uuid)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  r          public.profiles;
  plan_limit int;
  new_count  int;
  should_warn boolean := false;
begin
  -- Determine limit based on plan
  select case
    when plan = 'free' then 2
    else null
  end
  into plan_limit
  from public.profiles
  where id = p_user;

  -- Compute new count (reset if past reset date)
  select case
    when usage_reset_at <= now() then 1
    else usage_count + 1
  end
  into new_count
  from public.profiles
  where id = p_user;

  -- Check if we should send a warning (80% threshold, only once per period)
  if plan_limit is not null then
    select (
      new_count >= ceil(plan_limit * 0.8)
      and not usage_warning_sent
    )
    into should_warn
    from public.profiles
    where id = p_user;
  end if;

  update public.profiles
     set usage_count = new_count,
         usage_reset_at = case
                            when usage_reset_at <= now()
                              then date_trunc('month', now()) + interval '1 month'
                            else usage_reset_at
                          end,
         usage_warning_sent = case
                                when usage_reset_at <= now() then false
                                when should_warn then true
                                else usage_warning_sent
                              end,
         updated_at = now()
   where id = p_user
  returning * into r;

  return r;
end;
$$;

grant execute on function public.increment_usage(uuid) to authenticated;
