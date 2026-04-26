/**
 * Feature flags — localStorage-backed, URL-overridable.
 *
 * Read:   isFlagEnabled('flagName')
 * Write:  setFlag('flagName', true/false)
 * List:   getAllFlags()
 *
 * URL override (per-session): ?ff_flagName=1  |  ?ff_flagName=0
 * URL overrides are persisted to localStorage on page load.
 */

export type FlagName =
  | 'bulkDeleteHistory'
  | 'serviceWorker'
  | 'debugPanel'
  | 'virtualStudentList';

const STORAGE_KEY = 'netoku_feature_flags';
const URL_PREFIX = 'ff_';

const DEFAULTS: Record<FlagName, boolean> = {
  bulkDeleteHistory: false,
  serviceWorker: true,
  debugPanel: false,
  virtualStudentList: true,
};

type FlagMap = Partial<Record<FlagName, boolean>>;

function readStorage(): FlagMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(map: FlagMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage disabled; silently ignore
  }
}

function isKnown(name: string): name is FlagName {
  return name in DEFAULTS;
}

/**
 * Apply ?ff_xxx=1/0 URL parameters to localStorage.
 * Call once at app bootstrap.
 */
export function applyUrlOverrides(search = typeof window !== 'undefined' ? window.location.search : ''): void {
  if (!search) return;
  const params = new URLSearchParams(search);
  const current = readStorage();
  let changed = false;
  for (const [key, value] of params.entries()) {
    if (!key.startsWith(URL_PREFIX)) continue;
    const name = key.slice(URL_PREFIX.length);
    if (!isKnown(name)) continue;
    const enabled = value === '1' || value.toLowerCase() === 'true';
    if (current[name] !== enabled) {
      current[name] = enabled;
      changed = true;
    }
  }
  if (changed) writeStorage(current);
}

export function isFlagEnabled(name: FlagName): boolean {
  const stored = readStorage();
  if (name in stored) return stored[name] as boolean;
  return DEFAULTS[name];
}

export function setFlag(name: FlagName, enabled: boolean): void {
  const current = readStorage();
  current[name] = enabled;
  writeStorage(current);
}

export function clearFlag(name: FlagName): void {
  const current = readStorage();
  delete current[name];
  writeStorage(current);
}

export function getAllFlags(): Record<FlagName, boolean> {
  const stored = readStorage();
  const out = { ...DEFAULTS };
  for (const key of Object.keys(stored)) {
    if (isKnown(key)) out[key] = stored[key] as boolean;
  }
  return out;
}

export const FLAG_DEFAULTS = DEFAULTS;
