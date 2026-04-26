# NetOku — Supabase RLS Audit

**Last reviewed:** 2026-04-23
**Scope:** All `public.*` tables used by the client. Verifies that Row Level Security (RLS) is enabled on every table that accepts reads/writes from the `anon` or `authenticated` JWT and that the policies match intended access.

---

## 1 · Summary

| Table | RLS | Owner access | Org access | Public/anon access | Status |
|-------|:---:|:---:|:---:|:---:|:---:|
| `profiles` | on | self select/update | — | none | OK |
| `analyses` | on | owner all | org members SELECT when `visibility='organization'` | none | OK |
| `presets` | on | owner all | org members SELECT when `scope='organization'` | none | OK |
| `organizations` | on | owner all; manager update | member SELECT | none | OK |
| `organization_invites` | on | owner/manager all | — | none (accepted via RPC) | OK |
| `student_report_shares` | on | creator all | org members SELECT | none direct; anon reads via `get_shared_student_report(token)` RPC | OK (by design) |
| `webhook_events` | on | — | — | none (service role only) | OK |

**Conclusion:** No direct `anon` SELECT grants on any business table. Shared reports are surfaced only through a `security definer` RPC that enforces token + expiry. The audit passes with minor recommendations (§6).

---

## 2 · Table-by-table policy map

### 2.1 `profiles`
- `profiles_self_select` — `FOR SELECT USING (auth.uid() = id)`
- `profiles_self_update` — `FOR UPDATE USING (auth.uid() = id)`
- No INSERT policy. Row insert is handled by `handle_new_user` trigger (`security definer`).
- No DELETE policy. Deletion cascades from `auth.users`.

**Risk:** Without an explicit DELETE policy, authenticated users cannot self-delete their profile via client. Delegated to `delete_my_account` RPC in `src/lib/account.ts`. Acceptable.

### 2.2 `analyses`
- `analyses_owner_select` — owner reads own rows.
- `analyses_org_select` — members read rows where `visibility='organization'` and `organization_id` matches caller's `profiles.organization_id`.
- `analyses_owner_insert` — only allows `organization_id` that caller belongs to and only if `user_can_contribute_org()` returns true.
- `analyses_owner_update` / `analyses_owner_delete` — owner-only.

**Risk:** `visibility` mutation is allowed by `analyses_owner_update` (owner can flip private→organization). This is intentional but means a private leak is possible if the owner changes a row's visibility after the fact. Audit trail not recorded.

### 2.3 `presets`
Mirror of `analyses`:
- Owner `SELECT/INSERT/UPDATE/DELETE` + org `SELECT` when `scope='organization'`.

### 2.4 `organizations`
- `organizations_owner_all` — owner full access.
- `organizations_member_select` — `auth.uid()`'s `profiles.organization_id = id`.
- `organizations_manager_update` — owner/manager can UPDATE.

### 2.5 `organization_invites`
- `invites_manager_all` (0007) — owner/manager full access.
- Accept-invite flow runs through the `accept_organization_invite(token)` RPC (`security definer`), so the invitee never needs SELECT on the raw row.

### 2.6 `student_report_shares`
- `student_report_shares_creator_all` — creator full access.
- `student_report_shares_org_select` — org members can SELECT shares tied to their org.
- **Anon path:** `get_shared_student_report(p_token text)` RPC (`security definer`, `GRANT EXECUTE … TO anon, authenticated`). Filters by token and `expires_at`. RPC returns a JSONB payload; raw table is not exposed.

**Risk:** Tokens are 36 hex chars (18 bytes of `gen_random_bytes`) — adequate entropy (~144 bits). Shares without `expires_at` live forever; consider a default TTL (§6).

### 2.7 `webhook_events`
- RLS on, no policies → authenticated/anon get zero rows by default.
- Edge functions use the service role key, which bypasses RLS. Correct pattern.

---

## 3 · Verification SQL (run in Supabase SQL editor)

```sql
-- 3.1 All public tables have RLS enabled
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
-- Expect every row with rls_enabled = true.

-- 3.2 List every policy
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3.3 Anon should NOT appear in any row-level grant for business tables
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'public')
  and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
order by table_name;
-- Expect no rows for analyses/presets/profiles/organizations/organization_invites/student_report_shares.
-- (Empty result = pass.)

-- 3.4 Confirm anon can only execute the intended RPCs
select routine_name
from information_schema.role_routine_grants
where specific_schema = 'public'
  and grantee = 'anon';
-- Expect: get_shared_student_report (and any other anon-exposed RPCs you added later).

-- 3.5 Quick anon probe (run as Supabase "anon" role)
set role anon;
select count(*) from public.analyses;                -- expect 0
select count(*) from public.presets;                 -- expect 0
select count(*) from public.profiles;                -- expect 0
select count(*) from public.student_report_shares;   -- expect 0
reset role;
```

---

## 4 · Regression tests to add

- [ ] Integration test: `anon` client cannot `.from('analyses').select()` → returns `[]` or error.
- [ ] Integration test: user A cannot read user B's `analyses` when `visibility='private'`.
- [ ] Integration test: user in org X cannot read org Y's `visibility='organization'` analyses.
- [ ] Integration test: `get_shared_student_report('invalid-token')` returns `null`.
- [ ] Integration test: expired share (`expires_at < now()`) returns `null`.

Implement via a throwaway test DB or the Supabase "branch" feature so we don't need to stub RLS.

---

## 5 · Operational checklist (each release)

1. New migration touches a table → does it `alter table … enable row level security;`? (every new table)
2. New migration adds a column used for access control? → update the relevant policy's `USING` / `WITH CHECK`.
3. New edge function → does it need `service_role` or is it fine with user JWT?
4. New RPC with `security definer` → `set search_path = public` is present; `grant execute` list does not include `public` unless intentional.

Add this block to the PR template for any PR that edits `supabase/migrations/`.

---

## 6 · Recommendations

1. **Enforce share TTL.** Application currently allows `expires_at = null` on `student_report_shares`. Consider either:
   - Forcing a max TTL (e.g. 90 days) at insert time via DB default + trigger, OR
   - Moving the TTL check out of the RPC into a nightly cleanup job that deletes expired rows.
2. **Visibility-change audit.** Flipping an `analyses.visibility` from `private` to `organization` currently leaves no trail. Add an `analyses_audit` table or log to Sentry when `OLD.visibility <> NEW.visibility`.
3. **Profile SELECT scope.** `profiles_self_select` restricts to `auth.uid() = id`. Team pages need to read _co-member_ profiles; today the code works around this by joining through `organizations`. If we add an "org members list" page, add a dedicated policy instead of loosening the self-select one.
4. **Webhook event retention.** `webhook_events` grows forever. Add a retention policy (30-90 days) via `pg_cron` or a cleanup function.
5. **Rate-limit shared-report endpoint.** `get_shared_student_report` is anon-callable. Put it behind an edge function with per-IP throttling before we expose share URLs publicly.

None of these are blocking for the current RLS posture.
