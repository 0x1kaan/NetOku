export interface ColumnSpec {
  start: number;
  length: number;
}

export interface ExtraFieldSpec {
  name: string;
  start: number;
  length: number;
}

export interface CourseConfig {
  name: string;
  questionCount: number;
  points?: number;
  startOffset?: number;
}

export interface FormSettings {
  nameColumn: ColumnSpec;
  studentIdColumn: ColumnSpec;
  bookletColumn: ColumnSpec;
  answersStart: number;
  extras: ExtraFieldSpec[];
  courses: CourseConfig[];
  wrongCriterion: 0 | 1 | 2 | 3 | 4;
}

export interface StudentRow {
  lineNumber: number;
  name: string;
  studentId: string;
  booklet: string;
  answers: string;
  extras: Record<string, string>;
  rawLine: string;
}

export interface AnswerKey {
  booklet: string;
  answers: string;
}

export interface ParseResult {
  students: StudentRow[];
  answerKeys: AnswerKey[];
  issues: ParseIssue[];
}

export type ParseIssueType =
  | 'missing_booklet'
  | 'invalid_student_id'
  | 'duplicate_student_id'
  | 'short_line'
  | 'empty_answers';

export interface ParseIssue {
  type: ParseIssueType;
  lineNumber: number;
  studentId?: string;
  name?: string;
  message: string;
}

export type AnswerVerdict = 'correct' | 'wrong' | 'empty' | 'free';

export interface AnswerEvaluation {
  index: number;
  studentAnswer: string;
  keyAnswer: string;
  verdict: AnswerVerdict;
}

export interface CourseResult {
  courseName: string;
  correct: number;
  wrong: number;
  empty: number;
  net: number;
  score: number;
  participated: boolean;
  answers: string;
  evaluations: AnswerEvaluation[];
}

export interface StudentResult {
  student: StudentRow;
  booklet: string;
  courses: CourseResult[];
  excluded: boolean;
  exclusionReason?: string;
}

export interface AnalysisResult {
  students: StudentResult[];
  excluded: StudentResult[];
  courseStats: CourseStats[];
  answerKeys?: AnswerKey[];
  meta: {
    totalStudents: number;
    evaluatedStudents: number;
    excludedStudents: number;
    invalidStudentIds: number;
    bookletsAutoAssigned: boolean;
  };
}

export interface CourseStats {
  courseName: string;
  questionCount: number;
  maxNet: number;
  avgNet: number;
  maxScore: number;
  avgScore: number;
  maxCorrect: number;
  avgCorrect: number;
  maxWrong: number;
  avgWrong: number;
  maxEmpty: number;
  avgEmpty: number;
}
