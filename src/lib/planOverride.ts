import type { Profile } from './db';

function getOverrideEmails(): Set<string> {
  const raw = (import.meta.env.VITE_PRO_OVERRIDE_EMAILS as string | undefined) ?? '';
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function hasProPlanOverride(email?: string | null): boolean {
  if (!email) return false;
  return getOverrideEmails().has(email.trim().toLowerCase());
}

export function applyPlanOverride(profile: Profile | null): Profile | null {
  if (!profile || !hasProPlanOverride(profile.email)) return profile;
  return {
    ...profile,
    plan: 'pro',
  };
}

