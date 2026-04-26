import type { AnalysisRecord } from './db';

export interface QuestionStat {
  index: number;
  correct: number;
  wrong: number;
  empty: number;
  total: number;
  difficulty: number;
  keyAnswer: string;
  optionCounts: Record<string, number>;
}

function createStat(index: number, keyAnswer: string): QuestionStat {
  return {
    index,
    correct: 0,
    wrong: 0,
    empty: 0,
    total: 0,
    difficulty: 0,
    keyAnswer,
    optionCounts: {},
  };
}

function optionLabel(answer: string): string {
  const normalized = answer.trim().toUpperCase();
  return normalized || 'Boş';
}

export function buildQuestionStats(
  record: Pick<AnalysisRecord, 'result'>,
  courseName: string,
): QuestionStat[] {
  const byIndex = new Map<number, QuestionStat>();

  (record.result?.students ?? []).forEach((studentResult) => {
    const course = studentResult.courses.find((item) => item.courseName === courseName);
    if (!course?.participated) return;

    course.evaluations.forEach((evaluation) => {
      const index = evaluation.index + 1;
      const stat = byIndex.get(index) ?? createStat(index, evaluation.keyAnswer);
      stat.total += 1;
      stat.keyAnswer ||= evaluation.keyAnswer;

      if (evaluation.verdict === 'correct' || evaluation.verdict === 'free') {
        stat.correct += 1;
      } else if (evaluation.verdict === 'wrong') {
        stat.wrong += 1;
      } else {
        stat.empty += 1;
      }

      const selected = optionLabel(evaluation.studentAnswer);
      stat.optionCounts[selected] = (stat.optionCounts[selected] ?? 0) + 1;
      byIndex.set(index, stat);
    });
  });

  return [...byIndex.values()]
    .sort((left, right) => left.index - right.index)
    .map((stat) => ({
      ...stat,
      difficulty: stat.total > 0 ? stat.correct / stat.total : 0,
    }));
}
