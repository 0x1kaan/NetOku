import type { AnalysisRecord } from './db';
import { getAnalysisDate, getTotalNetForStudent } from './insights';

export interface ReportBranding {
  brandName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
}

export interface StudentReportPayload {
  analysisId: string;
  analysisTitle: string;
  analysisDate: string;
  generatedAt: string;
  branding: ReportBranding;
  student: {
    id: string;
    name: string;
    booklet: string;
    rank: number;
    totalStudents: number;
    totalNet: number;
  };
  summary: {
    classAverageTotalNet: number;
    strongestCourse: string | null;
    needsAttentionCourse: string | null;
  };
  courses: Array<{
    name: string;
    correct: number;
    wrong: number;
    empty: number;
    net: number;
    score: number;
    classAverageNet: number;
    maxNet: number;
  }>;
}

export function buildStudentReportPayload(params: {
  record: AnalysisRecord;
  studentId: string;
  branding: ReportBranding;
}): StudentReportPayload | null {
  const { record, studentId, branding } = params;
  const students = record.result?.students ?? [];
  const target = students.find((student) => student.student.studentId === studentId);
  if (!target) return null;

  const ranked = [...students].sort(
    (left, right) => getTotalNetForStudent(right) - getTotalNetForStudent(left),
  );
  const classAverageTotalNet =
    students.length > 0
      ? students.reduce((sum, student) => sum + getTotalNetForStudent(student), 0) / students.length
      : 0;

  const strongestCourse = [...target.courses].sort((left, right) => right.net - left.net)[0];
  const needsAttentionCourse = [...target.courses].sort((left, right) => left.net - right.net)[0];

  return {
    analysisId: record.id,
    analysisTitle: record.title,
    analysisDate: getAnalysisDate(record),
    generatedAt: new Date().toISOString(),
    branding,
    student: {
      id: target.student.studentId,
      name: target.student.name,
      booklet: target.booklet || '-',
      rank: ranked.findIndex((candidate) => candidate.student.studentId === studentId) + 1,
      totalStudents: students.length,
      totalNet: getTotalNetForStudent(target),
    },
    summary: {
      classAverageTotalNet: Math.round(classAverageTotalNet * 100) / 100,
      strongestCourse: strongestCourse?.courseName ?? null,
      needsAttentionCourse: needsAttentionCourse?.courseName ?? null,
    },
    courses: target.courses.map((course) => {
      const stats = record.summary.courses.find((item) => item.name === course.courseName);
      return {
        name: course.courseName,
        correct: course.correct,
        wrong: course.wrong,
        empty: course.empty,
        net: course.net,
        score: course.score,
        classAverageNet: stats?.avgNet ?? 0,
        maxNet: stats?.maxNet ?? 0,
      };
    }),
  };
}
