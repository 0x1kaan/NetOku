import { describe, it, expect } from 'vitest';
import type { AnalysisRecord, PresetRecord } from '../db';
import type { AnalysisResult, StudentResult } from '@/types/domain';
import {
  buildAnalysisComparison,
  buildStudentProfile,
  buildStudentProgress,
  buildTopMovers,
  buildUsageDashboard,
  getAnalysisDate,
  getTotalNetForStudent,
  hasDetailedResult,
  listStudentDirectory,
  sortAnalysesAsc,
} from '../insights';

function makeStudent(
  studentId: string,
  name: string,
  courses: Array<{ name: string; net: number }>,
): StudentResult {
  return {
    student: {
      lineNumber: 1,
      name,
      studentId,
      booklet: 'A',
      answers: '',
      extras: {},
      rawLine: '',
    },
    booklet: 'A',
    excluded: false,
    courses: courses.map((c) => ({
      courseName: c.name,
      correct: 0,
      wrong: 0,
      empty: 0,
      net: c.net,
      score: c.net * 5,
      participated: c.net > 0,
      answers: '',
      evaluations: [],
    })),
  };
}

function makeResult(students: StudentResult[]): AnalysisResult {
  return {
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
}

function makeRecord(
  id: string,
  createdAt: string,
  students: StudentResult[],
  overrides: Partial<AnalysisRecord> = {},
): AnalysisRecord {
  const courses = students[0]?.courses.map((c) => c.courseName) ?? [];
  const avgs = courses.map((name) => {
    const nets = students.map(
      (s) => s.courses.find((c) => c.courseName === name)?.net ?? 0,
    );
    return {
      name,
      avgNet: nets.reduce((sum, n) => sum + n, 0) / (nets.length || 1),
      maxNet: Math.max(0, ...nets),
    };
  });
  return {
    id,
    user_id: 'user-1',
    organization_id: null,
    visibility: 'private',
    title: `Analiz ${id}`,
    file_name: null,
    file_size: null,
    settings: {
      nameColumn: { start: 1, length: 25 },
      studentIdColumn: { start: 26, length: 11 },
      bookletColumn: { start: 42, length: 1 },
      answersStart: 43,
      extras: [],
      courses: courses.map((name) => ({ name, questionCount: 20 })),
      wrongCriterion: 0,
    },
    summary: {
      totalStudents: students.length,
      evaluatedStudents: students.length,
      excludedStudents: 0,
      bookletsAutoAssigned: false,
      courses: avgs,
    },
    result: makeResult(students),
    student_count: students.length,
    excluded_count: 0,
    exam_date: null,
    exam_type: null,
    report_meta: {},
    created_at: createdAt,
    ...overrides,
  };
}

describe('getTotalNetForStudent', () => {
  it('sums course nets and rounds to 2 decimals', () => {
    const s = makeStudent('1', 'Ali', [
      { name: 'MAT', net: 12.333 },
      { name: 'TÜRK', net: 7.111 },
    ]);
    expect(getTotalNetForStudent(s)).toBe(19.44);
  });

  it('returns 0 for empty courses', () => {
    const s = makeStudent('1', 'Ali', []);
    expect(getTotalNetForStudent(s)).toBe(0);
  });
});

describe('getAnalysisDate', () => {
  it('prefers exam_date over created_at', () => {
    const rec = makeRecord('a', '2026-01-01T00:00:00Z', [], {
      exam_date: '2025-12-15T00:00:00Z',
    });
    expect(getAnalysisDate(rec)).toBe('2025-12-15T00:00:00Z');
  });

  it('falls back to created_at when exam_date is null', () => {
    const rec = makeRecord('a', '2026-01-01T00:00:00Z', []);
    expect(getAnalysisDate(rec)).toBe('2026-01-01T00:00:00Z');
  });
});

describe('sortAnalysesAsc', () => {
  it('sorts ascending by effective date', () => {
    const r1 = makeRecord('a', '2026-03-01T00:00:00Z', []);
    const r2 = makeRecord('b', '2026-01-01T00:00:00Z', []);
    const r3 = makeRecord('c', '2026-02-01T00:00:00Z', []);
    const sorted = sortAnalysesAsc([r1, r2, r3]);
    expect(sorted.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate input array', () => {
    const r1 = makeRecord('a', '2026-03-01T00:00:00Z', []);
    const r2 = makeRecord('b', '2026-01-01T00:00:00Z', []);
    const input = [r1, r2];
    sortAnalysesAsc(input);
    expect(input[0].id).toBe('a');
  });
});

describe('hasDetailedResult', () => {
  it('returns true when students are present', () => {
    const rec = makeRecord('a', '2026-01-01T00:00:00Z', [
      makeStudent('1', 'Ali', [{ name: 'MAT', net: 10 }]),
    ]);
    expect(hasDetailedResult(rec)).toBe(true);
  });

  it('returns false when result is null', () => {
    const rec = makeRecord('a', '2026-01-01T00:00:00Z', []);
    rec.result = null;
    expect(hasDetailedResult(rec)).toBe(false);
  });
});

describe('listStudentDirectory', () => {
  it('deduplicates students across records by studentId', () => {
    const s1 = makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]);
    const s2 = makeStudent('S2', 'Bora', [{ name: 'MAT', net: 15 }]);
    const r1 = makeRecord('r1', '2026-01-01T00:00:00Z', [s1, s2]);
    const r2 = makeRecord('r2', '2026-02-01T00:00:00Z', [s1]);
    const dir = listStudentDirectory([r1, r2]);
    expect(dir.length).toBe(2);
    const ali = dir.find((d) => d.studentId === 'S1');
    expect(ali?.lastSeenAt).toBe('2026-02-01T00:00:00Z');
  });

  it('sorts by name using Turkish locale', () => {
    const s1 = makeStudent('S1', 'Zeynep', [{ name: 'MAT', net: 10 }]);
    const s2 = makeStudent('S2', 'Çağla', [{ name: 'MAT', net: 15 }]);
    const s3 = makeStudent('S3', 'Ali', [{ name: 'MAT', net: 12 }]);
    const rec = makeRecord('r1', '2026-01-01T00:00:00Z', [s1, s2, s3]);
    const dir = listStudentDirectory([rec]);
    expect(dir.map((d) => d.name)).toEqual(['Ali', 'Çağla', 'Zeynep']);
  });

  it('skips students without studentId', () => {
    const s = makeStudent('', 'Ali', [{ name: 'MAT', net: 10 }]);
    const rec = makeRecord('r1', '2026-01-01T00:00:00Z', [s]);
    expect(listStudentDirectory([rec])).toEqual([]);
  });
});

