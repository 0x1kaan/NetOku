import type {
  AnalysisResult,
  AnswerEvaluation,
  AnswerKey,
  CourseConfig,
  CourseResult,
  CourseStats,
  FormSettings,
  StudentResult,
  StudentRow,
} from '@/types/domain';

const FREE_MARKER = '*';

function computeCourseOffsets(
  courses: CourseConfig[],
  answersStart: number,
): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (let i = 0; i < courses.length; i++) {
    const c = courses[i];
    if (typeof c.startOffset === 'number' && c.startOffset > 0) {
      offsets.push(c.startOffset - answersStart);
    } else if (i === 0) {
      offsets.push(0);
    } else {
      offsets.push(cursor);
    }
    cursor = offsets[i] + c.questionCount;
  }
  return offsets;
}

function gradeAnswer(
  studentAnswer: string,
  keyAnswer: string,
): AnswerEvaluation['verdict'] {
  const s = studentAnswer.trim().toUpperCase();
  const k = keyAnswer.trim().toUpperCase();
  if (k === FREE_MARKER) return 'free';
  if (s === '' || s === ' ') return 'empty';
  if (s === k) return 'correct';
  return 'wrong';
}

function evaluateCourse(
  student: StudentRow,
  key: AnswerKey,
  course: CourseConfig,
  offset: number,
  wrongCriterion: number,
): CourseResult {
  const studentSlice = student.answers.slice(offset, offset + course.questionCount);
  const keySlice = key.answers.slice(offset, offset + course.questionCount);

  const evaluations: AnswerEvaluation[] = [];
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  for (let i = 0; i < course.questionCount; i++) {
    const sa = studentSlice[i] ?? '';
    const ka = keySlice[i] ?? '';
    const verdict = gradeAnswer(sa, ka);
    evaluations.push({ index: i, studentAnswer: sa, keyAnswer: ka, verdict });
    if (verdict === 'correct' || verdict === 'free') correct += 1;
    else if (verdict === 'wrong') wrong += 1;
    else if (verdict === 'empty') empty += 1;
  }

  const net =
    wrongCriterion > 0
      ? correct - wrong / wrongCriterion
      : correct;

  const pointPerNet =
    typeof course.points === 'number' && course.points > 0
      ? course.points
      : 100 / course.questionCount;
  const score = net * pointPerNet;

  return {
    courseName: course.name,
    correct,
    wrong,
    empty,
    net: roundTo(net, 2),
    score: roundTo(score, 2),
    participated: correct + wrong > 0,
    answers: studentSlice,
    evaluations,
  };
}

function createEmptyCourseResult(
  student: StudentRow,
  course: CourseConfig,
  offset: number,
): CourseResult {
  const answers = student.answers.slice(offset, offset + course.questionCount);
  return {
    courseName: course.name,
    correct: 0,
    wrong: 0,
    empty: course.questionCount,
    net: 0,
    score: 0,
    participated: false,
    answers,
    evaluations: Array.from({ length: course.questionCount }, (_, index) => ({
      index,
      studentAnswer: answers[index] ?? '',
      keyAnswer: '',
      verdict: 'empty',
    })),
  };
}

function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function pickKey(
  keys: Map<string, AnswerKey>,
  booklet: string,
  fallbackAll: boolean,
): AnswerKey | null {
  if (fallbackAll) {
    const first = keys.values().next();
    return first.done ? null : first.value;
  }
  const direct = keys.get(booklet);
  if (direct) return direct;
  const fallback = keys.get('A');
  return fallback ?? null;
}

