import type { AnswerKey, FormSettings } from '@/types/domain';
import { parseFile } from './parser';

const FALLBACK_BOOKLETS = ['A', 'B', 'C', 'D', 'E'];
const ANSWER_TAIL_PATTERN = /([A-E*][A-E* ]{4,})$/;

export function normalizeAnswerKeys(keys: AnswerKey[]): AnswerKey[] {
  return keys
    .map((key) => ({
      booklet: key.booklet.trim().toUpperCase().slice(0, 1) || 'A',
      answers: key.answers.replace(/\r?\n/g, '').replace(/\s+$/, '').toUpperCase(),
    }))
    .filter((key) => key.answers.length > 0);
}

export function mergeAnswerKeys(fileKeys: AnswerKey[], manualKeys: AnswerKey[]): AnswerKey[] {
  const byBooklet = new Map<string, AnswerKey>();

  for (const key of normalizeAnswerKeys(fileKeys)) {
    byBooklet.set(key.booklet, key);
  }

  for (const key of normalizeAnswerKeys(manualKeys)) {
    byBooklet.set(key.booklet, key);
  }

  return Array.from(byBooklet.values()).sort((left, right) =>
    left.booklet.localeCompare(right.booklet, 'tr'),
  );
}

export function getRequiredAnswerLength(settings: FormSettings): number {
  const ranges = getCourseAnswerRanges(settings);
  return ranges.reduce((max, range) => Math.max(max, range.start + range.length), 0);
}

export function getCourseAnswerRanges(settings: FormSettings): Array<{
  courseName: string;
  start: number;
  length: number;
}> {
  let cursor = 0;

  return settings.courses.map((course, index) => {
    const offset =
      typeof course.startOffset === 'number' && course.startOffset > 0
        ? course.startOffset - settings.answersStart
        : index === 0
          ? 0
          : cursor;
    const safeOffset = Math.max(0, offset);
    const end = safeOffset + course.questionCount;
    cursor = end;

    return {
      courseName: course.name,
      start: safeOffset,
      length: course.questionCount,
    };
  });
}

function extractAnswerTail(line: string): string | null {
  const upper = line.replace(/\s+$/, '').toUpperCase();
  const match = upper.match(ANSWER_TAIL_PATTERN);
  return match?.[1] ?? null;
}

function extractFallbackAnswerKeys(raw: string, settings: FormSettings): AnswerKey[] {
  const requiredLength = getRequiredAnswerLength(settings);

  return raw
    .split(/\r?\n/)
    .map((line) => extractAnswerTail(line))
    .filter((tail): tail is string => Boolean(tail))
    .map((tail, index) => {
      if (tail.length >= requiredLength + 1) {
        return {
          booklet: tail[0],
          answers: tail.slice(1),
        } satisfies AnswerKey;
      }

      if (tail.length >= requiredLength) {
        return {
          booklet: FALLBACK_BOOKLETS[index] ?? 'A',
          answers: tail,
        } satisfies AnswerKey;
      }

      return null;
    })
    .filter((key): key is AnswerKey => Boolean(key));
}

export function extractAnswerKeysFromKeyFile(raw: string, settings: FormSettings): AnswerKey[] {
  const parsedKeys = normalizeAnswerKeys(parseFile(raw, settings).answerKeys);
  const fallbackKeys = normalizeAnswerKeys(extractFallbackAnswerKeys(raw, settings));

  if (parsedKeys.length === 0) return fallbackKeys;
  if (fallbackKeys.length === 0) return parsedKeys;

  const requiredLength = getRequiredAnswerLength(settings);
  const parsedLooksHealthy = parsedKeys.some((key) => key.answers.length >= requiredLength);
  const fallbackLooksHealthier = fallbackKeys.some((key) => key.answers.length >= requiredLength);

  if (!parsedLooksHealthy && fallbackLooksHealthier) {
    return fallbackKeys;
  }

  return mergeAnswerKeys(parsedKeys, fallbackKeys);
}