describe('buildStudentProgress', () => {
  it('returns chronological per-analysis progress with rank', () => {
    const s1A = makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]);
    const s2A = makeStudent('S2', 'Bora', [{ name: 'MAT', net: 18 }]);
    const s1B = makeStudent('S1', 'Ali', [{ name: 'MAT', net: 16 }]);
    const s2B = makeStudent('S2', 'Bora', [{ name: 'MAT', net: 12 }]);
    const r1 = makeRecord('r1', '2026-01-01T00:00:00Z', [s1A, s2A]);
    const r2 = makeRecord('r2', '2026-02-01T00:00:00Z', [s1B, s2B]);

    const progress = buildStudentProgress([r2, r1], 'S1');
    expect(progress.length).toBe(2);
    expect(progress[0].analysisId).toBe('r1');
    expect(progress[0].rank).toBe(2);
    expect(progress[0].totalNet).toBe(10);
    expect(progress[1].analysisId).toBe('r2');
    expect(progress[1].rank).toBe(1);
    expect(progress[1].totalNet).toBe(16);
    expect(progress[1].totalStudents).toBe(2);
  });

  it('returns [] when student not present in any analysis', () => {
    const s = makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]);
    const rec = makeRecord('r1', '2026-01-01T00:00:00Z', [s]);
    expect(buildStudentProgress([rec], 'MISSING')).toEqual([]);
  });
});

describe('buildStudentProfile', () => {
  it('builds a student profile summary with total and course trends', () => {
    const s1A = makeStudent('S1', 'Ali', [
      { name: 'MAT', net: 10 },
      { name: 'TUR', net: 14 },
    ]);
    const s2A = makeStudent('S2', 'Bora', [
      { name: 'MAT', net: 18 },
      { name: 'TUR', net: 16 },
    ]);
    const s1B = makeStudent('S1', 'Ali', [
      { name: 'MAT', net: 16 },
      { name: 'TUR', net: 12 },
    ]);
    const s2B = makeStudent('S2', 'Bora', [
      { name: 'MAT', net: 12 },
      { name: 'TUR', net: 10 },
    ]);
    const r1 = makeRecord('r1', '2026-01-01T00:00:00Z', [s1A, s2A]);
    const r2 = makeRecord('r2', '2026-02-01T00:00:00Z', [s1B, s2B]);

    const profile = buildStudentProfile([r2, r1], 'S1');

    expect(profile?.summary).toMatchObject({
      studentId: 'S1',
      name: 'Ali',
      analysisCount: 2,
      latestNet: 28,
      previousNet: 24,
      deltaNet: 4,
      latestRank: 1,
      previousRank: 2,
      rankDelta: 1,
      strongestCourse: 'MAT',
      focusCourse: 'TUR',
    });
    expect(profile?.courseTrends.find((course) => course.name === 'MAT')).toMatchObject({
      latestNet: 16,
      previousNet: 10,
      deltaNet: 6,
      averageNet: 13,
    });
  });

  it('returns null when the student has no detailed history', () => {
    const rec = makeRecord('r1', '2026-01-01T00:00:00Z', [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]),
    ]);

    expect(buildStudentProfile([rec], 'MISSING')).toBeNull();
  });
});

