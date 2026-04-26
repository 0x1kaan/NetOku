import type { AnalysisRecord, PresetRecord } from './db';

export interface StudentDirectoryEntry {
  studentId: string;
  name: string;
  lastSeenAt: string;
}

export interface StudentProgressPoint {
  analysisId: string;
  title: string;
  takenAt: string;
  totalNet: number;
  rank: number;
  totalStudents: number;
  courses: Array<{ name: string; net: number }>;
}

export interface StudentCourseTrend {
  name: string;
  latestNet: number;
  previousNet: number | null;
  deltaNet: number;
  averageNet: number;
  points: Array<{
    analysisId: string;
    title: string;
    takenAt: string;
    net: number;
  }>;
}

export interface StudentProfileSummary {
  studentId: string;
  name: string;
  lastSeenAt: string;
  analysisCount: number;
  latestNet: number;
  previousNet: number | null;
  deltaNet: number;
  latestRank: number;
  previousRank: number | null;
  rankDelta: number;
  totalStudents: number;
  strongestCourse: string | null;
  focusCourse: string | null;
}

export interface StudentProfileSnapshot {
  summary: StudentProfileSummary;
  progress: StudentProgressPoint[];
  courseTrends: StudentCourseTrend[];
}

export interface StudentMover {
  studentId: string;
  name: string;
  previousNet: number;
  currentNet: number;
  deltaNet: number;
}

export interface AnalysisComparisonRow {
  courseName: string;
  leftAvgNet: number;
  rightAvgNet: number;
  deltaNet: number;
}

export interface AnalysisComparisonSide {
  id: string;
  title: string;
  takenAt: string;
  totalStudents: number;
  evaluatedStudents: number;
  excludedStudents: number;
  avgNetOverall: number;
  courseCount: number;
}

export interface AnalysisComparisonSummary {
  left: AnalysisComparisonSide | null;
  right: AnalysisComparisonSide | null;
  totalStudentsDelta: number;
  evaluatedDelta: number;
  avgNetDelta: number;
}

export interface UsageDashboardSnapshot {
  totalAnalyses: number;
  thisMonthAnalyses: number;
  totalStudentsProcessed: number;
  uniqueStudentCount: number;
  sharedAnalyses: number;
  organizationPresets: number;
  averageStudentsPerAnalysis: number;
}

