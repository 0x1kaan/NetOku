import type { CourseConfig, ExtraFieldSpec, FormSettings } from '@/types/domain';

interface DigitRun {
  start: number;
  length: number;
  text: string;
}

interface Segment {
  start: number;
  text: string;
}

interface AnswerLayout {
  bookletStart: number;
  blocks: Segment[];
}

export interface InferredSettingsResult {
  settings: FormSettings;
  confidence: number;
  applied: boolean;
}

const DEFAULT_STUDENT_ID_LENGTH = 11;
const LONG_GAP_PATTERN = /\s{8,}/g;
const ANSWER_CHAR_PATTERN = /[A-E*]/i;

function nonEmptyLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim().length > 0);
}

function findDigitRun(line: string): DigitRun | null {
  const match = line.match(/\d{8,}/);
  if (!match || match.index === undefined) return null;
  return {
    start: match.index + 1,
    length: match[0].length,
    text: match[0],
  };
}

function mode(values: number[]): number | null {
  if (values.length === 0) return null;

  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);

  return [...counts.entries()].sort((left, right) => {
    const countDiff = right[1] - left[1];
    return countDiff !== 0 ? countDiff : left[0] - right[0];
  })[0][0];
}

function isBlankKeyLike(line: string, digitRun: DigitRun | null): boolean {
  if (!digitRun) return true;
  const prefix = line.slice(0, digitRun.start - 1).trim();
  return prefix.length === 0 && /^[0\s]+$/.test(digitRun.text);
}

function splitByStructuralGaps(text: string, absoluteStart: number): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LONG_GAP_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const part = text.slice(cursor, matchIndex);
    const leading = part.search(/\S/);
    const trailing = part.replace(/\s+$/, '');

    if (leading !== -1 && /[A-E*]/i.test(trailing)) {
      segments.push({
        start: absoluteStart + cursor + leading,
        text: trailing.slice(leading).toUpperCase(),
      });
    }

    cursor = matchIndex + match[0].length;
  }

  const part = text.slice(cursor);
  const leading = part.search(/\S/);
  const trailing = part.replace(/\s+$/, '');
  if (leading !== -1 && /[A-E*]/i.test(trailing)) {
    segments.push({
      start: absoluteStart + cursor + leading,
      text: trailing.slice(leading).toUpperCase(),
    });
  }

  return segments;
}

function findAnswerLayout(line: string, minColumn: number): AnswerLayout | null {
  const searchStart = Math.max(0, minColumn - 1);
  const tail = line.slice(searchStart);
  const firstAnswerIndex = tail.search(ANSWER_CHAR_PATTERN);
  if (firstAnswerIndex === -1) return null;

  const absoluteStart = searchStart + firstAnswerIndex + 1;
  const answerTail = line.slice(absoluteStart - 1).replace(/\s+$/, '');
  const segments = splitByStructuralGaps(answerTail, absoluteStart);
  if (segments.length === 0) return null;

  const first = segments[0];
  if (first.text.length === 1 && segments[1]?.text.length >= 2) {
    return {
      bookletStart: first.start,
      blocks: segments.slice(1),
    };
  }

  if (first.text.length >= 2) {
    const answerText = first.text.slice(1);
    const answerLeading = answerText.search(ANSWER_CHAR_PATTERN);
    if (answerLeading === -1) return null;

    return {
      bookletStart: first.start,
      blocks: [
        {
          start: first.start + 1 + answerLeading,
          text: answerText.slice(answerLeading),
        },
        ...segments.slice(1),
      ],
    };
  }

  return null;
}

