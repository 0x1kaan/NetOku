import ExcelJS from 'exceljs';
import type {
  AnalysisResult,
  AnswerEvaluation,
  AnswerKey,
  CourseResult,
  FormSettings,
  StudentResult,
} from '@/types/domain';
import { mergeOBSConfig, type OBSColumnConfig } from '@/lib/obs-config';

function roundTo(n: number, decimals: number): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

const COLORS = {
  correct: 'FF16A34A',
  wrong: 'FFDC2626',
  empty: 'FF6B7280',
  free: 'FFCA8A04',
  keyHeader: 'FFFEF3C7',
  studentIdError: 'FFFCA5A5',
  headerFill: 'FFEFF6FF',
  footerFill: 'FFF3F4F6',
  sectionFill: 'FFE0F2FE',
} as const;

function verdictColor(v: AnswerEvaluation['verdict']): string {
  switch (v) {
    case 'correct':
      return COLORS.correct;
    case 'wrong':
      return COLORS.wrong;
    case 'empty':
      return COLORS.empty;
    case 'free':
      return COLORS.free;
  }
}

function verdictChar(v: AnswerEvaluation['verdict'], studentAnswer: string, keyAnswer: string): string {
  if (v === 'empty') return 'X';
  if (v === 'free') return keyAnswer;
  if (v === 'correct') return studentAnswer.toUpperCase();
  return studentAnswer.toLowerCase();
}

function setHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerFill } };
    cell.font = { bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

function setFooter(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.footerFill } };
    cell.font = { bold: true, italic: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });
}

function setSectionRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionFill } };
    cell.font = { bold: true };
  });
}

function setKeyRow(row: ExcelJS.Row, answerColumnIndex: number) {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.keyHeader } };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };
  });
  row.getCell(1).font = { bold: true };
  row.getCell(answerColumnIndex).font = { bold: true, name: 'Consolas' };
  row.getCell(answerColumnIndex).alignment = { horizontal: 'left' };
}

function maxOrZero(values: number[]): number {
  return values.length > 0 ? Math.max(...values) : 0;
}

function averageWithoutZero(values: number[]): number {
  const filtered = values.filter((value) => value !== 0);
  if (filtered.length === 0) return 0;
  return roundTo(filtered.reduce((sum, value) => sum + value, 0) / filtered.length, 2);
}

function computeCourseOffsets(settings: FormSettings): number[] {
  const offsets: number[] = [];
  let cursor = 0;

  settings.courses.forEach((course, index) => {
    if (typeof course.startOffset === 'number' && course.startOffset > 0) {
      offsets.push(course.startOffset - settings.answersStart);
    } else if (index === 0) {
      offsets.push(0);
    } else {
      offsets.push(cursor);
    }

    cursor = offsets[index] + course.questionCount;
  });

  return offsets;
}

function getAnswerKeys(analysis: AnalysisResult): AnswerKey[] {
  return [...(analysis.answerKeys ?? [])].sort((left, right) =>
    left.booklet.localeCompare(right.booklet, 'tr'),
  );
}

function sortStudentResults(students: StudentResult[]): StudentResult[] {
  return [...students].sort((left, right) => {
    const leftId = left.student.studentId || '';
    const rightId = right.student.studentId || '';
    const idCompare = leftId.localeCompare(rightId, 'tr');
    if (idCompare !== 0) return idCompare;
    return left.student.name.localeCompare(right.student.name, 'tr');
  });
}

function writeCourseAnswerKeys(
  sheet: ExcelJS.Worksheet,
  answerKeys: AnswerKey[],
  course: FormSettings['courses'][number],
  offset: number,
  headerLength: number,
  answerColumnIndex: number,
): number {
  const sortedKeys = [...answerKeys].sort((left, right) =>
    left.booklet.localeCompare(right.booklet, 'tr'),
  );

  sortedKeys.forEach((key) => {
    const rowValues = new Array<string>(headerLength).fill('');
    rowValues[0] = `CEVAP ANAHTARI (${key.booklet || 'A'})`;
    rowValues[answerColumnIndex - 1] = key.answers.slice(offset, offset + course.questionCount);
    const row = sheet.addRow(rowValues);
    setKeyRow(row, answerColumnIndex);
  });

  return sortedKeys.length;
}

function autosizeColumns(sheet: ExcelJS.Worksheet, wideColumns = new Map<number, number>()) {
  sheet.columns.forEach((col, idx) => {
    const explicitWidth = wideColumns.get(idx + 1);
    if (explicitWidth) {
      col.width = explicitWidth;
      return;
    }

    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, 50);
  });
}