function roundTo(value: number, decimals = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

export function getAnalysisDate(record: AnalysisRecord): string {
  return record.exam_date ?? record.created_at;
}

export function sortAnalysesAsc(records: AnalysisRecord[]): AnalysisRecord[] {
  return [...records].sort(
    (left, right) =>
      new Date(getAnalysisDate(left)).getTime() - new Date(getAnalysisDate(right)).getTime(),
  );
}

export function hasDetailedResult(record: AnalysisRecord): boolean {
  return Boolean(record.result?.students?.length || record.result?.excluded?.length);
}

export function getTotalNetForStudent(student: {
  courses: Array<{ net: number }>;
}): number {
  return roundTo(student.courses.reduce((sum, course) => sum + course.net, 0));
}

export function listStudentDirectory(records: AnalysisRecord[]): StudentDirectoryEntry[] {
  const registry = new Map<string, StudentDirectoryEntry>();

  sortAnalysesAsc(records)
    .filter(hasDetailedResult)
    .forEach((record) => {
      record.result?.students.forEach((studentResult) => {
        if (!studentResult.student.studentId) return;
        registry.set(studentResult.student.studentId, {
          studentId: studentResult.student.studentId,
          name: studentResult.student.name,
          lastSeenAt: getAnalysisDate(record),
        });
      });
    });

  return [...registry.values()].sort((left, right) => left.name.localeCompare(right.name, 'tr'));
}

export function buildStudentProgress(
  records: AnalysisRecord[],
  studentId: string,
): StudentProgressPoint[] {
  return sortAnalysesAsc(records)
    .filter(hasDetailedResult)
    .flatMap((record) => {
      const students = record.result?.students ?? [];
      const ranked = [...students].sort(
        (left, right) => getTotalNetForStudent(right) - getTotalNetForStudent(left),
      );
      const found = students.find((student) => student.student.studentId === studentId);
      if (!found) return [];

      return [
        {
          analysisId: record.id,
          title: record.title,
          takenAt: getAnalysisDate(record),
          totalNet: getTotalNetForStudent(found),
          rank:
            ranked.findIndex((candidate) => candidate.student.studentId === studentId) + 1,
          totalStudents: students.length,
          courses: found.courses.map((course) => ({ name: course.courseName, net: course.net })),
        },
      ];
    });
}

export function buildStudentProfile(
  records: AnalysisRecord[],
  studentId: string,
): StudentProfileSnapshot | null {
  const progress = buildStudentProgress(records, studentId);
  const latest = progress.at(-1);
  if (!latest) return null;

  const previous = progress.at(-2) ?? null;
  const courseNames = new Set<string>();
  progress.forEach((point) => {
    point.courses.forEach((course) => courseNames.add(course.name));
  });

  const courseTrends: StudentCourseTrend[] = [...courseNames]
    .map((courseName) => {
      const points = progress.flatMap((point) => {
        const course = point.courses.find((item) => item.name === courseName);
        if (!course) return [];
        return [
          {
            analysisId: point.analysisId,
            title: point.title,
            takenAt: point.takenAt,
            net: roundTo(course.net),
          },
        ];
      });
      const latestCourse = points.at(-1);
      const previousCourse = points.at(-2) ?? null;
      const averageNet =
        points.length > 0
          ? roundTo(points.reduce((sum, point) => sum + point.net, 0) / points.length)
          : 0;

      return {
        name: courseName,
        latestNet: latestCourse?.net ?? 0,
        previousNet: previousCourse?.net ?? null,
        deltaNet: roundTo((latestCourse?.net ?? 0) - (previousCourse?.net ?? 0)),
        averageNet,
        points,
      };
    })
    .sort((left, right) => right.latestNet - left.latestNet);

  const latestCourses = [...courseTrends].filter((course) => course.points.length > 0);
  const strongestCourse = latestCourses.at(0)?.name ?? null;
  const focusCourse = [...latestCourses].sort((left, right) => left.latestNet - right.latestNet).at(0)
    ?.name ?? null;

  return {
    summary: {
      studentId,
      name: listStudentDirectory(records).find((student) => student.studentId === studentId)
        ?.name ?? studentId,
      lastSeenAt: latest.takenAt,
      analysisCount: progress.length,
      latestNet: latest.totalNet,
      previousNet: previous?.totalNet ?? null,
      deltaNet: roundTo(latest.totalNet - (previous?.totalNet ?? latest.totalNet)),
      latestRank: latest.rank,
      previousRank: previous?.rank ?? null,
      rankDelta: (previous?.rank ?? latest.rank) - latest.rank,
      totalStudents: latest.totalStudents,
      strongestCourse,
      focusCourse,
    },
    progress,
    courseTrends,
  };
}

export function buildTopMovers(records: AnalysisRecord[]): {
  topRisers: StudentMover[];
  topDecliners: StudentMover[];
} {
  const detailed = sortAnalysesAsc(records).filter(hasDetailedResult);
  const previous = detailed.at(-2);
  const current = detailed.at(-1);
  if (!previous || !current) {
    return { topRisers: [], topDecliners: [] };
  }

  const previousByStudent = new Map(
    (previous.result?.students ?? []).map((student) => [
      student.student.studentId,
      {
        name: student.student.name,
        totalNet: getTotalNetForStudent(student),
      },
    ]),
  );

  const movers = (current.result?.students ?? [])
    .map((student) => {
      const prior = previousByStudent.get(student.student.studentId);
      if (!prior) return null;
      return {
        studentId: student.student.studentId,
        name: student.student.name,
        previousNet: prior.totalNet,
        currentNet: getTotalNetForStudent(student),
        deltaNet: roundTo(getTotalNetForStudent(student) - prior.totalNet),
      };
    })
    .filter((item): item is StudentMover => Boolean(item))
    .sort((left, right) => right.deltaNet - left.deltaNet);

  return {
    topRisers: movers.filter((item) => item.deltaNet > 0).slice(0, 5),
    topDecliners: [...movers]
      .filter((item) => item.deltaNet < 0)
      .sort((left, right) => left.deltaNet - right.deltaNet)
      .slice(0, 5),
  };
}

export function buildAnalysisComparison(
  left: AnalysisRecord | null,
  right: AnalysisRecord | null,
): AnalysisComparisonRow[] {
  if (!left || !right) return [];

  const rightByCourse = new Map(right.summary.courses.map((course) => [course.name, course]));
  return left.summary.courses.map((leftCourse) => {
    const rightCourse = rightByCourse.get(leftCourse.name);
    const rightAvgNet = rightCourse?.avgNet ?? 0;
    return {
      courseName: leftCourse.name,
      leftAvgNet: roundTo(leftCourse.avgNet),
      rightAvgNet: roundTo(rightAvgNet),
      deltaNet: roundTo(rightAvgNet - leftCourse.avgNet),
    };
  });
}

function buildComparisonSide(record: AnalysisRecord | null): AnalysisComparisonSide | null {
  if (!record) return null;
  const courses = record.summary.courses ?? [];
  const avgNetOverall =
    courses.length > 0
      ? roundTo(courses.reduce((sum, course) => sum + course.avgNet, 0) / courses.length)
      : 0;
  return {
    id: record.id,
    title: record.title,
    takenAt: getAnalysisDate(record),
    totalStudents: record.summary.totalStudents,
    evaluatedStudents: record.summary.evaluatedStudents,
    excludedStudents: record.summary.excludedStudents,
    avgNetOverall,
    courseCount: courses.length,
  };
}

export function buildAnalysisComparisonSummary(
  left: AnalysisRecord | null,
  right: AnalysisRecord | null,
): AnalysisComparisonSummary {
  const leftSide = buildComparisonSide(left);
  const rightSide = buildComparisonSide(right);
  return {
    left: leftSide,
    right: rightSide,
    totalStudentsDelta: (rightSide?.totalStudents ?? 0) - (leftSide?.totalStudents ?? 0),
    evaluatedDelta: (rightSide?.evaluatedStudents ?? 0) - (leftSide?.evaluatedStudents ?? 0),
    avgNetDelta: roundTo((rightSide?.avgNetOverall ?? 0) - (leftSide?.avgNetOverall ?? 0)),
  };
}

export function buildUsageDashboard(
  records: AnalysisRecord[],
  presets: PresetRecord[],
): UsageDashboardSnapshot {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const uniqueStudents = new Set<string>();
  let studentTotal = 0;

  records
    .filter(hasDetailedResult)
    .forEach((record) => {
      (record.result?.students ?? []).forEach((student) => {
        studentTotal += 1;
        if (student.student.studentId) uniqueStudents.add(student.student.studentId);
      });
    });

  return {
    totalAnalyses: records.length,
    thisMonthAnalyses: records.filter(
      (record) => new Date(getAnalysisDate(record)).getTime() >= monthStart,
    ).length,
    totalStudentsProcessed: studentTotal,
    uniqueStudentCount: uniqueStudents.size,
    sharedAnalyses: records.filter((record) => record.visibility === 'organization').length,
    organizationPresets: presets.filter((preset) => preset.scope === 'organization').length,
    averageStudentsPerAnalysis:
      records.length > 0 ? roundTo(studentTotal / records.length) : 0,
  };
}
