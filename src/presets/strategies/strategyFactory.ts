import { getPresetConfig } from '../presets.config';
import type { AnalysisStrategyId, PresetId } from '../types';
import { AytAnalysisStrategy } from './AytAnalysisStrategy';
import { ConfigDrivenAnalysisStrategy } from './ConfigDrivenAnalysisStrategy';
import type { IAnalysisStrategy } from './IAnalysisStrategy';
import { InstitutionThreeCourseStrategy } from './InstitutionThreeCourseStrategy';
import { KpssAnalysisStrategy } from './KpssAnalysisStrategy';
import { LgsAnalysisStrategy } from './LgsAnalysisStrategy';
import { SingleSubjectAnalysisStrategy } from './SingleSubjectAnalysisStrategy';
import { TytAnalysisStrategy } from './TytAnalysisStrategy';

const STRATEGIES: Record<AnalysisStrategyId, IAnalysisStrategy> = {
  tyt: new TytAnalysisStrategy(),
  'ayt-sayisal': new AytAnalysisStrategy(),
  lgs: new LgsAnalysisStrategy(),
  kpss: new KpssAnalysisStrategy(),
  'single-subject': new SingleSubjectAnalysisStrategy(),
  'institution-3x20': new InstitutionThreeCourseStrategy(),
  custom: new ConfigDrivenAnalysisStrategy('custom'),
};

export function getAnalysisStrategy(presetId?: PresetId | string | null): IAnalysisStrategy {
  const preset = getPresetConfig(presetId);
  return STRATEGIES[preset?.strategyId ?? 'custom'];
}

export function getAnalysisStrategyById(
  strategyId?: AnalysisStrategyId | null,
): IAnalysisStrategy {
  return STRATEGIES[strategyId ?? 'custom'] ?? STRATEGIES.custom;
}
