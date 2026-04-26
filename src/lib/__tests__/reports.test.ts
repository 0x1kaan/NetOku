import { describe, it, expect } from 'vitest';
import type { AnalysisRecord } from '../db';
import type { AnalysisResult, StudentResult } from '@/types/domain';
import { buildStudentReportPayload, type ReportBranding } from '../reports';

function makeStudent(
  studentId: string,
  name: string,
  courses: Array<{ name: string; correct: number; wrong: number; empty: number; net: number; score: number }>,
  booklet = 'A',
): StudentResult {
  return {
    student: {
      lineNumber: 1,
      name,
      studentId,
      booklet,
      answers: '',
      extras: {},
      rawLine: '',
    },
    booklet,
    excluded: false,
    courses: courses.map((c) => ({
      courseName: c.name,
      correct: c.correct,
      wrong: c.wrong,
      empty: c.empty,
      net: c.net,
      score: c.score,
      participated: c.correct + c.wrong > 0,
      answers: '',
      evaluations: [],
    })),
  };
}

function makeRecord(students: StudentResult[], courseStats: Array<{ name: string; avgNet: number; maxNet: number }>): AnalysisRecord {
  const result: AnalysisResult = {
    students,
    excluded: [],
    courseStats: [],
    meta: {
      totalStudents: students.length,
      evaluatedStudents: students.length,
      excludedStudents: 0,
      invalidStudentIds: 0,
      bookletsAutoAssigned: false,
    },
  } as AnalysisResult;

  return {
    id: 'rec-1',
    user_id: 'user-1',
    organization_id: null,
    visibility: 'private',
    title: 'Deneme 1',
    file_name: 'deneme.txt',
    file_size: 1024,
    settings: {
      nameColumn: { start: 1, length: 25 },
      studentIdColumn: { start: 26, length: 11 },
      bookletColumn: { start: 42, length: 1 },
      answersStart: 43,
      extras: [],
      courses: courseStats.map((c) => ({ name: c.name, questionCount: 20 })),
      wrongCriterion: 0,
    },
    summary: {
      totalStudents: students.length,
      evaluatedStudents: students.length,
      excludedStudents: 0,
      bookletsAutoAssigned: false,
      courses: courseStats,
    },
    result,
    student_count: students.length,
    excluded_count: 0,
    exam_date: '2026-04-10T00:00:00Z',
    exam_type: 'TYT',
    report_meta: {},
    created_at: '2026-04-11T00:00:00Z',
  };
}

const branding: ReportBranding = {
  brandName: 'NetOku',
  logoUrl: null,
  primaryColor: '#863bff',
  accentColor: '#F5F1E8',
};

