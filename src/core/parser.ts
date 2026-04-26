import type {
  AnswerKey,
  FormSettings,
  ParseIssue,
  ParseResult,
  StudentRow,
} from '@/types/domain';

const BLANK_STUDENT_ID_CHARS = /^[\s0]*$/;
const INVALID_STUDENT_ID_CHARS = /[\s*]/;

function slice(line: string, start: number, length: number): string {
  if (start < 1 || length < 1) return '';
  const from = start - 1;
  return line.slice(from, from + length);
}

function isAnswerKeyRow(studentId: string, name: string): boolean {
  const hasBlankName = name.trim().length === 0;
  const hasBlankStudentId = studentId.length === 0 || BLANK_STUDENT_ID_CHARS.test(studentId);
  return hasBlankStudentId || (hasBlankName && hasBlankStudentId);
}

function getInvalidStudentIdReason(studentId: string, expectedLength: number): string | null {
  if (studentId.length === 0) return 'boş';
  if (INVALID_STUDENT_ID_CHARS.test(studentId)) return 'boşluk veya * içeriyor';
  if (studentId.length !== expectedLength) return `${expectedLength} hane olmalı`;
  return null;
}

function normalizeBooklet(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (trimmed.length === 0) return '';
  return trimmed[0];
}

export function deriveStudentIssues(
  students: StudentRow[],
  settings: FormSettings,
): ParseIssue[] {
  const issues: ParseIssue[] = [];
  const counts = new Map<string, number>();
  const seen = new Set<string>();

  students.forEach((student) => {
    if (student.studentId) {
      counts.set(student.studentId, (counts.get(student.studentId) ?? 0) + 1);
    }
  });

  students.forEach((student) => {
    const invalidReason = getInvalidStudentIdReason(
      student.studentId,
      settings.studentIdColumn.length,
    );

    if (invalidReason) {
      issues.push({
        type: 'invalid_student_id',
        lineNumber: student.lineNumber,
        studentId: student.studentId,
        name: student.name,
        message: `Geçersiz öğrenci numarası: "${student.studentId}" (${invalidReason})`,
      });
    } else if ((counts.get(student.studentId) ?? 0) > 1 && seen.has(student.studentId)) {
      issues.push({
        type: 'duplicate_student_id',
        lineNumber: student.lineNumber,
        studentId: student.studentId,
        name: student.name,
        message: `Tekrarlanan öğrenci numarası: ${student.studentId}`,
      });
    }

    seen.add(student.studentId);

    if (student.booklet.length === 0) {
      issues.push({
        type: 'missing_booklet',
        lineNumber: student.lineNumber,
        studentId: student.studentId,
        name: student.name,
        message: 'Kitapçık türü işaretlenmemiş',
      });
    }
  });

  return issues;
}

export function parseFile(
  raw: string,
  settings: FormSettings,
): ParseResult {
  const lines = raw.split(/\r?\n/);
  const students: StudentRow[] = [];
  const answerKeys: AnswerKey[] = [];
  const issues: ParseIssue[] = [];

  const minLength = Math.max(
    settings.nameColumn.start + settings.nameColumn.length - 1,
    settings.studentIdColumn.start + settings.studentIdColumn.length - 1,
    settings.bookletColumn.start + settings.bookletColumn.length - 1,
    settings.answersStart,
  );

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    if (line.trim().length === 0) return;

    if (line.length < minLength - 5) {
      issues.push({
        type: 'short_line',
        lineNumber,
        message: `Satır çok kısa (${line.length} karakter, en az ~${minLength} bekleniyor)`,
      });
      return;
    }

    const nameRaw = slice(line, settings.nameColumn.start, settings.nameColumn.length);
    const studentIdRaw = slice(
      line,
      settings.studentIdColumn.start,
      settings.studentIdColumn.length,
    );
    const bookletRaw = slice(
      line,
      settings.bookletColumn.start,
      settings.bookletColumn.length,
    );
    const answers = line.slice(settings.answersStart - 1).replace(/\s+$/, '');

    const name = nameRaw.trimEnd();
    const studentId = studentIdRaw.trim();
    const booklet = normalizeBooklet(bookletRaw);

    if (answers.length === 0) {
      issues.push({
        type: 'empty_answers',
        lineNumber,
        studentId,
        name,
        message: 'Cevap alanı boş',
      });
      return;
    }

    if (isAnswerKeyRow(studentId, name)) {
      answerKeys.push({
        booklet: booklet || 'A',
        answers,
      });
      return;
    }

    const extras: Record<string, string> = {};
    for (const extra of settings.extras) {
      extras[extra.name] = slice(line, extra.start, extra.length).trim();
    }

    students.push({
      lineNumber,
      name,
      studentId,
      booklet,
      answers,
      extras,
      rawLine: line,
    });
  });

  return {
    students,
    answerKeys,
    issues: [...issues, ...deriveStudentIssues(students, settings)],
  };
}
