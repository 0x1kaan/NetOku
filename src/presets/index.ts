export {
  PRESET_CONFIGS,
  cloneFormSettings,
  createFormSettingsFromPreset,
  getPresetAnalyzePath,
  getPresetConfig,
  isPresetId,
} from './presets.config';
export type {
  AnalysisStrategyId,
  PresetConfig,
  PresetCourseConfig,
  PresetId,
} from './types';
export { getAnalysisStrategy, getAnalysisStrategyById } from './strategies/strategyFactory';
export type {
  AnalysisStrategyInput,
  IAnalysisStrategy,
} from './strategies/IAnalysisStrategy';
