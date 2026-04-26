import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { analyze } from '../analyzer';
import { buildObsWorkbook, buildWorkbook } from '../excel';
import { parseFile } from '../parser';
import { buildKey, buildRow, defaultSettings } from './fixtures';
import type { AnalysisResult, FormSettings } from '@/types/domain';

async function openWorkbook(blob: Blob): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await blob.arrayBuffer();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function sheetHasValue(sheet: ExcelJS.Worksheet, expected: string): boolean {
  for (let rowIndex = 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    for (let cellIndex = 1; cellIndex <= row.cellCount; cellIndex += 1) {
      const value = row.getCell(cellIndex).value;
      if (value === expected) return true;
    }
  }

  return false;
}

describe('buildWorkbook', () => {
  it('writes answer keys above each course sheet header and keeps an excluded worksheet', async () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildKey('B', 'DCBADCBADCBADCBADCBA'),
      buildRow({ name: 'HAS_A', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
      buildRow({ name: 'NO_BOOK', studentId: '10000000002', booklet: ' ', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');

    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    const workbook = await openWorkbook(await buildWorkbook(result, defaultSettings));

    const courseSheet = workbook.getWorksheet(defaultSettings.courses[0].name);
    expect(courseSheet).toBeDefined();
    expect(courseSheet?.getCell('A1').value).toBe('CEVAP ANAHTARI (A)');
    expect(courseSheet?.getCell('A2').value).toBe('CEVAP ANAHTARI (B)');
    expect(courseSheet?.getCell('I1').value).toBe('ABCDABCDABCDABCDABCD');
    expect(courseSheet?.getCell('I2').value).toBe('DCBADCBADCBADCBADCBA');

    const excludedSheet = workbook.worksheets.find((sheet) => sheet.name.startsWith('De'));
    expect(excludedSheet).toBeDefined();
    expect(excludedSheet?.getCell('A1').value).toBe('SİSTEMDEKİ CEVAP ANAHTARLARI');
    expect(excludedSheet ? sheetHasValue(excludedSheet, 'NO_BOOK') : false).toBe(true);
    expect(
      excludedSheet ? sheetHasValue(excludedSheet, result.excluded[0].student.rawLine) : false,
    ).toBe(true);
  });

  it('creates the excluded worksheet even when there are no excluded students', async () => {
    const raw = [
      buildKey('A', 'ABCDABCDABCDABCDABCD'),
      buildRow({ name: 'HAS_A', studentId: '10000000001', booklet: 'A', answers: 'ABCDABCDABCDABCDABCD' }),
    ].join('\n');

    const parsed = parseFile(raw, defaultSettings);
    const result = analyze(parsed.students, parsed.answerKeys, defaultSettings);
    const workbook = await openWorkbook(await buildWorkbook(result, defaultSettings));

    const excludedSheet = workbook.worksheets.find((sheet) => sheet.name.startsWith('De'));
    expect(excludedSheet).toBeDefined();
    expect(excludedSheet ? sheetHasValue(excludedSheet, 'Kayıt yok.') : false).toBe(true);
  });
});

describe('buildObsWorkbook', () => {
  it('applies OBS column order, visibility, and metric config', async () => {
    const settings: FormSettings = {
      ...defaultSettings,
      courses: [
        { name: 'MAT', questionCount: 1 },
        { name: 'TUR', questionCount: 1 },
      ],
    };
    const result: AnalysisResult = {
      students: [
        {
          student: {
            lineNumber: 1,
            name: 'Ali',
            studentId: '10000000001',
            booklet: 'A',
            answers: '',
            extras: {},
            rawLine: '',
          },
          booklet: 'A',
          excluded: false,
          courses: [
            {
              courseName: 'MAT',
              correct: 0,
              wrong: 0,
              empty: 0,
              net: 4.25,
              score: 85,
              participated: true,
              answers: '',
              evaluations: [],
            },
            {
              courseName: 'TUR',
              correct: 0,
              wrong: 0,
              empty: 0,
              net: 7.5,
              score: 75,
              participated: true,
              answers: '',
              evaluations: [],
            },
          ],
        },
      ],
      excluded: [],
      courseStats: [
        {
          courseName: 'MAT',
          questionCount: 1,
          maxNet: 4.25,
          avgNet: 4.25,
          maxScore: 85,
          avgScore: 85,
          maxCorrect: 0,
          avgCorrect: 0,
          maxWrong: 0,
          avgWrong: 0,
          maxEmpty: 0,
          avgEmpty: 0,
        },
        {
          courseName: 'TUR',
          questionCount: 1,
          maxNet: 7.5,
          avgNet: 7.5,
          maxScore: 75,
          avgScore: 75,
          maxCorrect: 0,
          avgCorrect: 0,
          maxWrong: 0,
          avgWrong: 0,
          maxEmpty: 0,
          avgEmpty: 0,
        },
      ],
      meta: {
        totalStudents: 1,
        evaluatedStudents: 1,
        excludedStudents: 0,
        invalidStudentIds: 0,
        bookletsAutoAssigned: false,
      },
    };

    const workbook = await openWorkbook(
      await buildObsWorkbook(result, settings, {}, [
        { courseId: 'TUR', visible: true, metric: 'net' },
        { courseId: 'MAT', visible: false, metric: 'score' },
      ]),
    );
    const sheet = workbook.getWorksheet('OBS Not Aktarma');

    expect(sheet?.getCell('C1').value).toBe('TUR NET');
    expect(sheet?.getCell('D1').value).toBeNull();
    expect(sheet?.getCell('C2').value).toBe(7.5);
    expect(sheet?.getCell('C4').value).toBe(7.5);
  });
});
