import type { FormSettings } from '@/types/domain';
import {
  PRESET_CONFIGS,
  createFormSettingsFromPreset,
  type PresetId,
} from '@/presets';

export interface BuiltinTemplate {
  id: PresetId;
  name: string;
  description: string;
  group: string;
  tags: string[];
  settings: FormSettings;
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = PRESET_CONFIGS.map((preset) => ({
  id: preset.id,
  name: preset.title,
  description: preset.description,
  group: preset.group,
  tags: preset.tags,
  settings: createFormSettingsFromPreset(preset),
}));
