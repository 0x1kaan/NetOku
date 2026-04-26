import type { CourseConfig, FormSettings } from '@/types/domain';
import type { PresetConfig, PresetCourseConfig, PresetId } from './types';

const BASE_FORM_SETTINGS: Omit<FormSettings, 'courses' | 'wrongCriterion'> = {
  nameColumn: { start: 1, length: 25 },
  studentIdColumn: { start: 26, length: 11 },
  bookletColumn: { start: 42, length: 1 },
  answersStart: 43,
  extras: [
    { name: 'Program', start: 37, length: 2 },
    { name: 'Derslik', start: 39, length: 3 },
  ],
};

function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function pointsPerNet(questionCount: number): number {
  return roundTo(100 / questionCount, 4);
}

function toFormCourse(course: PresetCourseConfig): CourseConfig {
  return {
    name: course.name,
    questionCount: course.questionCount,
    points: course.pointsPerNet,
    startOffset: course.startOffset,
  };
}

function buildSettings(
  courses: PresetCourseConfig[],
  wrongCriterion: FormSettings['wrongCriterion'],
): FormSettings {
  return {
    ...cloneBaseSettings(),
    courses: courses.map(toFormCourse),
    wrongCriterion,
  };
}

function cloneBaseSettings(): Omit<FormSettings, 'courses' | 'wrongCriterion'> {
  return {
    nameColumn: { ...BASE_FORM_SETTINGS.nameColumn },
    studentIdColumn: { ...BASE_FORM_SETTINGS.studentIdColumn },
    bookletColumn: { ...BASE_FORM_SETTINGS.bookletColumn },
    answersStart: BASE_FORM_SETTINGS.answersStart,
    extras: BASE_FORM_SETTINGS.extras.map((extra) => ({ ...extra })),
  };
}

function withDefaults(
  courses: Array<Omit<PresetCourseConfig, 'maxQuestions' | 'pointsPerNet'>>,
  wrongCriterion: FormSettings['wrongCriterion'],
): PresetCourseConfig[] {
  return courses.map((course) => ({
    ...course,
    maxQuestions: course.questionCount,
    pointsPerNet: pointsPerNet(course.questionCount),
    wrongCriterion,
  }));
}

function questionTotal(courses: PresetCourseConfig[]): number {
  return courses.reduce((sum, course) => sum + course.questionCount, 0);
}

function buildPreset(
  preset: Omit<PresetConfig, 'defaultSubjectCount' | 'maxQuestions' | 'settings'> & {
    wrongCriterion: FormSettings['wrongCriterion'];
  },
): PresetConfig {
  return {
    id: preset.id,
    title: preset.title,
    description: preset.description,
    group: preset.group,
    tags: preset.tags,
    strategyId: preset.strategyId,
    defaultSubjectCount: preset.courses.length,
    maxSubjects: preset.maxSubjects,
    maxQuestions: questionTotal(preset.courses),
    courses: preset.courses,
    settings: buildSettings(preset.courses, preset.wrongCriterion),
    form: preset.form,
  };
}

