import { describe, expect, it } from 'vitest';
import type { AnalysisRecord } from '../db';
import { buildQuestionStats } from '../question-stats';

function makeRecord(): Pick<AnalysisRecord, 'result'> {
  return {
    result: {
      students: [
        {
          student: {
            lineNumber: 1,
            name: 'Ali',
            studentId: '1',
            booklet: 'A',
            answers: '',
            extras: {},
            rawLine: '',
          },
          booklet: 'A',
          excluded: false,
          courses: [
            {
              courseName: 'MAT',
              correct: 1,
              wrong: 1,
              empty: 1,
              net: 0,
              score: 0,
              participated: true,
              answers: '',
              evaluations: [
                { index: 0, studentAnswer: 'A', keyAnswer: 'A', verdict: 'correct' },
                { index: 1, studentAnswer: 'C', keyAnswer: 'B', verdict: 'wrong' },
                { index: 2, studentAnswer: '', keyAnswer: 'D', verdict: 'empty' },
              ],
            },
          ],
        },
        {
          student: {
            lineNumber: 2,
            name: 'Bora',
            studentId: '2',
            booklet: 'A',
            answers: '',
            extras: {},
            rawLine: '',
          },
          booklet: 'A',
          excluded: false,
          courses: [
            {
              courseName: 'MAT',
              correct: 2,
              wrong: 1,
              empty: 0,
              net: 0,
              score: 0,
              participated: true,
              answers: '',
              evaluations: [
                { index: 0, studentAnswer: 'A', keyAnswer: 'A', verdict: 'correct' },
                { index: 1, studentAnswer: 'D', keyAnswer: 'B', verdict: 'wrong' },
                { index: 2, studentAnswer: 'D', keyAnswer: 'D', verdict: 'correct' },
              ],
            },
          ],
        },
      ],
      excluded: [],
      courseStats: [],
      meta: {
        totalStudents: 2,
        evaluatedStudents: 2,
        excludedStudents: 0,
        invalidStudentIds: 0,
        bookletsAutoAssigned: false,
      },
    },
  };
}

describe('buildQuestionStats', () => {
  it('aggregates verdicts and option counts per question', () => {
    const stats = buildQuestionStats(makeRecord(), 'MAT');

    expect(stats).toHaveLength(3);
    expect(stats[0]).toMatchObject({
      index: 1,
      correct: 2,
      wrong: 0,
      empty: 0,
      total: 2,
      difficulty: 1,
      keyAnswer: 'A',
      optionCounts: { A: 2 },
    });
    expect(stats[1]).toMatchObject({
      index: 2,
      correct: 0,
      wrong: 2,
      total: 2,
      difficulty: 0,
      keyAnswer: 'B',
      optionCounts: { C: 1, D: 1 },
    });
    expect(stats[2]).toMatchObject({
      index: 3,
      correct: 1,
      empty: 1,
      total: 2,
      difficulty: 0.5,
      optionCounts: { Boş: 1, D: 1 },
    });
  });

  it('ignores courses where the student did not participate', () => {
    const record = makeRecord();
    record.result!.students[0].courses[0].participated = false;

    const stats = buildQuestionStats(record, 'MAT');

    expect(stats[0].total).toBe(1);
    expect(stats[0].correct).toBe(1);
  });
});
