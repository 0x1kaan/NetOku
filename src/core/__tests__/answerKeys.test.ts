import { describe, expect, it } from 'vitest';
import {
  extractAnswerKeysFromKeyFile,
  getCourseAnswerRanges,
  getRequiredAnswerLength,
  mergeAnswerKeys,
} from '../answerKeys';
import { defaultSettings } from './fixtures';

describe('answer key helpers', () => {
  it('calculates required answer length with sparse course offsets', () => {
    const required = getRequiredAnswerLength({
      ...defaultSettings,
      courses: [
        { name: 'Vize', questionCount: 12 },
        { name: 'Odev', questionCount: 16, startOffset: 93 },
      ],
    });

    expect(required).toBe(66);
  });

  it('returns course answer ranges with sparse offsets', () => {
    expect(
      getCourseAnswerRanges({
        ...defaultSettings,
        courses: [
          { name: 'Vize', questionCount: 12 },
          { name: 'Odev', questionCount: 16, startOffset: 93 },
        ],
      }),
    ).toEqual([
      { courseName: 'Vize', start: 0, length: 12 },
      { courseName: 'Odev', start: 50, length: 16 },
    ]);
  });

  it('extracts booklet+answers from plain legacy key files', () => {
    const settings = {
      ...defaultSettings,
      courses: [
        { name: 'Vize', questionCount: 12 },
        { name: 'Odev', questionCount: 16, startOffset: 93 },
      ],
    };

    const raw = [
      '                                         AEBBEADBDCECD                                      CAABEDECDABBDACA',
      '                                         BDCDABCAEEDCD                                      CBABEDECDABACBAE',
    ].join('\n');

    expect(extractAnswerKeysFromKeyFile(raw, settings)).toEqual([
      { booklet: 'A', answers: 'EBBEADBDCECD                                      CAABEDECDABBDACA' },
      { booklet: 'B', answers: 'DCDABCAEEDCD                                      CBABEDECDABACBAE' },
    ]);
  });

  it('merges answer keys by booklet and lets later values win', () => {
    expect(
      mergeAnswerKeys(
        [{ booklet: 'a', answers: 'AAAA' }],
        [
          { booklet: 'B', answers: 'BBBB' },
          { booklet: 'A', answers: 'ZZZZ' },
        ],
      ),
    ).toEqual([
      { booklet: 'A', answers: 'ZZZZ' },
      { booklet: 'B', answers: 'BBBB' },
    ]);
  });
});