describe('buildTopMovers', () => {
  it('computes risers and decliners between last two analyses', () => {
    const prev = [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]),
      makeStudent('S2', 'Bora', [{ name: 'MAT', net: 18 }]),
      makeStudent('S3', 'Ceren', [{ name: 'MAT', net: 8 }]),
    ];
    const curr = [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 16 }]),
      makeStudent('S2', 'Bora', [{ name: 'MAT', net: 10 }]),
      makeStudent('S3', 'Ceren', [{ name: 'MAT', net: 8 }]),
    ];
    const r1 = makeRecord('r1', '2026-01-01T00:00:00Z', prev);
    const r2 = makeRecord('r2', '2026-02-01T00:00:00Z', curr);
    const { topRisers, topDecliners } = buildTopMovers([r1, r2]);

    expect(topRisers.length).toBe(1);
    expect(topRisers[0].studentId).toBe('S1');
    expect(topRisers[0].deltaNet).toBe(6);

    expect(topDecliners.length).toBe(1);
    expect(topDecliners[0].studentId).toBe('S2');
    expect(topDecliners[0].deltaNet).toBe(-8);
  });

  it('returns empty lists when fewer than 2 analyses', () => {
    const rec = makeRecord('r1', '2026-01-01T00:00:00Z', [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]),
    ]);
    expect(buildTopMovers([rec])).toEqual({ topRisers: [], topDecliners: [] });
  });

  it('ignores students missing from previous analysis', () => {
    const prev = [makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }])];
    const curr = [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 15 }]),
      makeStudent('NEW', 'Neo', [{ name: 'MAT', net: 20 }]),
    ];
    const r1 = makeRecord('r1', '2026-01-01T00:00:00Z', prev);
    const r2 = makeRecord('r2', '2026-02-01T00:00:00Z', curr);
    const { topRisers } = buildTopMovers([r1, r2]);
    expect(topRisers.map((m) => m.studentId)).toEqual(['S1']);
  });
});

describe('buildAnalysisComparison', () => {
  it('computes delta per course between two analyses', () => {
    const left = makeRecord('l', '2026-01-01T00:00:00Z', [
      makeStudent('S1', 'Ali', [
        { name: 'MAT', net: 10 },
        { name: 'TÜRK', net: 15 },
      ]),
    ]);
    const right = makeRecord('r', '2026-02-01T00:00:00Z', [
      makeStudent('S1', 'Ali', [
        { name: 'MAT', net: 14 },
        { name: 'TÜRK', net: 12 },
      ]),
    ]);
    const rows = buildAnalysisComparison(left, right);
    expect(rows).toHaveLength(2);
    const mat = rows.find((r) => r.courseName === 'MAT')!;
    expect(mat.leftAvgNet).toBe(10);
    expect(mat.rightAvgNet).toBe(14);
    expect(mat.deltaNet).toBe(4);
  });

  it('returns 0 for right side when course missing on right', () => {
    const left = makeRecord('l', '2026-01-01T00:00:00Z', [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]),
    ]);
    const right = makeRecord('r', '2026-02-01T00:00:00Z', [
      makeStudent('S1', 'Ali', [{ name: 'TÜRK', net: 12 }]),
    ]);
    const rows = buildAnalysisComparison(left, right);
    expect(rows).toEqual([
      { courseName: 'MAT', leftAvgNet: 10, rightAvgNet: 0, deltaNet: -10 },
    ]);
  });

  it('returns [] when either side is null', () => {
    expect(buildAnalysisComparison(null, null)).toEqual([]);
  });
});

describe('buildUsageDashboard', () => {
  it('aggregates analyses, students, and presets', () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 5).toISOString();

    const r1 = makeRecord(
      'r1',
      thisMonth,
      [
        makeStudent('S1', 'Ali', [{ name: 'MAT', net: 10 }]),
        makeStudent('S2', 'Bora', [{ name: 'MAT', net: 12 }]),
      ],
      { visibility: 'organization' },
    );
    const r2 = makeRecord('r2', lastMonth, [
      makeStudent('S1', 'Ali', [{ name: 'MAT', net: 14 }]),
    ]);

    const preset: PresetRecord = {
      id: 'p1',
      user_id: 'u1',
      organization_id: 'o1',
      scope: 'organization',
      name: 'Test',
      description: null,
      category: 'default',
      settings: r1.settings,
      is_default: false,
      usage_count: 0,
      created_at: thisMonth,
      updated_at: thisMonth,
    };

    const snap = buildUsageDashboard([r1, r2], [preset]);
    expect(snap.totalAnalyses).toBe(2);
    expect(snap.thisMonthAnalyses).toBe(1);
    expect(snap.totalStudentsProcessed).toBe(3);
    expect(snap.uniqueStudentCount).toBe(2);
    expect(snap.sharedAnalyses).toBe(1);
    expect(snap.organizationPresets).toBe(1);
    expect(snap.averageStudentsPerAnalysis).toBe(1.5);
  });

  it('returns zeroed averages when there are no records', () => {
    const snap = buildUsageDashboard([], []);
    expect(snap.totalAnalyses).toBe(0);
    expect(snap.averageStudentsPerAnalysis).toBe(0);
  });
});