export const PRESET_CONFIGS: PresetConfig[] = [
  buildPreset({
    id: 'tyt-temel-4-ders',
    title: 'TYT Temel 4 Ders',
    description: 'Turkce, Sosyal, Matematik ve Fen icin hizli TYT kurulumu.',
    group: 'TYT',
    tags: ['120 soru', '4 ders', '1/4 yanlis'],
    strategyId: 'tyt',
    maxSubjects: 4,
    wrongCriterion: 4,
    courses: withDefaults(
      [
        { name: 'Turkce', questionCount: 40 },
        { name: 'Sosyal Bilimler', questionCount: 20 },
        { name: 'Temel Matematik', questionCount: 40 },
        { name: 'Fen Bilimleri', questionCount: 20 },
      ],
      4,
    ),
    form: {
      lockSubjectCount: true,
      allowQuestionEdit: false,
      allowPointEdit: true,
    },
  }),
  buildPreset({
    id: 'ayt-sayisal',
    title: 'AYT Sayisal',
    description: 'Matematik, Fizik, Kimya ve Biyoloji icin sayisal AYT yapisi.',
    group: 'AYT',
    tags: ['80 soru', 'sayisal', '1/4 yanlis'],
    strategyId: 'ayt-sayisal',
    maxSubjects: 4,
    wrongCriterion: 4,
    courses: withDefaults(
      [
        { name: 'Matematik', questionCount: 40 },
        { name: 'Fizik', questionCount: 14 },
        { name: 'Kimya', questionCount: 13 },
        { name: 'Biyoloji', questionCount: 13 },
      ],
      4,
    ),
    form: {
      lockSubjectCount: true,
      allowQuestionEdit: false,
      allowPointEdit: true,
    },
  }),
  buildPreset({
    id: 'lgs-standart',
    title: 'LGS Standart',
    description: 'Turkce, Inkilap, Din, Ingilizce, Matematik ve Fen bloklari.',
    group: 'LGS',
    tags: ['90 soru', '6 ders', '1/3 yanlis'],
    strategyId: 'lgs',
    maxSubjects: 6,
    wrongCriterion: 3,
    courses: withDefaults(
      [
        { name: 'Turkce', questionCount: 20 },
        { name: 'T.C. Inkilap', questionCount: 10 },
        { name: 'Din Kulturu', questionCount: 10 },
        { name: 'Ingilizce', questionCount: 10 },
        { name: 'Matematik', questionCount: 20 },
        { name: 'Fen Bilimleri', questionCount: 20 },
      ],
      3,
    ),
    form: {
      lockSubjectCount: true,
      allowQuestionEdit: false,
      allowPointEdit: true,
    },
  }),
  buildPreset({
    id: 'kpss-genel-yetenek',
    title: 'KPSS Genel Yetenek',
    description: 'Genel Yetenek ve Genel Kultur icin 2 bloklu KPSS kurulumu.',
    group: 'KPSS',
    tags: ['120 soru', '2 blok', '1/4 yanlis'],
    strategyId: 'kpss',
    maxSubjects: 2,
    wrongCriterion: 4,
    courses: withDefaults(
      [
        { name: 'Genel Yetenek', questionCount: 60 },
        { name: 'Genel Kultur', questionCount: 60 },
      ],
      4,
    ),
    form: {
      lockSubjectCount: true,
      allowQuestionEdit: false,
      allowPointEdit: true,
    },
  }),
  buildPreset({
    id: 'tek-ders-50',
    title: 'Tek Ders 50 Soru',
    description: 'Quiz, vize veya tek brans analizleri icin 50 soruluk sablon.',
    group: 'Tek Ders',
    tags: ['50 soru', 'tek ders', 'kriter yok'],
    strategyId: 'single-subject',
    maxSubjects: 1,
    wrongCriterion: 0,
    courses: withDefaults([{ name: 'Ders 1', questionCount: 50 }], 0),
    form: {
      lockSubjectCount: true,
      allowQuestionEdit: true,
      allowPointEdit: true,
    },
  }),
  buildPreset({
    id: 'kurum-3-ders-20',
    title: 'Kurum 3 Ders x 20',
    description: 'Kurum ici ara sinavlar icin 3 ders ve 20 soru duzeni.',
    group: 'Kurum',
    tags: ['60 soru', '3 ders', 'kriter yok'],
    strategyId: 'institution-3x20',
    maxSubjects: 3,
    wrongCriterion: 0,
    courses: withDefaults(
      [
        { name: 'Ders 1', questionCount: 20 },
        { name: 'Ders 2', questionCount: 20 },
        { name: 'Ders 3', questionCount: 20 },
      ],
      0,
    ),
    form: {
      lockSubjectCount: true,
      allowQuestionEdit: true,
      allowPointEdit: true,
    },
  }),
];

export function isPresetId(value: string | null | undefined): value is PresetId {
  return PRESET_CONFIGS.some((preset) => preset.id === value);
}

export function getPresetConfig(value: string | null | undefined): PresetConfig | null {
  if (!value) return null;
  return PRESET_CONFIGS.find((preset) => preset.id === value) ?? null;
}

export function cloneFormSettings(settings: FormSettings): FormSettings {
  return {
    nameColumn: { ...settings.nameColumn },
    studentIdColumn: { ...settings.studentIdColumn },
    bookletColumn: { ...settings.bookletColumn },
    answersStart: settings.answersStart,
    extras: settings.extras.map((extra) => ({ ...extra })),
    courses: settings.courses.map((course) => ({ ...course })),
    wrongCriterion: settings.wrongCriterion,
  };
}

export function createFormSettingsFromPreset(preset: PresetConfig): FormSettings {
  return cloneFormSettings(preset.settings);
}

export function getPresetAnalyzePath(presetId: PresetId): string {
  return `/app/analyze?preset=${encodeURIComponent(presetId)}`;
}
