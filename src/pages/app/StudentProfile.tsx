import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Medal,
  Printer,
  TrendingDown,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, Eyebrow, Tag } from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import {
  fetchProfile,
  listWorkspaceAnalyses,
  type AnalysisRecord,
} from '@/lib/db';
import {
  buildStudentProfile,
  hasDetailedResult,
  type StudentCourseTrend,
  type StudentProgressPoint,
} from '@/lib/insights';
import { errorMessage, messages } from '@/lib/messages';

function formatDelta(delta: number): string {
  const abs = Math.abs(delta).toFixed(2);
  if (delta > 0) return `+${abs}`;
  if (delta < 0) return `-${abs}`;
  return '0.00';
}

function formatRankDelta(delta: number): string {
  if (delta > 0) return `+${delta} sıra`;
  if (delta < 0) return `${delta} sıra`;
  return 'Değişmedi';
}

export function StudentProfile() {
  const { studentId = '' } = useParams();
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    fetchProfile(user.id)
      .then((profile) =>
        listWorkspaceAnalyses({
          userId: user.id,
          organizationId: profile?.organization_id,
          limit: 160,
        }),
      )
      .then((records) => {
        if (!cancelled) setAnalyses(records);
      })
      .catch((error) => {
        toast.error(errorMessage(error, messages.insights.loadFailed));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const detailedAnalyses = useMemo(
    () => analyses.filter(hasDetailedResult),
    [analyses],
  );
  const profile = useMemo(
    () => buildStudentProfile(detailedAnalyses, studentId),
    [detailedAnalyses, studentId],
  );

  if (loading) {
    return <div className="h-56 animate-pulse border-2 border-ink bg-paper shadow-brutal-sm" />;
  }

  if (!profile) {
    return (
      <div className="space-y-5">
        <Link to="/app/insights">
          <Button variant="paper" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            İçgörülere dön
          </Button>
        </Link>
        <Card className="border-dashed p-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center border-2 border-ink bg-primary-tint">
            <UserRound className="h-7 w-7" />
          </div>
          <h1 className="font-display text-[32px] leading-tight">Öğrenci bulunamadı.</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
            Bu öğrenci için detaylı analiz geçmişi yok ya da seçili çalışma alanında görünmüyor.
          </p>
        </Card>
      </div>
    );
  }

  const { summary, progress, courseTrends } = profile;
  const latestAnalysis = progress.at(-1);
  const trendPoints = progress.map((point) => ({
    label: point.title,
    value: point.totalNet,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/app/insights"
            className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-2 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            İçgörülere dön
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Avatar name={summary.name} size={64} />
            <div className="min-w-0">
              <Eyebrow>— Öğrenci profili</Eyebrow>
              <h1 className="mt-2 truncate font-display text-[clamp(40px,5vw,58px)] leading-[1.02]">
                {summary.name}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-ink-muted">
                <span>No: {summary.studentId}</span>
                <span>·</span>
                <span>Son analiz: {new Date(summary.lastSeenAt).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to={`/app/insights?student=${encodeURIComponent(summary.studentId)}&reportStudent=${encodeURIComponent(summary.studentId)}`}>
            <Button variant="paper" className="gap-2">
              <Printer className="h-4 w-4" />
              Veli raporu
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ProfileMetric
          label="Son toplam net"
          value={summary.latestNet.toFixed(2)}
          detail={summary.previousNet === null ? 'İlk kayıt' : `${formatDelta(summary.deltaNet)} net`}
          tone={summary.deltaNet >= 0 ? 'good' : 'bad'}
        />
        <ProfileMetric
          label="Sıralama"
          value={`${summary.latestRank}/${summary.totalStudents}`}
          detail={formatRankDelta(summary.rankDelta)}
          tone={summary.rankDelta >= 0 ? 'good' : 'bad'}
        />
        <ProfileMetric
          label="Güçlü ders"
          value={summary.strongestCourse ?? '—'}
          detail="Son analiz"
        />
        <ProfileMetric
          label="Odak dersi"
          value={summary.focusCourse ?? '—'}
          detail={`${summary.analysisCount} analiz geçmişi`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>— Net trendi</Eyebrow>
              <h2 className="mt-2 font-display text-[30px] leading-tight">Yıl içi gidiş</h2>
            </div>
            {latestAnalysis && (
              <Tag color="paper" textColor="ink">
                {latestAnalysis.title}
              </Tag>
            )}
          </div>
          <Sparkline points={trendPoints} />
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {progress.slice(-3).map((point) => (
              <div key={point.analysisId} className="border-2 border-ink bg-cream p-3">
                <div className="truncate text-sm font-bold">{point.title}</div>
                <div className="mt-1 text-xs text-ink-muted">
                  {new Date(point.takenAt).toLocaleDateString('tr-TR')}
                </div>
                <div className="mt-2 font-display text-[26px] leading-none">
                  {point.totalNet.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <Eyebrow>— Ders gelişimi</Eyebrow>
          <h2 className="mt-2 font-display text-[30px] leading-tight">Son durum</h2>
          <div className="mt-5 space-y-3">
            {courseTrends.map((course) => (
              <CourseTrendRow key={course.name} course={course} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>— Analiz geçmişi</Eyebrow>
            <h2 className="mt-2 font-display text-[30px] leading-tight">Timeline</h2>
          </div>
          <Tag color="primary-tint" textColor="primary">
            {progress.length} kayıt
          </Tag>
        </div>
        <div className="space-y-3">
          {progress.map((point, index) => (
            <HistoryRow
              key={point.analysisId}
              point={point}
              previous={index > 0 ? progress[index - 1] : null}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'neutral' | 'good' | 'bad';
}) {
  const icon =
    tone === 'good' ? <TrendingUp className="h-4 w-4 text-success" />
    : tone === 'bad' ? <TrendingDown className="h-4 w-4 text-destructive" />
    : <BarChart3 className="h-4 w-4" />;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
        {icon}
        {label}
      </div>
      <div className="mt-3 truncate font-display text-[34px] leading-none">{value}</div>
      <div className="mt-2 text-sm text-ink-muted">{detail}</div>
    </Card>
  );
}

function Sparkline({ points }: { points: Array<{ label: string; value: number }> }) {
  const width = 720;
  const height = 220;
  const padding = 22;
  const values = points.map((point) => point.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  const coords = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : padding + (index * (width - padding * 2)) / (points.length - 1);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { x, y, ...point };
  });
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath =
    coords.length > 0
      ? `${path} L ${coords.at(-1)!.x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : '';

  return (
    <div className="border-2 border-ink bg-cream p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full" role="img" aria-label="Toplam net trend grafiği">
        <rect x="0" y="0" width={width} height={height} fill="#FFF7E6" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#0A0A0A" strokeWidth="2" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#0A0A0A" strokeWidth="2" />
        {areaPath && <path d={areaPath} fill="#7C5FF5" opacity="0.14" />}
        {path && <path d={path} fill="none" stroke="#7C5FF5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        {coords.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="7" fill="#F4D35E" stroke="#0A0A0A" strokeWidth="3" />
            <text x={point.x} y={point.y - 14} textAnchor="middle" className="fill-ink text-[13px] font-bold">
              {point.value.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function CourseTrendRow({ course }: { course: StudentCourseTrend }) {
  const maxNet = Math.max(...course.points.map((point) => point.net), course.latestNet, 1);
  const width = Math.min(Math.max((course.latestNet / maxNet) * 100, 4), 100);

  return (
    <div className="border-2 border-ink bg-cream p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-bold">{course.name}</div>
          <div className="text-xs text-ink-muted">
            Ort. {course.averageNet.toFixed(2)} net · {course.points.length} kayıt
          </div>
        </div>
        <Tag color={course.deltaNet >= 0 ? 'green-tint' : 'red-tint'} textColor="ink">
          {formatDelta(course.deltaNet)}
        </Tag>
      </div>
      <div className="mt-3 h-3 border-2 border-ink bg-paper">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
        <span>{course.previousNet === null ? 'Önceki yok' : `Önceki ${course.previousNet.toFixed(2)}`}</span>
        <span className="font-bold text-ink">{course.latestNet.toFixed(2)} net</span>
      </div>
    </div>
  );
}

function HistoryRow({
  point,
  previous,
}: {
  point: StudentProgressPoint;
  previous: StudentProgressPoint | null;
}) {
  const delta = previous ? point.totalNet - previous.totalNet : 0;

  return (
    <div className="flex flex-wrap items-center gap-4 border-2 border-ink bg-paper p-4 shadow-brutal-sm">
      <div className="grid h-11 w-11 shrink-0 place-items-center border-2 border-ink bg-primary-tint">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-[180px] flex-1">
        <div className="font-display text-[22px] leading-tight">{point.title}</div>
        <div className="mt-1 text-xs text-ink-muted">
          {new Date(point.takenAt).toLocaleDateString('tr-TR')}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tag color="paper" textColor="ink">
          {point.totalNet.toFixed(2)} net
        </Tag>
        <Tag color={delta >= 0 ? 'green-tint' : 'red-tint'} textColor="ink">
          {previous ? formatDelta(delta) : 'İlk kayıt'}
        </Tag>
        <Tag color="primary-tint" textColor="primary">
          <span className="inline-flex items-center gap-1">
            <Medal className="h-3 w-3" />
            {point.rank}/{point.totalStudents}
          </span>
        </Tag>
      </div>
      <Link to={`/app/insights?left=${encodeURIComponent(point.analysisId)}&right=${encodeURIComponent(point.analysisId)}`}>
        <Button variant="ghost" size="icon" aria-label="Analizi içgörülerde aç">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
