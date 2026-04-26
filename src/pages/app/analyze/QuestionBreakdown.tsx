import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Lock, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/brutal';
import { buildQuestionStats, type QuestionStat } from '@/lib/question-stats';
import type { AnalysisRecord } from '@/lib/db';
import type { FormSettings } from '@/types/domain';

type SortMode = 'index' | 'hardest' | 'easiest';

interface QuestionBreakdownProps {
  record: Pick<AnalysisRecord, 'result'>;
  settings: FormSettings;
  isPro: boolean;
}

const OPTION_ORDER = ['A', 'B', 'C', 'D', 'E', 'Boş'];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function QuestionBreakdown({
  record,
  settings,
  isPro,
}: QuestionBreakdownProps) {
  const courseNames = useMemo(() => settings.courses.map((course) => course.name), [settings]);
  const [selectedCourse, setSelectedCourse] = useState(courseNames[0] ?? '');
  const [sortMode, setSortMode] = useState<SortMode>('index');
  const courseName = courseNames.includes(selectedCourse) ? selectedCourse : (courseNames[0] ?? '');

  const stats = useMemo(
    () => (courseName ? buildQuestionStats(record, courseName) : []),
    [record, courseName],
  );

  const sortedStats = useMemo(() => {
    const rows = [...stats];
    if (sortMode === 'hardest') {
      return rows.sort((left, right) => left.difficulty - right.difficulty);
    }
    if (sortMode === 'easiest') {
      return rows.sort((left, right) => right.difficulty - left.difficulty);
    }
    return rows.sort((left, right) => left.index - right.index);
  }, [stats, sortMode]);

  if (!isPro) {
    return (
      <div className="border-2 border-ink bg-primary-tint p-6 shadow-brutal-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center border-2 border-ink bg-paper">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-[24px] leading-tight">Soru analizi Pro ile açılır.</div>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Her soru için doğru oranı, yanlış yoğunluğu ve şık dağılımını tek tabloda gör.
              </p>
            </div>
          </div>
          <Link to="/app/billing">
            <Button variant="ink">Pro'ya geç</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (courseNames.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink p-6 text-sm text-ink-muted">
        Soru analizi için en az bir ders gerekiyor.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
            <BarChart3 className="h-3.5 w-3.5" />
            Soru bazlı analiz
          </div>
          <div className="mt-2 font-display text-[24px] leading-tight">{courseName}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="border-2 border-ink bg-paper px-3 py-2 text-sm"
            value={courseName}
            onChange={(event) => setSelectedCourse(event.target.value)}
            aria-label="Ders seç"
          >
            {courseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="border-2 border-ink bg-paper px-3 py-2 text-sm"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            aria-label="Sırala"
          >
            <option value="index">Soru no</option>
            <option value="hardest">En zor</option>
            <option value="easiest">En kolay</option>
          </select>
        </div>
      </div>

      {sortedStats.length === 0 ? (
        <div className="border-2 border-dashed border-ink p-6 text-sm text-ink-muted">
          Bu ders için katılım veya soru verisi bulunamadı.
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-ink">
          <div className="min-w-[920px]">
            <div className="grid grid-cols-[90px_120px_60px_60px_60px_80px_minmax(280px,1fr)] items-center bg-ink px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white">
              <div>Soru</div>
              <div>Doğru %</div>
              <div className="text-center">D</div>
              <div className="text-center">Y</div>
              <div className="text-center">B</div>
              <div>Anahtar</div>
              <div className="flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Şık dağılımı
              </div>
            </div>
            {sortedStats.map((stat, rowIndex) => (
              <QuestionRow key={stat.index} stat={stat} odd={rowIndex % 2 === 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionRow({ stat, odd }: { stat: QuestionStat; odd: boolean }) {
  return (
    <div
      className={`grid grid-cols-[90px_120px_60px_60px_60px_80px_minmax(280px,1fr)] items-center gap-0 border-t-2 border-ink/10 px-3 py-3 text-sm ${
        odd ? 'bg-cream' : 'bg-paper'
      }`}
    >
      <div className="font-bold">#{stat.index}</div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold">{formatPercent(stat.difficulty)}</span>
          <div className="h-2 w-16 border border-ink bg-paper">
            <div className="h-full bg-success" style={{ width: `${stat.difficulty * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="text-center font-bold text-success">{stat.correct}</div>
      <div className="text-center font-bold text-destructive">{stat.wrong}</div>
      <div className="text-center text-ink-muted">{stat.empty}</div>
      <div>
        <Tag color="paper" textColor="ink">{stat.keyAnswer || '-'}</Tag>
      </div>
      <OptionBars stat={stat} />
    </div>
  );
}

function OptionBars({ stat }: { stat: QuestionStat }) {
  const entries = Object.entries(stat.optionCounts).sort(([left], [right]) => {
    const leftIndex = OPTION_ORDER.indexOf(left);
    const rightIndex = OPTION_ORDER.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? OPTION_ORDER.length : leftIndex) -
        (rightIndex === -1 ? OPTION_ORDER.length : rightIndex);
    }
    return left.localeCompare(right, 'tr');
  });

  return (
    <div className="grid gap-1">
      {entries.map(([option, count]) => {
        const width = stat.total > 0 ? (count / stat.total) * 100 : 0;
        return (
          <div key={option} className="grid grid-cols-[34px_minmax(120px,1fr)_42px] items-center gap-2">
            <span className="font-mono text-xs font-bold">{option}</span>
            <div className="h-2 border border-ink bg-paper">
              <div className="h-full bg-primary" style={{ width: `${width}%` }} />
            </div>
            <span className="text-right text-xs text-ink-muted">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
