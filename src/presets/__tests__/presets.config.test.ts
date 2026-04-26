import { describe, expect, it } from 'vitest';
import { PRESET_CONFIGS, getPresetAnalyzePath, getPresetConfig, isPresetId } from '@/presets';

describe('preset config', () => {
  it('keeps preset ids unique', () => {
    const ids = PRESET_CONFIGS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps course metadata aligned with form settings', () => {
    for (const preset of PRESET_CONFIGS) {
      expect(preset.defaultSubjectCount).toBe(preset.courses.length);
      expect(preset.settings.courses).toHaveLength(preset.courses.length);
      expect(preset.maxQuestions).toBe(
        preset.courses.reduce((sum, course) => sum + course.questionCount, 0),
      );

      preset.courses.forEach((course, index) => {
        expect(preset.settings.courses[index]).toMatchObject({
          name: course.name,
          questionCount: course.questionCount,
          points: course.pointsPerNet,
          startOffset: course.startOffset,
        });
      });
    }
  });

  it('resolves ids and analyze routes', () => {
    expect(isPresetId('tyt-temel-4-ders')).toBe(true);
    expect(isPresetId('unknown')).toBe(false);
    expect(getPresetConfig('lgs-standart')?.settings.courses).toHaveLength(6);
    expect(getPresetAnalyzePath('tek-ders-50')).toBe('/app/analyze?preset=tek-ders-50');
  });
});