function chooseLayouts(lines: string[], studentIdStart: number, studentIdLength: number): AnswerLayout[] {
  const keyLayouts: AnswerLayout[] = [];
  const studentLayouts: AnswerLayout[] = [];
  const minStudentAnswerColumn = studentIdStart + studentIdLength;

  for (const line of lines) {
    const digitRun = findDigitRun(line);
    const keyLike = isBlankKeyLike(line, digitRun);
    const minColumn = keyLike ? 1 : minStudentAnswerColumn;
    const layout = findAnswerLayout(line, minColumn);
    if (!layout) continue;

    if (keyLike) keyLayouts.push(layout);
    else studentLayouts.push(layout);
  }

  return keyLayouts.length > 0 ? keyLayouts : studentLayouts;
}

function consolidateBlocks(layouts: AnswerLayout[]): Segment[] {
  const blockCount = mode(layouts.map((layout) => layout.blocks.length)) ?? 0;
  const blocks: Segment[] = [];

  for (let index = 0; index < blockCount; index += 1) {
    const candidates = layouts
      .map((layout) => layout.blocks[index])
      .filter((block): block is Segment => Boolean(block));

    const start = mode(candidates.map((block) => block.start));
    const length = mode(candidates.map((block) => block.text.length));
    if (!start || !length) continue;

    blocks.push({
      start,
      text: 'A'.repeat(length),
    });
  }

  return blocks;
}

function inferStudentIdLength(digitRuns: DigitRun[]): number {
  if (digitRuns.some((run) => run.length >= DEFAULT_STUDENT_ID_LENGTH)) {
    return DEFAULT_STUDENT_ID_LENGTH;
  }

  return mode(digitRuns.map((run) => run.length)) ?? DEFAULT_STUDENT_ID_LENGTH;
}

function inferExtras(studentIdStart: number, studentIdLength: number, bookletStart: number): ExtraFieldSpec[] {
  const extraStart = studentIdStart + studentIdLength;
  const extraLength = bookletStart - extraStart;

  if (extraLength < 2) return [];

  if (extraLength >= 5) {
    return [
      { name: 'Program', start: extraStart, length: 2 },
      { name: 'Derslik', start: extraStart + 2, length: Math.min(3, extraLength - 2) },
    ];
  }

  return [{ name: 'Ek Alan', start: extraStart, length: extraLength }];
}

function buildCourses(blocks: Segment[]): CourseConfig[] {
  return blocks.map((block, index) => ({
    name: `Ders ${index + 1}`,
    questionCount: Math.max(1, block.text.length),
    ...(index > 0 ? { startOffset: block.start } : {}),
  }));
}

export function inferSettingsFromText(
  raw: string,
  base: FormSettings,
): InferredSettingsResult {
  const lines = nonEmptyLines(raw);
  const studentDigitRuns = lines
    .map((line) => ({ line, digitRun: findDigitRun(line) }))
    .filter(({ line, digitRun }) => digitRun && !isBlankKeyLike(line, digitRun))
    .map(({ digitRun }) => digitRun as DigitRun);

  const studentIdStart = mode(studentDigitRuns.map((run) => run.start));
  if (!studentIdStart) {
    return { settings: base, confidence: 0, applied: false };
  }

  const studentIdLength = inferStudentIdLength(studentDigitRuns);
  const layouts = chooseLayouts(lines, studentIdStart, studentIdLength);
  const bookletStart = mode(layouts.map((layout) => layout.bookletStart));
  const blocks = consolidateBlocks(layouts);
  const firstBlock = blocks[0];

  if (!bookletStart || !firstBlock) {
    return { settings: base, confidence: 0.25, applied: false };
  }

  const courses = buildCourses(blocks);
  const confidence = Math.min(
    0.95,
    0.35 + studentDigitRuns.length * 0.03 + layouts.length * 0.05 + blocks.length * 0.08,
  );

  return {
    settings: {
      ...base,
      nameColumn: { start: 1, length: Math.max(1, studentIdStart - 1) },
      studentIdColumn: { start: studentIdStart, length: studentIdLength },
      bookletColumn: { start: bookletStart, length: 1 },
      answersStart: firstBlock.start,
      extras: inferExtras(studentIdStart, studentIdLength, bookletStart),
      courses,
    },
    confidence,
    applied: true,
  };
}
