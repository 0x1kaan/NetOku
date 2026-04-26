import { analyze } from '@/core/analyzer';
import type {
  AnalysisResult,
  CourseConfig,
  CourseResult,
  CourseStats,
  FormSettings,
  StudentResult,
} from '@/types/domain';
import type { AnalysisStrategyId, PresetConfig, PresetCourseConfig } from '../types';
import type { AnalysisStrategyInput, IAnalysisStrategy } from './IAnalysisStrategy';

function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function fallbackCourseConfig(course: CourseConfig): PresetCourseConfig {
  return {
    name: course.name,
    questionCount: course.questionCount,
    pointsPerNet: course.points,
    startOffset: course.startOffset,
  };
}

function mergePresetCourseConfig(
  presetCourse: PresetCourseConfig | undefined,
  settingsCourse: CourseConfig,
): PresetCourseConfig {
  const base = presetCourse ?? fallbackCourseConfig(settingsCourse);
  return {
    ...base,
    name: settingsCourse.name,
    questionCount: settingsCourse.questionCount,
    pointsPerNet:
      typeof settingsCourse.points === 'number'
        ? settingsCourse.points
        : base.pointsPerNet,
    startOffset: settingsCourse.startOffset ?? base.startOffset,
  };
}

function recomputeCourseStats(
  students: StudentResult[],
  courses: CourseConfig[],
): CourseStats[] {
  return courses.map((course, idx) => {
    const rows = students
      .filter((student) => !student.excluded)
      .map((student) => student.courses[idx])
      .filter((row): row is CourseResult => Boolean(row));

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

    const sum = (pick: (courseResult: CourseResult) => number) =>
      rows.reduce((acc, row) => acc + pick(row), 0);
    const max = (pick: (courseResult: CourseResult) => number) =>
      rows.reduce((acc, row) => Math.max(acc, pick(row)), 0);
    const avg = (pick: (courseResult: CourseResult) => number) =>
      roundTo(sum(pick) / rows.length, 2);

    return {
      courseName: course.name,
      questionCount: course.questionCount,
      maxNet: roundTo(max((row) => row.net), 2),
      avgNet: avg((row) => row.net),
      maxScore: roundTo(max((row) => row.score), 2),
      avgScore: avg((row) => row.score),
      maxCorrect: max((row) => row.correct),
      avgCorrect: avg((row) => row.correct),
      maxWrong: max((row) => row.wrong),
      avgWrong: avg((row) => row.wrong),
      maxEmpty: max((row) => row.empty),
      avgEmpty: avg((row) => row.empty),
    };
  });
}

export class ConfigDrivenAnalysisStrategy implements IAnalysisStrategy {
  id: AnalysisStrategyId;

  constructor(id: AnalysisStrategyId = 'custom') {
    this.id = id;
  }

  calculateScore(course: CourseResult, courseConfig: PresetCourseConfig): number {
    const pointsPerNet =
      typeof courseConfig.pointsPerNet === 'number'
        ? courseConfig.pointsPerNet
        : 100 / courseConfig.questionCount;
    return roundTo(course.net * pointsPerNet, 2);
  }

  analyze(input: AnalysisStrategyInput): AnalysisResult {
    const result = analyze(
      input.students,
      input.answerKeys,
      input.settings,
      input.options ?? {},
    );

    if (!input.preset) {
      return this.generateReport(result);
    }

    const preset = input.preset;
    const students = result.students.map((student) =>
      this.applyPresetToStudent(student, input.settings, preset),
    );
    const excluded = result.excluded.map((student) =>
      this.applyPresetToStudent(student, input.settings, preset),
    );
    const allStudents = [...students, ...excluded];

    return this.generateReport(
      {
        ...result,
        students,
        excluded,
        courseStats: recomputeCourseStats(allStudents, input.settings.courses),
      },
      preset,
    );
  }

  generateReport(result: AnalysisResult, preset?: PresetConfig): AnalysisResult {
    void preset;
    return result;
  }

  private applyPresetToStudent(
    student: StudentResult,
    settings: FormSettings,
    preset: PresetConfig,
  ): StudentResult {
    return {
      ...student,
      courses: student.courses.map((course, index) => {
        const presetCourse = mergePresetCourseConfig(
          preset.courses[index],
          settings.courses[index],
        );
        return this.applyPresetToCourse(course, presetCourse);
      }),
    };
  }

  private applyPresetToCourse(
    course: CourseResult,
    presetCourse: PresetCourseConfig,
  ): CourseResult {
    const criterion = presetCourse.wrongCriterion;
    const net =
      typeof criterion === 'number'
        ? criterion > 0
          ? course.correct - course.wrong / criterion
          : course.correct
        : course.net;
    const normalizedCourse = {
      ...course,
      net: roundTo(net, 2),
    };

    return {
      ...normalizedCourse,
      score: this.calculateScore(normalizedCourse, presetCourse),
    };
  }
}
