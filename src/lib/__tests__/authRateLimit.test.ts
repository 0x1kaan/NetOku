import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  checkLockout,
  clearAuthFailures,
  recordAuthFailure,
  AUTH_RATE_LIMIT_CONFIG,
} from '../authRateLimit';

describe('authRateLimit', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-22T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('returns null when no failures recorded', () => {
    expect(checkLockout('user@example.com')).toBeNull();
  });

  it('normalizes email (case + whitespace)', () => {
    recordAuthFailure('User@Example.com');
    recordAuthFailure('  user@example.com  ');
    const state = recordAuthFailure('USER@EXAMPLE.COM');
    expect(state.failures).toBe(3);
  });

  it('locks out after MAX_FAILURES consecutive attempts', () => {
    for (let i = 0; i < AUTH_RATE_LIMIT_CONFIG.MAX_FAILURES - 1; i++) {
      recordAuthFailure('a@b.com');
    }
    expect(checkLockout('a@b.com')).toBeNull();

    const state = recordAuthFailure('a@b.com');
    expect(state.failures).toBe(AUTH_RATE_LIMIT_CONFIG.MAX_FAILURES);
    expect(state.lockoutUntil).toBeGreaterThan(Date.now());

    const remaining = checkLockout('a@b.com');
    expect(remaining).not.toBeNull();
    expect(remaining!).toBeGreaterThan(0);
    expect(remaining!).toBeLessThanOrEqual(
      Math.ceil(AUTH_RATE_LIMIT_CONFIG.LOCKOUT_MS / 1000),
    );
  });

  it('unlocks after LOCKOUT_MS elapses', () => {
    for (let i = 0; i < AUTH_RATE_LIMIT_CONFIG.MAX_FAILURES; i++) {
      recordAuthFailure('a@b.com');
    }
    expect(checkLockout('a@b.com')).not.toBeNull();

    vi.advanceTimersByTime(AUTH_RATE_LIMIT_CONFIG.LOCKOUT_MS + 1000);
    expect(checkLockout('a@b.com')).toBeNull();
  });

  it('clearAuthFailures wipes state for the email', () => {
    recordAuthFailure('a@b.com');
    recordAuthFailure('a@b.com');
    clearAuthFailures('a@b.com');
    expect(checkLockout('a@b.com')).toBeNull();
    // next failure starts from 1, not continuing the prior count
    const state = recordAuthFailure('a@b.com');
    expect(state.failures).toBe(1);
  });

  it('failures older than the window reset the counter', () => {
    recordAuthFailure('a@b.com');
    recordAuthFailure('a@b.com');
    vi.advanceTimersByTime(AUTH_RATE_LIMIT_CONFIG.WINDOW_MS + 1);
    const state = recordAuthFailure('a@b.com');
    expect(state.failures).toBe(1);
  });

  it('isolates state by email', () => {
    for (let i = 0; i < AUTH_RATE_LIMIT_CONFIG.MAX_FAILURES; i++) {
      recordAuthFailure('a@b.com');
    }
    expect(checkLockout('a@b.com')).not.toBeNull();
    expect(checkLockout('c@d.com')).toBeNull();
  });

  it('ignores empty email on checkLockout', () => {
    expect(checkLockout('')).toBeNull();
    expect(checkLockout('   ')).toBeNull();
  });

  it('survives corrupt localStorage payloads', () => {
    localStorage.setItem('netoku_auth_throttle', '{not json');
    expect(checkLockout('a@b.com')).toBeNull();
    const state = recordAuthFailure('a@b.com');
    expect(state.failures).toBe(1);
  });
});
