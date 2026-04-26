import { describe, expect, it } from 'vitest';
import { getAnalysisStrategy, getAnalysisStrategyById } from '@/presets';

describe('strategy factory', () => {
  it.each([
    ['tyt-temel-4-ders', 'tyt'],
    ['ayt-sayisal', 'ayt-sayisal'],
    ['lgs-standart', 'lgs'],
    ['kpss-genel-yetenek', 'kpss'],
    ['tek-ders-50', 'single-subject'],
    ['kurum-3-ders-20', 'institution-3x20'],
  ])('resolves %s to %s', (presetId, strategyId) => {
    expect(getAnalysisStrategy(presetId).id).toBe(strategyId);
  });

  it('falls back to custom for missing or unknown preset ids', () => {
    expect(getAnalysisStrategy().id).toBe('custom');
    expect(getAnalysisStrategy('not-a-preset').id).toBe('custom');
    expect(getAnalysisStrategyById(null).id).toBe('custom');
  });
});
