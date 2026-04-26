import { describe, it, expect } from 'vitest';
import { parseFile } from '../parser';
import { analyze } from '../analyzer';
import {
  buildSplitAnswerArea,
  defaultSettings,
  singleCourseOnlyA,
  buildRow,
  buildKey,
} from './fixtures';
import type { FormSettings } from '@/types/domain';

describe('analyze', () => {
  it('computes correct/wrong/empty/net/score for perfect student', () => {
    const parsed = parseFile(singleCourseOnlyA, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    const ahmet = result.students.find((s) => s.student.name.startsWith('AHMET'));
    expect(ahmet?.courses[0].correct).toBe(20);
    expect(ahmet?.courses[0].wrong).toBe(0);
    expect(ahmet?.courses[0].empty).toBe(0);
    expect(ahmet?.courses[0].net).toBe(20);
    expect(ahmet?.courses[0].score).toBe(100);
    expect(ahmet?.courses[0].participated).toBe(true);
  });

  it('detects empty answers marked as X', () => {
    const parsed = parseFile(singleCourseOnlyA, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    const ayse = result.students.find((s) => s.student.name.startsWith('AYSE'));
    expect(ayse?.courses[0].correct).toBe(16);
    expect(ayse?.courses[0].wrong).toBe(4);
  });

  it('applies wrong criterion (4 wrongs cancel 1 correct)', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'TEST', studentId: '12345678901', booklet: 'A', answers: 'ABCDBBBBABCDABCDABCD' }),
    ].join('\n');
    const settings: FormSettings = {
      ...defaultSettings,
      wrongCriterion: 4,
      courses: [{ name: 'TEST', questionCount: 20 }],
    };
    const parsed = parseFile(raw, settings);
    const result = analyze(parsed.students, parsed.answerKeys, settings);
    const s = result.students[0];
    expect(s.courses[0].correct).toBe(17);
    expect(s.courses[0].wrong).toBe(3);
    expect(s.courses[0].net).toBeCloseTo(17 - 3 / 4, 2);
    expect(s.courses[0].score).toBeCloseTo((17 - 3 / 4) * 5, 2);
  });

  it('treats "*" in answer key as free (correct for everyone)', () => {
    const raw = [
      buildKey('A', 'A*CDABCDABCDABCDABCD'),
      buildRow({ name: 'WRONG', studentId: '12345678901', booklet: 'A', answers: 'ZZCDABCDABCDABCDABCD' }),
    ].join('\n');
    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    const s = result.students[0];
    expect(s.courses[0].correct).toBe(19);
    expect(s.courses[0].wrong).toBe(1);
  });

  it('auto-assigns all to A when >50% missing booklet', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'S1', studentId: '10000000001', booklet: ' ', answers: 'ABCDABCDABCDABCDABCD' }),
      buildRow({ name: 'S2', studentId: '10000000002', booklet: ' ', answers: 'ABCDABCDABCDABCDABCD' }),
      buildRow({ name: 'S3', studentId: '10000000003', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');
    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    expect(result.meta.bookletsAutoAssigned).toBe(true);
    expect(result.excluded.length).toBe(0);
    expect(result.students.length).toBe(3);
    expect(result.answerKeys?.map((key) => key.booklet)).toEqual(['A']);
  });

  it('excludes missing-booklet students when A/B keys present and majority OK', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildKey('B', 'DCBADCBADCBADCBADCBA'),
      buildRow({ name: 'HAS_A', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
      buildRow({ name: 'HAS_B', studentId: '10000000002', booklet: 'B', answers: 'DCBADCBADCBADCBADCBA' }),
      buildRow({ name: 'HAS_A2', studentId: '10000000003', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
      buildRow({ name: 'NO_BOOK', studentId: '10000000004', booklet: ' ', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');
    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    expect(result.excluded.length).toBe(1);
    expect(result.students.length).toBe(3);
    expect(result.excluded[0].courses).toHaveLength(1);
    expect(result.excluded[0].courses[0].participated).toBe(false);
  });

  it('keeps empty course results for students excluded by missing answer key', () => {
    const raw = buildRow({
      name: 'NO KEY',
      studentId: '10000000001',
      booklet: 'A',
      answers: 'DCBADCBADCBADCBADCBA',
    });
    const settings: FormSettings = {
      ...defaultSettings,
      courses: [
        { name: 'C1', questionCount: 10 },
        { name: 'C2', questionCount: 10 },
      ],
    };

    const parsed = parseFile(raw, settings);
    const result = analyze(parsed.students, parsed.answerKeys, settings);

    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].courses).toHaveLength(2);
    expect(result.excluded[0].courses.map((course) => course.participated)).toEqual([false, false]);
    expect(result.excluded[0].courses.map((course) => course.empty)).toEqual([10, 10]);
  });

  it('uses per-course points when provided', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'S1', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');
    const settings: FormSettings = {
      ...defaultSettings,
      courses: [{ name: 'TEST', questionCount: 20, points: 5 }],
    };
    const parsed = parseFile(raw, settings);
    const result = analyze(parsed.students, parsed.answerKeys, settings);
    expect(result.students[0].courses[0].score).toBe(100);
  });

  it('uses A in single-booklet mode when booklets are missing', () => {
    const raw = [
      buildKey('B', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'S1', studentId: '10000000001', booklet: ' ', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');

    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);

    expect(result.meta.bookletsAutoAssigned).toBe(true);
    expect(result.students[0].booklet).toBe('A');
    expect(result.students[0].courses[0].correct).toBe(20);
  });

  it('keeps negative net when wrong answers outweigh correct ones', () => {
    const raw = [
      buildKey('A', 'AAAA'),
      buildRow({ name: 'LOW NET', studentId: '12345678901', booklet: 'A', answers: 'BBBB' }),
    ].join('\n');
    const settings: FormSettings = {
      ...defaultSettings,
      wrongCriterion: 4,
      courses: [{ name: 'TEST', questionCount: 4 }],
    };

    const parsed = parseFile(raw, settings);
    const result = analyze(parsed.students, parsed.answerKeys, settings);

    expect(result.students[0].courses[0].correct).toBe(0);
    expect(result.students[0].courses[0].wrong).toBe(4);
    expect(result.students[0].courses[0].net).toBe(-1);
  });

  it('falls back to equal-distribution scoring when no points given', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'S1', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDXXXX' }),
    ].join('\n');
    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    expect(result.students[0].courses[0].score).toBe(80);
  });

  it('computes course stats correctly', () => {
    const parsed = parseFile(singleCourseOnlyA, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    expect(result.courseStats.length).toBe(1);
    expect(result.courseStats[0].maxNet).toBe(20);
    expect(result.courseStats[0].avgNet).toBe(18);
  });

  it('handles multiple courses with contiguous offsets', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCDDCBADCBADCBADCBADCBA'),
      buildRow({ name: 'S1', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDABCDDCBADCBADCBADCBADCBA' }),
    ].join('\n');
    const settings: FormSettings = {
      ...defaultSettings,
      courses: [
        { name: 'C1', questionCount: 20 },
        { name: 'C2', questionCount: 20 },
      ],
    };
    const parsed = parseFile(raw, settings);
    const result = analyze(parsed.students, parsed.answerKeys, settings);
    expect(result.students[0].courses[0].correct).toBe(20);
    expect(result.students[0].courses[1].correct).toBe(20);
  });

  it('grades split answer blocks using absolute course offsets', () => {
    const raw = [
      buildKey('A', buildSplitAnswerArea('ABCDABCDABCD', 'DCBADCBADCBADCBA')),
      buildRow({
        name: 'SPLIT',
        studentId: '10000000001',
        booklet: 'A',
        answers: buildSplitAnswerArea(' BCDABCDABCD', 'DCBADCBADCBADCB '),
      }),
    ].join('\n');
    const settings: FormSettings = {
      ...defaultSettings,
      courses: [
        { name: 'C1', questionCount: 12 },
        { name: 'C2', questionCount: 16, startOffset: 93 },
      ],
    };

    const parsed = parseFile(raw, settings);
    const result = analyze(parsed.students, parsed.answerKeys, settings);

    expect(result.students[0].courses[0].correct).toBe(11);
    expect(result.students[0].courses[0].wrong).toBe(0);
    expect(result.students[0].courses[0].empty).toBe(1);
    expect(result.students[0].courses[1].correct).toBe(15);
    expect(result.students[0].courses[1].wrong).toBe(0);
    expect(result.students[0].courses[1].empty).toBe(1);
  });

  it('keeps normalized answer keys in the final analysis result', () => {
    const raw = [
      buildKey('b', 'DCBADCBADCBADCBADCBA'),
      buildKey('a', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'S1', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');

    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);

    expect(result.answerKeys).toEqual([
      { booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' },
      { booklet: 'B', answers: 'DCBADCBADCBADCBADCBA' },
    ]);
  });
});