function writeGeneralSheet(
  wb: ExcelJS.Workbook,
  analysis: AnalysisResult,
  settings: FormSettings,
) {
  const sheet = wb.addWorksheet('Genel Sonuçlar');
  const students = sortStudentResults(analysis.students);
  const extraHeaders = settings.extras.map((e) => e.name);
  const courseHeaders = settings.courses.map((c) => `${c.name} NET`);
  const header = ['Ad-Soyad', 'Öğr. No', 'Kitapçık', ...extraHeaders, ...courseHeaders];
  const headerRow = sheet.addRow(header);
  setHeader(headerRow);

  students.forEach((studentResult) => {
    const row = sheet.addRow([
      studentResult.student.name,
      studentResult.student.studentId,
      studentResult.booklet,
      ...extraHeaders.map((headerName) => studentResult.student.extras[headerName] ?? ''),
      ...studentResult.courses.map((courseResult) => courseResult.net),
    ]);

    if (isInvalidStudentId(studentResult.student.studentId, settings)) {
      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.studentIdError },
      };
    }
  });

  sheet.addRow([]);
  const maxRow = sheet.addRow([
    'EN YÜKSEK',
    '',
    '',
    ...extraHeaders.map(() => ''),
    ...analysis.courseStats.map((courseStat) => courseStat.maxNet),
  ]);
  setFooter(maxRow);

  const avgRow = sheet.addRow([
    'ORTALAMA',
    '',
    '',
    ...extraHeaders.map(() => ''),
    ...analysis.courseStats.map((courseStat) => courseStat.avgNet),
  ]);
  setFooter(avgRow);

  autosizeColumns(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function writeCourseSheet(
  wb: ExcelJS.Workbook,
  analysis: AnalysisResult,
  settings: FormSettings,
  courseIndex: number,
) {
  const course = settings.courses[courseIndex];
  const sheet = wb.addWorksheet(course.name.slice(0, 31));
  const extraHeaders = settings.extras.map((e) => e.name);
  const header = [
    'Ad-Soyad',
    'Öğr. No',
    'Kitapçık',
    ...extraHeaders,
    'D',
    'Y',
    'B',
    'Net',
    'Puan',
    'Cevaplar',
    'Değerlendirme',
  ];

  const answerColumnIndex = header.indexOf('Cevaplar') + 1;
  const evaluationColumnIndex = header.indexOf('Değerlendirme') + 1;
  const offsets = computeCourseOffsets(settings);
  const keyRowCount = writeCourseAnswerKeys(
    sheet,
    getAnswerKeys(analysis),
    course,
    offsets[courseIndex] ?? 0,
    header.length,
    answerColumnIndex,
  );

  const headerRow = sheet.addRow(header);
  setHeader(headerRow);

  const courseStudents = sortStudentResults(analysis.students).filter(
    (studentResult) => studentResult.courses[courseIndex]?.participated,
  );

  courseStudents.forEach((studentResult) => {
    const courseResult = studentResult.courses[courseIndex];
    const row = sheet.addRow([
      studentResult.student.name,
      studentResult.student.studentId,
      studentResult.booklet,
      ...extraHeaders.map((headerName) => studentResult.student.extras[headerName] ?? ''),
      courseResult.correct,
      courseResult.wrong,
      courseResult.empty,
      courseResult.net,
      courseResult.score,
      courseResult.answers,
      '',
    ]);

    const evaluationCell = row.getCell(evaluationColumnIndex);
    evaluationCell.value = {
      richText: courseResult.evaluations.map((evaluation) => ({
        text: verdictChar(
          evaluation.verdict,
          evaluation.studentAnswer,
          evaluation.keyAnswer,
        ),
        font: {
          color: { argb: verdictColor(evaluation.verdict) },
          bold: evaluation.verdict === 'correct' || evaluation.verdict === 'free',
          name: 'Consolas',
        },
      })),
    };

    if (isInvalidStudentId(studentResult.student.studentId, settings)) {
      row.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.studentIdError },
      };
    }
  });

  sheet.addRow([]);

  const courseRows = courseStudents.map((studentResult) => studentResult.courses[courseIndex]);
  const correctValues = courseRows.map((row) => row.correct);
  const wrongValues = courseRows.map((row) => row.wrong);
  const emptyValues = courseRows.map((row) => row.empty);
  const netValues = courseRows.map((row) => row.net);
  const scoreValues = courseRows.map((row) => row.score);

  const maxRowData = new Array<string | number>(header.length).fill('');
  maxRowData[0] = 'EN YÜKSEK';
  maxRowData[header.indexOf('D')] = maxOrZero(correctValues);
  maxRowData[header.indexOf('Y')] = maxOrZero(wrongValues);
  maxRowData[header.indexOf('B')] = maxOrZero(emptyValues);
  maxRowData[header.indexOf('Net')] = maxOrZero(netValues);
  maxRowData[header.indexOf('Puan')] = maxOrZero(scoreValues);
  setFooter(sheet.addRow(maxRowData));

  const avgRowData = new Array<string | number>(header.length).fill('');
  avgRowData[0] = 'ORTALAMA (0 HARİÇ)';
  avgRowData[header.indexOf('D')] = averageWithoutZero(correctValues);
  avgRowData[header.indexOf('Y')] = averageWithoutZero(wrongValues);
  avgRowData[header.indexOf('B')] = averageWithoutZero(emptyValues);
  avgRowData[header.indexOf('Net')] = averageWithoutZero(netValues);
  avgRowData[header.indexOf('Puan')] = averageWithoutZero(scoreValues);
  setFooter(sheet.addRow(avgRowData));

  sheet.getColumn(answerColumnIndex).font = { name: 'Consolas' };
  sheet.getColumn(evaluationColumnIndex).font = { name: 'Consolas' };

  autosizeColumns(
    sheet,
    new Map<number, number>([
      [1, 28],
      [answerColumnIndex, Math.max(course.questionCount * 1.25, 14)],
      [evaluationColumnIndex, Math.max(course.questionCount * 1.5, 18)],
    ]),
  );
  sheet.views = [{ state: 'frozen', ySplit: keyRowCount + 1 }];
}

