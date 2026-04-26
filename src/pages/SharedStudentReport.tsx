import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Award, BookOpen, CalendarDays, Printer, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSharedStudentReport } from '@/lib/db';
import { errorMessage, messages } from '@/lib/messages';
import type { StudentReportPayload } from '@/lib/reports';

export function SharedStudentReport() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [payload, setPayload] = useState<StudentReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const shouldAutoPrint = searchParams.get('print') === '1';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getSharedStudentReport<StudentReportPayload>(token)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setError(messages.sharedReport.notFound);
          return;
        }
        setPayload(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(errorMessage(reason, messages.sharedReport.loadFailed));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!payload || !shouldAutoPrint) return;
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, [payload, shouldAutoPrint]);

  if (loading) {
    return <div className="min-h-screen bg-cream p-8" />;
  }

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="max-w-lg border-2 border-ink bg-paper p-8 text-center shadow-brutal">
          <h1 className="font-display text-[32px] leading-tight">Rapor açılamadı</h1>
          <p className="mt-3 text-sm text-ink-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-report-shell min-h-screen bg-cream px-5 py-8">
      <div className="no-print mx-auto mb-4 flex max-w-4xl justify-end">
        <Button variant="ink" onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" />
          PDF / Yazdır
        </Button>
      </div>

      <article className="print-report-sheet mx-auto max-w-4xl border-2 border-ink bg-paper p-7 shadow-brutal">
        <div
          className="avoid-break border-2 border-ink p-6"
          style={{
            borderTopColor: payload.branding.primaryColor,
            borderTopWidth: 10,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
                {payload.branding.brandName}
              </div>
              <h1 className="mt-3 font-display text-[clamp(34px,5vw,54px)] leading-[1.02]">
                {payload.student.name}
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {payload.analysisTitle} · {new Date(payload.analysisDate).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div className="grid min-w-[180px] gap-2 text-sm">
              <ReportMiniLine label="Öğrenci No" value={payload.student.id} />
              <ReportMiniLine label="Kitapçık" value={payload.student.booklet} />
              <ReportMiniLine
                label="Rapor"
                value={new Date(payload.generatedAt).toLocaleDateString('tr-TR')}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <HeroStat
              icon={<Trophy className="h-4 w-4" />}
              label="Toplam net"
              value={payload.student.totalNet.toFixed(2)}
            />
            <HeroStat
              icon={<Award className="h-4 w-4" />}
              label="Sıra"
              value={`${payload.student.rank}/${payload.student.totalStudents}`}
            />
            <HeroStat
              icon={<BookOpen className="h-4 w-4" />}
              label="Güçlü ders"
              value={payload.summary.strongestCourse ?? '—'}
            />
            <HeroStat
              icon={<Target className="h-4 w-4" />}
              label="Odak dersi"
              value={payload.summary.needsAttentionCourse ?? '—'}
            />
          </div>
        </div>

        <section className="avoid-break mt-6 border-2 border-ink p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
                Akademik özet
              </div>
              <h2 className="mt-2 font-display text-[28px] leading-tight">Ders bazlı sonuçlar</h2>
            </div>
            <div className="border-2 border-ink bg-cream px-3 py-2 text-sm">
              Sınıf ort. toplam net: <strong>{payload.summary.classAverageTotalNet.toFixed(2)}</strong>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {payload.courses.map((course) => (
              <CourseReportRow key={course.name} course={course} />
            ))}
          </div>
        </section>

        <section className="avoid-break mt-6 grid gap-4 md:grid-cols-2">
          <div className="border-2 border-ink bg-success-tint p-4">
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
              Güçlü alan
            </div>
            <div className="mt-2 font-display text-[26px] leading-tight">
              {payload.summary.strongestCourse ?? 'Henüz belirlenmedi'}
            </div>
          </div>
          <div className="border-2 border-ink bg-pop p-4">
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
              Çalışma odağı
            </div>
            <div className="mt-2 font-display text-[26px] leading-tight">
              {payload.summary.needsAttentionCourse ?? 'Henüz belirlenmedi'}
            </div>
          </div>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink pt-4 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            Rapor tarihi: {new Date(payload.generatedAt).toLocaleDateString('tr-TR')}
          </span>
          <span>{payload.branding.brandName} · NetOku</span>
        </footer>
      </article>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border-2 border-ink bg-cream p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate font-display text-[24px] leading-none">{value}</div>
    </div>
  );
}

function ReportMiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink/20 pb-1">
      <span className="text-ink-muted">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

function CourseReportRow({
  course,
}: {
  course: StudentReportPayload['courses'][number];
}) {
  const max = Math.max(course.maxNet, course.net, 1);
  const width = Math.min(Math.max((course.net / max) * 100, 4), 100);

  return (
    <div className="avoid-break border-2 border-ink bg-cream p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_160px]">
        <div>
          <div className="font-semibold">{course.name}</div>
          <div className="mt-1 text-xs text-ink-muted">
            Doğru {course.correct} · Yanlış {course.wrong} · Boş {course.empty}
          </div>
          <div className="mt-3 h-3 border-2 border-ink bg-paper">
            <div className="h-full bg-primary" style={{ width: `${width}%` }} />
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="font-display text-[30px] leading-none">{course.net.toFixed(2)}</div>
          <div className="mt-1 text-xs text-ink-muted">Puan {course.score.toFixed(2)}</div>
          <div className="mt-1 text-xs text-ink-muted">
            Sınıf ort. {course.classAverageNet.toFixed(2)} · Maks {course.maxNet.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

