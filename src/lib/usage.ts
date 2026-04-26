import { PLAN_LIMITS, type Profile } from './db';

export function getLimit(plan: Profile['plan']): number | null {
  return PLAN_LIMITS[plan];
}

export function getCurrentUsage(profile: Profile): number {
  const resetTime = new Date(profile.usage_reset_at).getTime();
  if (Number.isFinite(resetTime) && resetTime <= Date.now()) {
    return 0;
  }

  return Math.max(profile.usage_count, 0);
}

export function getRemainingUsage(profile: Profile): number | null {
  const limit = getLimit(profile.plan);
  if (limit === null) return null;

  return Math.max(limit - getCurrentUsage(profile), 0);
}

export function isOverLimit(profile: Profile): boolean {
  const remaining = getRemainingUsage(profile);
  return remaining !== null && remaining <= 0;
}