function writeTransferSheet(
  wb: ExcelJS.Workbook,
  analysis: AnalysisResult,
  settings: FormSettings,
) {
  const sheet = wb.addWorksheet('Not Aktarma');
  const header: string[] = [];
  settings.courses.forEach((course, index) => {
    if (index > 0) header.push('');
    header.push(`${course.name} No`, `${course.name} Not`);
  });
  setHeader(sheet.addRow(header));

  const sortedStudents = sortStudentResults(analysis.students);
  const rowsByCourse = settings.courses.map((_, courseIndex) =>
    sortedStudents
      .filter((studentResult) => studentResult.courses[courseIndex]?.participated)
      .map((studentResult) => ({
        id: studentResult.student.studentId,
        score: studentResult.courses[courseIndex].score,
      })),
  );

  const maxLength = Math.max(...rowsByCourse.map((rows) => rows.length), 0);
  for (let rowIndex = 0; rowIndex < maxLength; rowIndex++) {
    const rowValues: Array<string | number> = [];
    const currentEntries = rowsByCourse.map((rows) => rows[rowIndex]);

    currentEntries.forEach((entry, courseIndex) => {
      if (courseIndex > 0) rowValues.push('');
      rowValues.push(entry?.id ?? '', entry?.score ?? '');
    });

    const row = sheet.addRow(rowValues);
    currentEntries.forEach((entry, courseIndex) => {
      if (!entry || !isInvalidStudentId(entry.id, settings)) return;
      row.getCell(courseIndex * 3 + 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.studentIdError },
      };
    });
  }

  sheet.columns.forEach((col) => {
    col.width = 16;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function writeExcludedSheet(
  wb: ExcelJS.Workbook,
  analysis: AnalysisResult,
  settings: FormSettings,
) {
  const sheet = wb.addWorksheet('Değerlendirme Dışı');
  const answerKeys = getAnswerKeys(analysis);
  const extraHeaders = settings.extras.map((extra) => extra.name);

  const keysTitleRow = sheet.addRow(['SİSTEMDEKİ CEVAP ANAHTARLARI']);
  setSectionRow(keysTitleRow);

  if (answerKeys.length === 0) {
    sheet.addRow(['Cevap anahtarı kaydı yok.']);
  } else {
    answerKeys.forEach((answerKey) => {
      const row = sheet.addRow([
        `${answerKey.booklet || 'A'} Kitapçığı`,
        answerKey.answers,
      ]);
      setKeyRow(row, 2);
    });
  }

  sheet.addRow([]);

  const excludedTitleRow = sheet.addRow([
    `DEĞERLENDİRME DIŞI ÖĞRENCİLER (${analysis.excluded.length})`,
  ]);
  setSectionRow(excludedTitleRow);

  const header = [
    'Ad-Soyad',
    'Öğr. No',
    'Kitapçık',
    ...extraHeaders,
    'Sebep',
    'Ham Satır Verisi',
  ];
  setHeader(sheet.addRow(header));

  const excludedStudents = sortStudentResults(analysis.excluded);
  if (excludedStudents.length === 0) {
    sheet.addRow(['Kayıt yok.']);
  } else {
    excludedStudents.forEach((studentResult) => {
      sheet.addRow([
        studentResult.student.name,
        studentResult.student.studentId,
        studentResult.booklet || '—',
        ...extraHeaders.map((headerName) => studentResult.student.extras[headerName] ?? ''),
        studentResult.exclusionReason ?? '',
        studentResult.student.rawLine,
      ]);
    });
  }

  autosizeColumns(
    sheet,
    new Map<number, number>([
      [1, 28],
      [header.length, 70],
    ]),
  );
}

function writeObsSheet(
  wb: ExcelJS.Workbook,
  analysis: AnalysisResult,
  settings: FormSettings,
  obsConfig?: OBSColumnConfig[],
) {
  const sheet = wb.addWorksheet('OBS Not Aktarma');

  const configuredColumns = obsConfig
    ? mergeOBSConfig(settings.courses, obsConfig)
        .filter((entry) => entry.visible)
        .flatMap((entry) => {
          const courseIndex = settings.courses.findIndex((course) => course.name === entry.courseId);
          if (courseIndex === -1) return [];
          const course = settings.courses[courseIndex];
          return [
            {
              courseIndex,
              courseName: course.name,
              metric: entry.metric,
              header: `${course.name} ${entry.metric === 'net' ? 'NET' : 'PUAN'}`,
            },
          ];
        })
    : settings.courses.map((course, courseIndex) => ({
        courseIndex,
        courseName: course.name,
        metric: 'score' as const,
        header: course.name,
      }));

  const courseHeaders = configuredColumns.map((course) => course.header);
  const header = ['Öğrenci No', 'Ad Soyad', ...courseHeaders];
  const headerRow = sheet.addRow(header);
  setHeader(headerRow);

  const sortedStudents = sortStudentResults(analysis.students);

  sortedStudents.forEach((studentResult) => {
    const row = sheet.addRow([
      studentResult.student.studentId,
      studentResult.student.name,
      ...configuredColumns.map((column) => {
        const courseResult =
          studentResult.courses[column.courseIndex]?.courseName === column.courseName
            ? studentResult.courses[column.courseIndex]
            : studentResult.courses.find((course) => course.courseName === column.courseName);
        return roundTo(courseResult?.[column.metric] ?? 0, 2);
      }),
    ]);

    if (isInvalidStudentId(studentResult.student.studentId, settings)) {
      row.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.studentIdError },
      };
    }
  });

  sheet.addRow([]);
  const statsRow = sheet.addRow([
    'SINIF ORT.',
    '',
    ...configuredColumns.map((column) => {
      const courseStat =
        analysis.courseStats[column.courseIndex]?.courseName === column.courseName
          ? analysis.courseStats[column.courseIndex]
          : analysis.courseStats.find((stat) => stat.courseName === column.courseName);
      const value =
        column.metric === 'net'
          ? courseStat?.avgNet
          : courseStat?.avgScore ?? courseStat?.avgNet;
      return roundTo(value ?? 0, 2);
    }),
  ]);
  setFooter(statsRow);

  autosizeColumns(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function isInvalidStudentId(studentId: string, settings: FormSettings): boolean {
  return (
    studentId.length === 0 ||
    studentId.length !== settings.studentIdColumn.length ||
    /[\s*]/.test(studentId)
  );
}

export async function buildObsWorkbook(
  analysis: AnalysisResult,
  settings: FormSettings,
  meta: { title?: string; createdAt?: Date } = {},
  obsConfig?: OBSColumnConfig[],
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NetOku';
  wb.created = meta.createdAt ?? new Date();
  if (meta.title) wb.title = meta.title;

  writeObsSheet(wb, analysis, settings, obsConfig);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function buildWorkbook(
  analysis: AnalysisResult,
  settings: FormSettings,
  meta: { title?: string; createdAt?: Date } = {},
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NetOku';
  wb.created = meta.createdAt ?? new Date();
  if (meta.title) wb.title = meta.title;

  writeGeneralSheet(wb, analysis, settings);
  settings.courses.forEach((_, index) => writeCourseSheet(wb, analysis, settings, index));
  writeTransferSheet(wb, analysis, settings);
  writeExcludedSheet(wb, analysis, settings);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadWorkbook(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type { CourseResult };
