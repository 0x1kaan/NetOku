import { describe, it, expect } from 'vitest';
import { parseFile } from '../parser';
import {
  buildKey,
  buildRow,
  buildSplitAnswerArea,
  defaultSettings,
  sampleFileBasic,
  singleCourseOnlyA,
} from './fixtures';

describe('parseFile', () => {
  it('extracts answer keys based on all-zero student IDs', () => {
    const result = parseFile(sampleFileBasic, defaultSettings);
    expect(result.answerKeys.length).toBe(2);
    expect(result.answerKeys[0].booklet).toBe('A');
    expect(result.answerKeys[1].booklet).toBe('B');
  });

  it('parses student rows correctly', () => {
    const result = parseFile(sampleFileBasic, defaultSettings);
    const mehmet = result.students.find((s) => s.name.startsWith('MEHMET'));
    expect(mehmet).toBeDefined();
    expect(mehmet?.studentId).toBe('25860121540');
    expect(mehmet?.booklet).toBe('A');
  });

  it('flags invalid student IDs', () => {
    const result = parseFile(sampleFileBasic, defaultSettings);
    const invalidIssues = result.issues.filter((i) => i.type === 'invalid_student_id');
    expect(invalidIssues.length).toBeGreaterThanOrEqual(1);
    expect(invalidIssues.some((i) => i.studentId?.includes('*'))).toBe(true);
  });

  it('flags student IDs with the wrong digit count', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'SHORT ID', studentId: '123456789', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');
    const result = parseFile(raw, defaultSettings);
    const invalidIssues = result.issues.filter((i) => i.type === 'invalid_student_id');
    expect(invalidIssues).toHaveLength(1);
    expect(invalidIssues[0].message).toContain('11');
  });

  it('skips blank lines', () => {
    const raw = ['', sampleFileBasic, '', ''].join('\n');
    const result = parseFile(raw, defaultSettings);
    expect(result.students.length).toBeGreaterThan(0);
  });

  it('handles single-booklet file', () => {
    const result = parseFile(singleCourseOnlyA, defaultSettings);
    expect(result.answerKeys.length).toBe(1);
    expect(result.answerKeys[0].booklet).toBe('A');
    expect(result.students.length).toBe(2);
  });

  it('detects duplicate student IDs', () => {
    const dup = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'AHMET DEMIR', studentId: '12345678901', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
      buildRow({ name: 'IKI KISI', studentId: '12345678901', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');
    const result = parseFile(dup, defaultSettings);
    const dups = result.issues.filter((i) => i.type === 'duplicate_student_id');
    expect(dups.length).toBe(1);
  });

  it('treats rows with blank student IDs as answer keys', () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'NUMARASIZ OGRENCI', studentId: '           ', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');

    const result = parseFile(raw, defaultSettings);

    expect(result.answerKeys).toHaveLength(2);
    expect(result.answerKeys[1].answers).toBe('ABCDABCDABCDABCDABCD');
    expect(result.students).toHaveLength(0);
    expect(result.issues.some((issue) => issue.type === 'invalid_student_id')).toBe(false);
  });

  it('treats rows with blank names and blank student IDs as answer keys', () => {
    const raw = buildRow({
      name: '',
      studentId: '           ',
      booklet: 'B',
      answers: 'DCBADCBADCBADCBADCBA',
    });

    const result = parseFile(raw, defaultSettings);

    expect(result.answerKeys).toEqual([
      { booklet: 'B', answers: 'DCBADCBADCBADCBADCBA' },
    ]);
    expect(result.students).toHaveLength(0);
  });

  it('preserves layout gaps inside split answer areas for absolute course offsets', () => {
    const keyAnswers = buildSplitAnswerArea('ABCDABCDABCD', 'DCBADCBADCBADCBA');
    const studentAnswers = buildSplitAnswerArea(' BCDABCDABCD', 'DCBADCBADCBADCB ');
    const raw = [
      buildKey('A', keyAnswers),
      buildRow({
        name: 'SPLIT OMR',
        studentId: '12345678901',
        booklet: 'A',
        answers: studentAnswers,
      }),
    ].join('\n');

    const result = parseFile(raw, {
      ...defaultSettings,
      courses: [{ name: 'TEST', questionCount: 28 }],
    });

    expect(result.answerKeys[0].answers).toBe(keyAnswers);
    expect(result.students[0].answers).toBe(studentAnswers.replace(/\s+$/, ''));
    expect(result.students[0].answers).toHaveLength(65);
  });
});