describe('buildStudentReportPayload', () => {
  it('returns null when student is not found', () => {
    const rec = makeRecord(
      [makeStudent('S1', 'Ali', [{ name: 'MAT', correct: 10, wrong: 0, empty: 10, net: 10, score: 50 }])],
      [{ name: 'MAT', avgNet: 10, maxNet: 10 }],
    );
    expect(buildStudentReportPayload({ record: rec, studentId: 'MISSING', branding })).toBeNull();
  });

  it('builds payload with rank, class average, and per-course stats', () => {
    const students = [
      makeStudent('S1', 'Ali', [
        { name: 'MAT', correct: 18, wrong: 0, empty: 2, net: 18, score: 90 },
        { name: 'TÜRK', correct: 12, wrong: 4, empty: 4, net: 11, score: 55 },
      ]),
      makeStudent('S2', 'Bora', [
        { name: 'MAT', correct: 10, wrong: 2, empty: 8, net: 9.5, score: 47.5 },
        { name: 'TÜRK', correct: 16, wrong: 0, empty: 4, net: 16, score: 80 },
      ]),
      makeStudent('S3', 'Ceren', [
        { name: 'MAT', correct: 14, wrong: 0, empty: 6, net: 14, score: 70 },
        { name: 'TÜRK', correct: 13, wrong: 0, empty: 7, net: 13, score: 65 },
      ]),
    ];
    const rec = makeRecord(students, [
      { name: 'MAT', avgNet: 13.83, maxNet: 18 },
      { name: 'TÜRK', avgNet: 13.33, maxNet: 16 },
    ]);

    const payload = buildStudentReportPayload({ record: rec, studentId: 'S1', branding });
    expect(payload).not.toBeNull();
    expect(payload!.analysisId).toBe('rec-1');
    expect(payload!.analysisTitle).toBe('Deneme 1');
    // exam_date wins over created_at
    expect(payload!.analysisDate).toBe('2026-04-10T00:00:00Z');
    expect(payload!.branding).toEqual(branding);

    expect(payload!.student.id).toBe('S1');
    expect(payload!.student.name).toBe('Ali');
    expect(payload!.student.totalStudents).toBe(3);
    // Ali total = 18+11 = 29, Bora = 9.5+16 = 25.5, Ceren = 14+13 = 27 → Ali #1
    expect(payload!.student.rank).toBe(1);
    expect(payload!.student.totalNet).toBe(29);

    // strongest = MAT (18), needs attention = TÜRK (11)
    expect(payload!.summary.strongestCourse).toBe('MAT');
    expect(payload!.summary.needsAttentionCourse).toBe('TÜRK');
    // class average total = (29 + 25.5 + 27) / 3 = 27.1667 → rounded 27.17
    expect(payload!.summary.classAverageTotalNet).toBe(27.17);

    expect(payload!.courses).toHaveLength(2);
    const mat = payload!.courses.find((c) => c.name === 'MAT')!;
    expect(mat.correct).toBe(18);
    expect(mat.net).toBe(18);
    expect(mat.classAverageNet).toBe(13.83);
    expect(mat.maxNet).toBe(18);
  });

  it('falls back to "-" when booklet is blank', () => {
    const s = makeStudent(
      'S1',
      'Ali',
      [{ name: 'MAT', correct: 0, wrong: 0, empty: 20, net: 0, score: 0 }],
      '',
    );
    const rec = makeRecord([s], [{ name: 'MAT', avgNet: 0, maxNet: 0 }]);
    const payload = buildStudentReportPayload({ record: rec, studentId: 'S1', branding });
    expect(payload!.student.booklet).toBe('-');
  });

  it('zeros classAverageNet/maxNet when course missing from summary', () => {
    const s = makeStudent('S1', 'Ali', [
      { name: 'FİZİK', correct: 5, wrong: 0, empty: 15, net: 5, score: 25 },
    ]);
    const rec = makeRecord([s], []); // empty summary
    const payload = buildStudentReportPayload({ record: rec, studentId: 'S1', branding });
    expect(payload!.courses[0].classAverageNet).toBe(0);
    expect(payload!.courses[0].maxNet).toBe(0);
  });

  it('computes rank correctly with tied totals (first-match ordering)', () => {
    const students = [
      makeStudent('S1', 'Ali', [{ name: 'MAT', correct: 10, wrong: 0, empty: 10, net: 10, score: 50 }]),
      makeStudent('S2', 'Bora', [{ name: 'MAT', correct: 10, wrong: 0, empty: 10, net: 10, score: 50 }]),
    ];
    const rec = makeRecord(students, [{ name: 'MAT', avgNet: 10, maxNet: 10 }]);
    const payload = buildStudentReportPayload({ record: rec, studentId: 'S2', branding });
    expect(payload!.student.rank).toBeGreaterThan(0);
    expect(payload!.student.totalStudents).toBe(2);
  });

  it('sets generatedAt to a valid ISO timestamp', () => {
    const s = makeStudent('S1', 'Ali', [
      { name: 'MAT', correct: 10, wrong: 0, empty: 10, net: 10, score: 50 },
    ]);
    const rec = makeRecord([s], [{ name: 'MAT', avgNet: 10, maxNet: 10 }]);
    const payload = buildStudentReportPayload({ record: rec, studentId: 'S1', branding });
    expect(() => new Date(payload!.generatedAt).toISOString()).not.toThrow();
  });
});
