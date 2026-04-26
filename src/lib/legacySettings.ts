import type { CourseConfig, ExtraFieldSpec, FormSettings } from '@/types/domain';

type JsonRecord = Record<string, unknown>;

const LEGACY_KEYS = {
  nameStart: ['Ad-Soyad'],
  nameLength: ['Ad-Soyad_LEN'],
  studentIdStart: ['Öğr. No', 'Ogr. No', 'Ã–ÄŸr. No'],
  studentIdLength: ['Öğr. No_LEN', 'Ogr. No_LEN', 'Ã–ÄŸr. No_LEN'],
  bookletStart: ['Kitapçık', 'Kitapcik', 'KitapÃ§Ä±k'],
  answersStart: ['Cevaplar'],
  extras: ['Ek Alanlar'],
  wrongCriterion: ['Yanlış Kriteri', 'Yanlis Kriteri', 'YanlÄ±ÅŸ Kriteri'],
  courseCount: ['Ders Sayisi', 'Ders Sayısı'],
  courseDetails: ['Ders Detaylari', 'Ders Detayları'],
} as const;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function pickValue(record: JsonRecord, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    if (alias in record) return record[alias];
  }
  return undefined;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  }

  return null;
}

function parseNonNegativeInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  }

  return null;
}

function parseOptionalFloat(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildExtras(rawExtras: unknown, fallback: ExtraFieldSpec[]): ExtraFieldSpec[] {
  if (!Array.isArray(rawExtras)) return fallback;

  return rawExtras
    .map((item) => asRecord(item))
    .filter((item): item is JsonRecord => Boolean(item))
    .map((item) => {
      const name = parseString(item.ad) ?? parseString(item.name);
      const start = parsePositiveInt(item.bas) ?? parsePositiveInt(item.start);
      const length = parsePositiveInt(item.len) ?? parsePositiveInt(item.length);

      if (!name || !start || !length) return null;
      return { name, start, length };
    })
    .filter((item): item is ExtraFieldSpec => Boolean(item));
}

function buildCourses(raw: JsonRecord, fallback: CourseConfig[]): CourseConfig[] {
  const requestedCount =
    parsePositiveInt(pickValue(raw, LEGACY_KEYS.courseCount)) ?? fallback.length;
  const rawDetails = pickValue(raw, LEGACY_KEYS.courseDetails);

  if (!Array.isArray(rawDetails)) {
    return fallback;
  }

  return Array.from({ length: requestedCount }, (_, index) => {
    const fallbackCourse = fallback[index] ?? {
      name: `Ders ${index + 1}`,
      questionCount: 20,
    };
    const item = asRecord(rawDetails[index]) ?? {};

    const name = parseString(item.ad) ?? fallbackCourse.name;
    const questionCount = parsePositiveInt(item.adet) ?? fallbackCourse.questionCount;
    const points = parseOptionalFloat(item.puan) ?? fallbackCourse.points ?? null;
    const startOffset =
      parsePositiveInt(item.bas) ?? fallbackCourse.startOffset ?? null;

    return {
      name,
      questionCount,
      ...(points !== null ? { points } : {}),
      ...(startOffset !== null ? { startOffset } : {}),
    } satisfies CourseConfig;
  });
}

export function applyLegacySettingsJson(
  rawText: string,
  base: FormSettings,
): FormSettings {
  const parsed = JSON.parse(rawText) as unknown;
  const record = asRecord(parsed);

  if (!record) {
    throw new Error('Ayar dosyasi gecerli bir JSON nesnesi degil.');
  }

  const nameStart = parsePositiveInt(pickValue(record, LEGACY_KEYS.nameStart));
  const nameLength = parsePositiveInt(pickValue(record, LEGACY_KEYS.nameLength));
  const studentIdStart = parsePositiveInt(pickValue(record, LEGACY_KEYS.studentIdStart));
  const studentIdLength = parsePositiveInt(pickValue(record, LEGACY_KEYS.studentIdLength));
  const bookletStart = parsePositiveInt(pickValue(record, LEGACY_KEYS.bookletStart));
  const answersStart = parsePositiveInt(pickValue(record, LEGACY_KEYS.answersStart));
  const wrongCriterion =
    parseNonNegativeInt(pickValue(record, LEGACY_KEYS.wrongCriterion)) ?? base.wrongCriterion;

  const normalizedWrongCriterion =
    wrongCriterion === 0 ||
    wrongCriterion === 1 ||
    wrongCriterion === 2 ||
    wrongCriterion === 3 ||
    wrongCriterion === 4
      ? wrongCriterion
      : base.wrongCriterion;

  return {
    nameColumn: {
      start: nameStart ?? base.nameColumn.start,
      length: nameLength ?? base.nameColumn.length,
    },
    studentIdColumn: {
      start: studentIdStart ?? base.studentIdColumn.start,
      length: studentIdLength ?? base.studentIdColumn.length,
    },
    bookletColumn: {
      start: bookletStart ?? base.bookletColumn.start,
      length: base.bookletColumn.length,
    },
    answersStart: answersStart ?? base.answersStart,
    extras: buildExtras(pickValue(record, LEGACY_KEYS.extras), base.extras),
    courses: buildCourses(record, base.courses),
    wrongCriterion: normalizedWrongCriterion,
  };
}
