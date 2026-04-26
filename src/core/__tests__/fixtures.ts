import type { FormSettings } from '@/types/domain';

export const defaultSettings: FormSettings = {
  nameColumn: { start: 1, length: 25 },
  studentIdColumn: { start: 26, length: 11 },
  bookletColumn: { start: 42, length: 1 },
  answersStart: 43,
  extras: [],
  courses: [{ name: 'AIIT', questionCount: 20 }],
  wrongCriterion: 0,
};

function pad(value: string, length: number): string {
  if (value.length >= length) return value.slice(0, length);
  return value + ' '.repeat(length - value.length);
}

export function buildRow(params: {
  name: string;
  studentId: string;
  booklet: string;
  answers: string;
}): string {
  const { name, studentId, booklet, answers } = params;
  return pad(name, 25) + pad(studentId, 11) + '     ' + pad(booklet, 1) + answers;
}

export function buildKey(booklet: string, answers: string): string {
  return pad('', 25) + pad('00000000000', 11) + '     ' + pad(booklet, 1) + answers;
}

export function buildSplitAnswerArea(
  leftBlock: string,
  rightBlock: string,
  gap = 38,
): string {
  return leftBlock + ' '.repeat(gap) + rightBlock;
}

export const sampleFileBasic = [
  buildKey('A', 'ABCDABCDABCDABCDABCD'),
  buildKey('B', 'DCBADCBADCBADCBADCBA'),
  buildRow({ name: 'MEHMET YENI', studentId: '25860121540', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
  buildRow({ name: 'CEM BURAK AY', studentId: '25860121021', booklet: 'B', answers: 'DCBADCBADCBADCBADCBA' }),
  buildRow({ name: 'ARIF FURKAN', studentId: '*4860121008', booklet: 'A', answers: 'ABCDABCDABCDABCDXXXX' }),
  buildRow({ name: 'ABDULLAH POLAT', studentId: '25860121033', booklet: 'A', answers: 'ABCDABCDABCDXXXXXXXX' }),
  buildRow({ name: 'YUSUF BERKAY', studentId: '25860121003', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
  buildRow({ name: 'ALI BILIK', studentId: '24860121054', booklet: 'B', answers: 'DCBADCBADCBADCBADCBA' }),
].join('\r\n');

export const singleCourseOnlyA = [
  buildKey('A', 'ABCDABCDABCDABCDABCD'),
  buildRow({ name: 'AHMET DEMIR', studentId: '12345678901', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
  buildRow({ name: 'AYSE KAYA', studentId: '12345678902', booklet: 'A', answers: 'ABCDABCDABCDABCDXXXX' }),
].join('\n');