function computeCourseStats(
  students: StudentResult[],
  courses: CourseConfig[],
): CourseStats[] {
  return courses.map((course, idx) => {
    const rows = students
      .filter((s) => !s.excluded)
      .map((s) => s.courses[idx])
      .filter((c): c is CourseResult => Boolean(c));

    if (rows.length === 0) {
      return {
        courseName: course.name,
        questionCount: course.questionCount,
        maxNet: 0,
        avgNet: 0,
        maxScore: 0,
        avgScore: 0,
        maxCorrect: 0,
        avgCorrect: 0,
        maxWrong: 0,
        avgWrong: 0,
        maxEmpty: 0,
        avgEmpty: 0,
      };
    }

    const sum = (pick: (c: CourseResult) => number) =>
      rows.reduce((acc, r) => acc + pick(r), 0);
    const max = (pick: (c: CourseResult) => number) =>
      rows.reduce((acc, r) => Math.max(acc, pick(r)), 0);
    const avg = (pick: (c: CourseResult) => number) => roundTo(sum(pick) / rows.length, 2);

    return {
      courseName: course.name,
      questionCount: course.questionCount,
      maxNet: roundTo(max((c) => c.net), 2),
      avgNet: avg((c) => c.net),
      maxScore: roundTo(max((c) => c.score), 2),
      avgScore: avg((c) => c.score),
      maxCorrect: max((c) => c.correct),
      avgCorrect: avg((c) => c.correct),
      maxWrong: max((c) => c.wrong),
      avgWrong: avg((c) => c.wrong),
      maxEmpty: max((c) => c.empty),
      avgEmpty: avg((c) => c.empty),
    };
  });
}

export interface AnalyzeOptions {
  autoAssignBookletsToA?: boolean;
}

export function analyze(
  students: StudentRow[],
  answerKeys: AnswerKey[],
  settings: FormSettings,
  options: AnalyzeOptions = {},
): AnalysisResult {
  const keyMap = new Map<string, AnswerKey>();
  for (const k of answerKeys) {
    keyMap.set(k.booklet.toUpperCase(), {
      ...k,
      booklet: k.booklet.toUpperCase(),
      answers: k.answers.toUpperCase(),
    });
  }

  const offsets = computeCourseOffsets(settings.courses, settings.answersStart);

  const studentsMissingBooklet = students.filter((s) => !s.booklet).length;
  const singleBookletKey = answerKeys.length === 1;
  const shouldAutoAssign =
    options.autoAssignBookletsToA === true ||
    singleBookletKey ||
    studentsMissingBooklet > students.length / 2;

  const results: StudentResult[] = [];
  const excluded: StudentResult[] = [];

  for (const student of students) {
    const effectiveBooklet = student.booklet || (shouldAutoAssign ? 'A' : '');

    if (!effectiveBooklet) {
      const courses = settings.courses.map((course, idx) =>
        createEmptyCourseResult(student, course, offsets[idx]),
      );
      const excludedResult: StudentResult = {
        student,
        booklet: '',
        courses,
        excluded: true,
        exclusionReason: 'Kitapçık türü belirlenemedi',
      };
      excluded.push(excludedResult);
      continue;
    }

    const key = pickKey(keyMap, effectiveBooklet, shouldAutoAssign && singleBookletKey);
    if (!key) {
      const courses = settings.courses.map((course, idx) =>
        createEmptyCourseResult(student, course, offsets[idx]),
      );
      const excludedResult: StudentResult = {
        student,
        booklet: effectiveBooklet,
        courses,
        excluded: true,
        exclusionReason: `Kitapçık "${effectiveBooklet}" için cevap anahtarı bulunamadı`,
      };
      excluded.push(excludedResult);
      continue;
    }

    const courseResults = settings.courses.map((course, idx) =>
      evaluateCourse(student, key, course, offsets[idx], settings.wrongCriterion),
    );

    results.push({
      student,
      booklet: effectiveBooklet,
      courses: courseResults,
      excluded: false,
    });
  }

  const allResults = [...results, ...excluded];
  const courseStats = computeCourseStats(allResults, settings.courses);

  const invalidStudentIds = students.filter(
    (s) =>
      s.studentId.length === 0 ||
      s.studentId.length !== settings.studentIdColumn.length ||
      /[\s*]/.test(s.studentId),
  ).length;

  return {
    students: results,
    excluded,
    courseStats,
    answerKeys: Array.from(keyMap.values()).sort((left, right) =>
      left.booklet.localeCompare(right.booklet, 'tr'),
    ),
    meta: {
      totalStudents: students.length,
      evaluatedStudents: results.length,
      excludedStudents: excluded.length,
      invalidStudentIds,
      bookletsAutoAssigned: shouldAutoAssign,
    },
  };
}
