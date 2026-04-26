const STORAGE_KEY = 'netoku_auth_throttle';
const MAX_FAILURES = 5;
const LOCKOUT_MS = 60_000;
const WINDOW_MS = 10 * 60_000; // failures older than 10 min reset

export interface ThrottleState {
  failures: number;
  firstFailureAt: number;
  lockoutUntil: number;
}

type Store = Record<string, ThrottleState>;

function normalizeKey(email: string): string {
  return email.trim().toLowerCase();
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

/**
 * Returns the number of seconds remaining until the identifier is unlocked,
 * or `null` if it is not currently locked out.
 */
export function checkLockout(email: string): number | null {
  const key = normalizeKey(email);
  if (!key) return null;
  const store = readStore();
  const entry = store[key];
  if (!entry) return null;
  const now = Date.now();
  if (entry.lockoutUntil > now) {
    return Math.ceil((entry.lockoutUntil - now) / 1000);
  }
  return null;
}

/**
 * Record a failed authentication attempt. Triggers a lockout once the
 * threshold is reached. Returns the new throttle state (caller can decide
 * how to display the remaining failures / lockout seconds).
 */
export function recordAuthFailure(email: string): ThrottleState {
  const key = normalizeKey(email);
  const store = readStore();
  const now = Date.now();
  const existing = store[key];
  const withinWindow = existing && now - existing.firstFailureAt < WINDOW_MS;
  const base: ThrottleState = withinWindow
    ? existing
    : { failures: 0, firstFailureAt: now, lockoutUntil: 0 };

  const failures = base.failures + 1;
  const lockoutUntil = failures >= MAX_FAILURES ? now + LOCKOUT_MS : 0;
  const next: ThrottleState = {
    failures,
    firstFailureAt: base.firstFailureAt || now,
    lockoutUntil,
  };
  store[key] = next;
  writeStore(store);
  return next;
}

export function clearAuthFailures(email: string): void {
  const key = normalizeKey(email);
  if (!key) return;
  const store = readStore();
  if (!(key in store)) return;
  delete store[key];
  writeStore(store);
}

export const AUTH_RATE_LIMIT_CONFIG = {
  MAX_FAILURES,
  LOCKOUT_MS,
  WINDOW_MS,
} as const;
