import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyUrlOverrides,
  clearFlag,
  FLAG_DEFAULTS,
  getAllFlags,
  isFlagEnabled,
  setFlag,
} from '../flags';

describe('flags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default value when no override', () => {
    expect(isFlagEnabled('debugPanel')).toBe(FLAG_DEFAULTS.debugPanel);
    expect(isFlagEnabled('serviceWorker')).toBe(FLAG_DEFAULTS.serviceWorker);
  });

  it('setFlag persists and overrides default', () => {
    setFlag('debugPanel', true);
    expect(isFlagEnabled('debugPanel')).toBe(true);
    setFlag('debugPanel', false);
    expect(isFlagEnabled('debugPanel')).toBe(false);
  });

  it('clearFlag reverts to default', () => {
    setFlag('serviceWorker', false);
    expect(isFlagEnabled('serviceWorker')).toBe(false);
    clearFlag('serviceWorker');
    expect(isFlagEnabled('serviceWorker')).toBe(FLAG_DEFAULTS.serviceWorker);
  });

  it('getAllFlags returns merged defaults + overrides', () => {
    setFlag('debugPanel', true);
    const all = getAllFlags();
    expect(all.debugPanel).toBe(true);
    expect(all.serviceWorker).toBe(FLAG_DEFAULTS.serviceWorker);
  });

  it('applyUrlOverrides writes known flags to localStorage', () => {
    applyUrlOverrides('?ff_debugPanel=1&ff_serviceWorker=0&unrelated=1');
    expect(isFlagEnabled('debugPanel')).toBe(true);
    expect(isFlagEnabled('serviceWorker')).toBe(false);
  });

  it('applyUrlOverrides ignores unknown flag names', () => {
    applyUrlOverrides('?ff_nonexistent=1');
    const raw = localStorage.getItem('netoku_feature_flags');
    expect(raw).toBeNull();
  });

  it('applyUrlOverrides accepts "true"/"false" as values', () => {
    applyUrlOverrides('?ff_debugPanel=true');
    expect(isFlagEnabled('debugPanel')).toBe(true);
    applyUrlOverrides('?ff_debugPanel=false');
    expect(isFlagEnabled('debugPanel')).toBe(false);
  });

  it('survives corrupt localStorage payloads', () => {
    localStorage.setItem('netoku_feature_flags', '{not json');
    expect(isFlagEnabled('debugPanel')).toBe(FLAG_DEFAULTS.debugPanel);
    setFlag('debugPanel', true);
    expect(isFlagEnabled('debugPanel')).toBe(true);
  });
});
