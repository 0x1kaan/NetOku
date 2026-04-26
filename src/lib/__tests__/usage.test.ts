import { describe, expect, it } from 'vitest';
import type { Profile } from '../db';
import { getCurrentUsage, getLimit, getRemainingUsage, isOverLimit } from '../usage';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    email: 'teacher@example.com',
    plan: 'free',
    usage_count: 0,
    usage_reset_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    polar_customer_id: null,
    polar_subscription_id: null,
    polar_subscription_status: null,
    organization_id: null,
    organization_role: 'owner',
    ...overrides,
  };
}

describe('usage helpers', () => {
  it('returns configured free limit and unlimited paid plans', () => {
    expect(getLimit('free')).toBe(10);
    expect(getLimit('pro')).toBeNull();
    expect(getLimit('school')).toBeNull();
  });

  it('calculates remaining usage for limited plans', () => {
    const profile = makeProfile({ usage_count: 8 });
    expect(getCurrentUsage(profile)).toBe(8);
    expect(getRemainingUsage(profile)).toBe(2);
    expect(isOverLimit(profile)).toBe(false);
  });

  it('blocks when usage reaches the plan limit', () => {
    const profile = makeProfile({ usage_count: 10 });
    expect(getRemainingUsage(profile)).toBe(0);
    expect(isOverLimit(profile)).toBe(true);
  });

  it('treats expired reset windows as fresh usage', () => {
    const profile = makeProfile({
      usage_count: 10,
      usage_reset_at: new Date(Date.now() - 60 * 1000).toISOString(),
    });

    expect(getCurrentUsage(profile)).toBe(0);
    expect(getRemainingUsage(profile)).toBe(10);
    expect(isOverLimit(profile)).toBe(false);
  });
});

