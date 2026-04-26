import type { FormSettings } from '@/types/domain';

export type PresetId =
  | 'tyt-temel-4-ders'
  | 'ayt-sayisal'
  | 'lgs-standart'
  | 'kpss-genel-yetenek'
  | 'tek-ders-50'
  | 'kurum-3-ders-20';

export type AnalysisStrategyId =
  | 'tyt'
  | 'ayt-sayisal'
  | 'lgs'
  | 'kpss'
  | 'single-subject'
  | 'institution-3x20'
  | 'custom';

export interface PresetCourseConfig {
  name: string;
  questionCount: number;
  maxQuestions?: number;
  pointsPerNet?: number;
  wrongCriterion?: 0 | 1 | 2 | 3 | 4;
  startOffset?: number;
}

export interface PresetConfig {
  id: PresetId;
  title: string;
  description: string;
  group: string;
  tags: string[];
  strategyId: AnalysisStrategyId;
  defaultSubjectCount: number;
  maxSubjects: number;
  maxQuestions: number;
  courses: PresetCourseConfig[];
  settings: FormSettings;
  form: {
    lockSubjectCount: boolean;
    allowQuestionEdit: boolean;
    allowPointEdit: boolean;
  };
}
