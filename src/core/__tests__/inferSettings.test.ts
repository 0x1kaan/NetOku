import { describe, expect, it } from 'vitest';
import { inferSettingsFromText } from '../inferSettings';
import { buildKey, buildRow, buildSplitAnswerArea, defaultSettings } from './fixtures';

describe('inferSettingsFromText', () => {
  it('infers the standard fixed-width OMR layout', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({
        name: 'ALI TEST',
        studentId: '12345678901',
        booklet: 'A',
        answers: 'ABCDABCDABCDABCDABCD',
      }),
    ].join('\n');

    const result = inferSettingsFromText(raw, defaultSettings);

    expect(result.applied).toBe(true);
    expect(result.settings.nameColumn).toEqual({ start: 1, length: 25 });
    expect(result.settings.studentIdColumn).toEqual({ start: 26, length: 11 });
    expect(result.settings.bookletColumn).toEqual({ start: 42, length: 1 });
    expect(result.settings.answersStart).toBe(43);
    expect(result.settings.courses).toEqual([{ name: 'Ders 1', questionCount: 20 }]);
  });

  it('infers split answer blocks as separate courses with absolute starts', () => {
    const raw = [
      buildKey('A', buildSplitAnswerArea('ABCDABCDABCD', 'DCBADCBADCBADCBA')),
      buildRow({
        name: 'SPLIT TEST',
        studentId: '12345678901',
        booklet: 'A',
        answers: buildSplitAnswerArea('ABCDABCDABCD', 'DCBADCBADCBADCBA'),
      }),
    ].join('\n');

    const result = inferSettingsFromText(raw, defaultSettings);

    expect(result.applied).toBe(true);
    expect(result.settings.answersStart).toBe(43);
    expect(result.settings.courses).toEqual([
      { name: 'Ders 1', questionCount: 12 },
      { name: 'Ders 2', questionCount: 16, startOffset: 93 },
    ]);
  });

  it('handles layouts where the booklet is separated from answers by a blank column', () => {
    const name = 'NEU TEST'.padEnd(25, ' ');
    const studentId = '12345678901';
    const raw = [
      `${' '.repeat(36)}A ABCDABCDABCDABCDABCD`,
      `${name}${studentId}A ABCDABCDABCDABCDABCD`,
    ].join('\n');

    const result = inferSettingsFromText(raw, defaultSettings);

    expect(result.applied).toBe(true);
    expect(result.settings.bookletColumn).toEqual({ start: 37, length: 1 });
    expect(result.settings.answersStart).toBe(39);
    expect(result.settings.extras).toEqual([]);
    expect(result.settings.courses).toEqual([{ name: 'Ders 1', questionCount: 20 }]);
  });
});
