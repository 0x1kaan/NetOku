import type { AnalyzeOptions } from '@/core/analyzer';
import type {
  AnalysisResult,
  AnswerKey,
  CourseResult,
  FormSettings,
  StudentRow,
} from '@/types/domain';
import type { AnalysisStrategyId, PresetConfig, PresetCourseConfig } from '../types';

export interface AnalysisStrategyInput {
  students: StudentRow[];
  answerKeys: AnswerKey[];
  settings: FormSettings;
  preset?: PresetConfig;
  options?: AnalyzeOptions;
}

export interface IAnalysisStrategy {
  id: AnalysisStrategyId;
  calculateScore(course: CourseResult, courseConfig: PresetCourseConfig): number;
  analyze(input: AnalysisStrategyInput): AnalysisResult;
  generateReport(result: AnalysisResult, preset?: PresetConfig): AnalysisResult;
}
