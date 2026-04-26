import { describe, expect, it } from 'vitest';
import { parseFile } from '@/core/parser';
import { buildKey, buildRow } from '@/core/__tests__/fixtures';
import { getAnalysisStrategy, getPresetConfig } from '@/presets';

describe('config-driven analysis strategy', () => {
  it('recomputes net and score from preset course coefficients', () => {
    const basePreset = getPresetConfig('tek-ders-50');
    expect(basePreset).not.toBeNull();
    const preset = {
      ...basePreset!,
      settings: {
        ...basePreset!.settings,
        wrongCriterion: 4 as const,
      },
      courses: [
        {
          ...basePreset!.courses[0],
          pointsPerNet: 2,
          wrongCriterion: 0 as const,
        },
      ],
    };
    const raw = [
      buildKey('A', 'A'.repeat(50)),
      buildRow({
        name: 'LOW SCORE',
        studentId: '10000000001',
        booklet: 'A',
        answers: 'B'.repeat(50),
      }),
    ].join('\n');
    const parsed = parseFile(raw, preset.settings);

    const result = getAnalysisStrategy(preset.id).analyze({
      students: parsed.students,
      answerKeys: parsed.answerKeys,
      settings: preset.settings,
      preset,
    });

    expect(result.students[0].courses[0]).toMatchObject({
      correct: 0,
      wrong: 50,
      net: 0,
      score: 0,
    });
    expect(result.courseStats[0].avgScore).toBe(0);
  });
});
