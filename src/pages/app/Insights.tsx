import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, Copy, ExternalLink, Link2, Printer, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { ShareLinkActions } from '@/components/ShareLinkActions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Eyebrow, Tag } from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import {
  createStudentReportShare,
  listWorkspaceAnalyses,
  listWorkspacePresets,
  type AnalysisRecord,
  type PresetRecord,
  fetchProfile,
} from '@/lib/db';
import {
  buildAnalysisComparison,
  buildAnalysisComparisonSummary,
  buildStudentProgress,
  buildTopMovers,
  buildUsageDashboard,
  hasDetailedResult,
  listStudentDirectory,
  type AnalysisComparisonSide,
} from '@/lib/insights';
import { buildStudentReportPayload, type ReportBranding } from '@/lib/reports';
import { getTeamInfo, type TeamInfo } from '@/lib/team';
import { errorMessage, messages } from '@/lib/messages';

function formatDelta(delta: number) {
  const abs = Math.abs(delta).toFixed(2);
  return delta > 0 ? `+${abs}` : `-${abs}`;
}

export function Insights() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [presets, setPresets] = useState<PresetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [createdShare, setCreatedShare] = useState<{
    url: string;
    analysisId: string;
    studentId: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    fetchProfile(user.id)
      .then(async (fetchedProfile) => {
        const [records, savedPresets, teamInfo] = await Promise.all([
          listWorkspaceAnalyses({
            userId: user.id,
            organizationId: fetchedProfile?.organization_id,
            limit: 120,
          }),
          listWorkspacePresets({
            userId: user.id,
            organizationId: fetchedProfile?.organization_id,
          }),
          fetchedProfile?.organization_id ? getTeamInfo() : Promise.resolve(null),
        ]);

        setAnalyses(records);
        setPresets(savedPresets);
        setTeam(teamInfo);
      })
      .catch((error) => {
        toast.error(errorMessage(error, messages.insights.loadFailed));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const detailedAnalyses = useMemo(
    () => analyses.filter(hasDetailedResult),
    [analyses],
  );

  const studentDirectory = useMemo(
    () => listStudentDirectory(detailedAnalyses),
    [detailedAnalyses],
  );

  const leftAnalysisId =
    searchParams.get('left') ?? detailedAnalyses.at(-2)?.id ?? detailedAnalyses.at(0)?.id ?? '';
  const rightAnalysisId =
    searchParams.get('right') ?? detailedAnalyses.at(-1)?.id ?? detailedAnalyses.at(0)?.id ?? '';
  const selectedStudentId =
    searchParams.get('student') ?? studentDirectory.at(0)?.studentId ?? '';
  const reportAnalysisId =
    searchParams.get('report') ?? detailedAnalyses.at(-1)?.id ?? detailedAnalyses.at(0)?.id ?? '';

  const leftAnalysis = detailedAnalyses.find((record) => record.id === leftAnalysisId) ?? null;
  const rightAnalysis = detailedAnalyses.find((record) => record.id === rightAnalysisId) ?? null;
  const reportAnalysis = detailedAnalyses.find((record) => record.id === reportAnalysisId) ?? null;

  const usage = useMemo(
    () => buildUsageDashboard(analyses, presets),
    [analyses, presets],
  );
  const comparisonRows = useMemo(
    () => buildAnalysisComparison(leftAnalysis, rightAnalysis),
    [leftAnalysis, rightAnalysis],
  );
  const comparisonSummary = useMemo(
    () => buildAnalysisComparisonSummary(leftAnalysis, rightAnalysis),
    [leftAnalysis, rightAnalysis],
  );
  const studentProgress = useMemo(
    () => buildStudentProgress(detailedAnalyses, selectedStudentId),
    [detailedAnalyses, selectedStudentId],
  );
  const movers = useMemo(
    () => buildTopMovers([leftAnalysis, rightAnalysis].filter(Boolean) as AnalysisRecord[]),
    [leftAnalysis, rightAnalysis],
  );

  const reportStudents = reportAnalysis?.result?.students ?? [];
  const reportStudentId =
    searchParams.get('reportStudent') ?? reportStudents.at(0)?.student.studentId ?? '';
  const shareUrl =
    createdShare?.analysisId === reportAnalysisId && createdShare.studentId === reportStudentId
      ? createdShare.url
      : '';

  const branding: ReportBranding = useMemo(
    () => ({
      brandName: team?.org.brand_name || team?.org.name || 'NetOku',
      logoUrl: team?.org.logo_url ?? null,
      primaryColor: team?.org.brand_primary_color ?? '#0F172A',
      accentColor: team?.org.brand_accent_color ?? '#F4D35E',
    }),
    [team],
  );

  const reportPayload = useMemo(
    () =>
      reportAnalysis
        ? buildStudentReportPayload({
            record: reportAnalysis,
            studentId: reportStudentId,
            branding,
          })
        : null,
    [reportAnalysis, reportStudentId, branding],
  );

  const syncQuery = (next: Record<string, string>) => {
    const merged = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    setSearchParams(merged, { replace: true });
  };

  const createShare = async () => {
    if (!user || !reportAnalysis || !reportPayload) return;
    setSharing(true);
    try {
      const share = await createStudentReportShare({
        analysisId: reportAnalysis.id,
        organizationId: reportAnalysis.organization_id,
        createdBy: user.id,
        studentId: reportPayload.student.id,
        studentName: reportPayload.student.name,
        reportPayload,
      });
      const url = `${window.location.origin}/report/${share.share_token}`;
      setCreatedShare({
        url,
        analysisId: reportAnalysis.id,
        studentId: reportPayload.student.id,
      });
      toast.success('Paylaşım linki hazır.');
    } catch (error) {
      toast.error(errorMessage(error, messages.insights.shareLinkFailed));
    } finally {
      setSharing(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Paylaşım linki kopyalandı.');
  };

  if (loading) {
    return <div className="h-48 animate-pulse border-2 border-ink bg-paper shadow-brutal-sm" />;
  }

  if (detailedAnalyses.length === 0) {
    return (
      <div className="space-y-4">
        <Eyebrow>— İçgörüler</Eyebrow>
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-ink-muted">
            Detaylı analiz kaydı oluştukça gelişim, karşılaştırma ve rapor ekranı burada dolacak.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>— İçgörüler</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.02] tracking-[-0.02em]">
          Kurum merkezi.
        </h1>
        <p className="mt-2 max-w-[760px] text-[15px] text-ink-muted">
          Ortak arşiv, öğrenci gelişimi, sınav karşılaştırma, veli raporu ve kullanım görünümü tek yerde.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Toplam analiz" value={usage.totalAnalyses} />
        <MetricCard label="Bu ay" value={usage.thisMonthAnalyses} />
        <MetricCard label="Benzersiz öğrenci" value={usage.uniqueStudentCount} />
        <MetricCard label="Kurum preset" value={usage.organizationPresets} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>— Karşılaştırma</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">Sınav farkı</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="border-2 border-ink bg-paper px-3 py-2 text-sm"
                value={leftAnalysisId}
                onChange={(event) => syncQuery({ left: event.target.value })}
              >
                {detailedAnalyses.map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.title}
                  </option>
                ))}
              </select>
              <select
                className="border-2 border-ink bg-paper px-3 py-2 text-sm"
                value={rightAnalysisId}
                onChange={(event) => syncQuery({ right: event.target.value })}
              >
                {detailedAnalyses.map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparisonSummary.left && comparisonSummary.right && (
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <CompareSide
                label="Sol"
                side={comparisonSummary.left}
                dateLabel={new Date(comparisonSummary.left.takenAt).toLocaleDateString('tr-TR')}
              />
              <CompareSide
                label="Sağ"
                side={comparisonSummary.right}
                dateLabel={new Date(comparisonSummary.right.takenAt).toLocaleDateString('tr-TR')}
                highlight
              />
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3 border-2 border-ink bg-pop p-3 text-xs">
                <span className="font-bold uppercase tracking-[0.06em]">Fark</span>
                <Tag
                  color={comparisonSummary.avgNetDelta >= 0 ? 'pop' : 'red-tint'}
                  textColor="ink"
                >
                  Ort. net {formatDelta(comparisonSummary.avgNetDelta)}
                </Tag>
                <Tag color="paper" textColor="ink">
                  Öğrenci {comparisonSummary.totalStudentsDelta >= 0 ? '+' : ''}
                  {comparisonSummary.totalStudentsDelta}
                </Tag>
                <Tag color="paper" textColor="ink">
                  Değerl. {comparisonSummary.evaluatedDelta >= 0 ? '+' : ''}
                  {comparisonSummary.evaluatedDelta}
                </Tag>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {comparisonRows.map((row) => (
              <div key={row.courseName} className="border-2 border-ink bg-cream p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{row.courseName}</div>
                    <div className="text-xs text-ink-muted">
                      {row.leftAvgNet.toFixed(2)} net → {row.rightAvgNet.toFixed(2)} net
                    </div>
                  </div>
                  <Tag
                    color={row.deltaNet >= 0 ? 'pop' : 'red-tint'}
                    textColor="ink"
                  >
                    {row.deltaNet >= 0 ? '+' : ''}
                    {row.deltaNet.toFixed(2)} net
                  </Tag>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <Eyebrow>— Öne çıkanlar</Eyebrow>
          <h2 className="mt-2 font-display text-[28px] leading-tight">Seçili sınav hareketi</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <MoverList
              title="Yükselenler"
              icon={<TrendingUp className="h-4 w-4 text-green-700" />}
              items={movers.topRisers}
            />
            <MoverList
              title="Düşenler"
              icon={<TrendingDown className="h-4 w-4 text-red-700" />}
              items={movers.topDecliners}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>— Gelişim</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">Öğrenci geçmişi</h2>
            </div>
            <select
              className="border-2 border-ink bg-paper px-3 py-2 text-sm"
              value={selectedStudentId}
              onChange={(event) => syncQuery({ student: event.target.value })}
            >
              {studentDirectory.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {student.name} · {student.studentId}
                </option>
              ))}
            </select>
            {selectedStudentId && (
              <Link to={`/app/students/${encodeURIComponent(selectedStudentId)}`}>
                <Button variant="paper" size="sm" className="gap-2">
                  <UserRound className="h-4 w-4" />
                  Profil
                </Button>
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {studentProgress.map((point) => (
              <div key={point.analysisId} className="border-2 border-ink bg-cream p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{point.title}</div>
                    <div className="text-xs text-ink-muted">
                      {new Date(point.takenAt).toLocaleDateString('tr-TR')} · Sıra {point.rank}/{point.totalStudents}
                    </div>
                  </div>
                  <Tag color="paper" textColor="ink">
                    {point.totalNet.toFixed(2)} net
                  </Tag>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {point.courses.map((course) => (
                    <Tag key={`${point.analysisId}-${course.name}`} color="paper" textColor="ink">
                      {course.name}: {course.net.toFixed(2)}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>— Rapor</Eyebrow>
              <h2 className="mt-2 font-display text-[28px] leading-tight">Veli / öğrenci paylaşımı</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                className="border-2 border-ink bg-paper px-3 py-2 text-sm"
                value={reportAnalysisId}
                onChange={(event) => syncQuery({ report: event.target.value, reportStudent: '' })}
              >
                {detailedAnalyses.map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {analysis.title}
                  </option>
                ))}
              </select>
              <select
                className="border-2 border-ink bg-paper px-3 py-2 text-sm"
                value={reportStudentId}
                onChange={(event) => syncQuery({ reportStudent: event.target.value })}
              >
                {reportStudents.map((student) => (
                  <option key={student.student.studentId} value={student.student.studentId}>
                    {student.student.name} · {student.student.studentId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {reportPayload ? (
            <div className="space-y-4">
              <div
                className="border-2 border-ink p-5 shadow-brutal-sm"
                style={{
                  background: `linear-gradient(135deg, ${reportPayload.branding.accentColor}22 0%, #fff 100%)`,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
                      {reportPayload.branding.brandName}
                    </div>
                    <div className="mt-2 font-display text-[28px] leading-tight">
                      {reportPayload.student.name}
                    </div>
                    <div className="text-sm text-ink-muted">
                      {reportPayload.analysisTitle} · {reportPayload.student.totalNet.toFixed(2)} net
                    </div>
                  </div>
                  <Tag color="paper" textColor="ink">
                    #{reportPayload.student.rank}/{reportPayload.student.totalStudents}
                  </Tag>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ReportHighlight label="Güçlü ders" value={reportPayload.summary.strongestCourse ?? '—'} />
                  <ReportHighlight
                    label="Odak dersi"
                    value={reportPayload.summary.needsAttentionCourse ?? '—'}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {reportPayload.courses.map((course) => (
                    <div key={course.name} className="flex items-center justify-between bg-paper px-3 py-2">
                      <span className="text-sm font-medium">{course.name}</span>
                      <span className="text-sm text-ink-muted">
                        {course.net.toFixed(2)} net · sınıf ort. {course.classAverageNet.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={createShare} disabled={sharing} className="gap-2">
                  <Link2 className="h-4 w-4" />
                  {sharing ? 'Hazırlanıyor…' : 'Paylaşım linki üret'}
                </Button>
                {shareUrl && (
                  <>
                    <Button variant="outline" onClick={copyShareLink} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Linki kopyala
                    </Button>
                    <ShareLinkActions
                      url={shareUrl}
                      studentName={reportPayload.student.name}
                    />
                    <a href={`${shareUrl}?print=1`} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="gap-2">
                        <Printer className="h-4 w-4" />
                        PDF / Yazdır
                      </Button>
                    </a>
                    <a href={shareUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Önizle
                      </Button>
                    </a>
                  </>
                )}
              </div>

              {shareUrl && (
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly />
                  <Button variant="ink" onClick={copyShareLink}>
                    Kopyala
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-ink p-6 text-sm text-ink-muted">
              Paylaşılabilir rapor için bir analiz ve öğrenci seçin.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-ink-muted">
        <BarChart3 className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-3 font-display text-[42px] leading-none">{value}</div>
    </Card>
  );
}

function MoverList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{
    studentId: string;
    name: string;
    previousNet: number;
    currentNet: number;
    deltaNet: number;
  }>;
}) {
  return (
    <div className="border-2 border-ink bg-cream p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-ink-muted">Karşılaştırılabilir ortak öğrenci henüz yok.</div>
        ) : (
          items.map((item) => (
            <div key={item.studentId} className="flex items-center justify-between gap-3 bg-paper px-3 py-2">
              <div>
                <Link
                  to={`/app/students/${encodeURIComponent(item.studentId)}`}
                  className="text-sm font-medium underline-offset-2 hover:text-primary hover:underline"
                >
                  {item.name}
                </Link>
                <div className="text-xs text-ink-muted">
                  {item.previousNet.toFixed(2)} → {item.currentNet.toFixed(2)}
                </div>
              </div>
              <Tag color={item.deltaNet >= 0 ? 'pop' : 'red-tint'} textColor="ink">
                {formatDelta(item.deltaNet)}
              </Tag>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ReportHighlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-ink bg-paper px-3 py-2">
      <div className="text-xs uppercase tracking-[0.08em] text-ink-muted">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}

function CompareSide({
  label,
  side,
  dateLabel,
  highlight,
}: {
  label: string;
  side: AnalysisComparisonSide;
  dateLabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-2 border-ink p-4 ${highlight ? 'bg-primary-tint' : 'bg-cream'}`}
    >
      <Eyebrow>— {label}</Eyebrow>
      <div className="mt-1 truncate font-display text-[20px] leading-tight">{side.title}</div>
      <div className="mb-3 text-xs text-ink-muted">{dateLabel}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <CompareStat label="Öğrenci" value={String(side.totalStudents)} />
        <CompareStat label="Değerl." value={String(side.evaluatedStudents)} />
        <CompareStat label="Ort. net" value={side.avgNetOverall.toFixed(2)} />
        <CompareStat label="Ders" value={String(side.courseCount)} />
      </div>
    </div>
  );
}

function CompareStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-ink bg-paper px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.08em] text-ink-muted">{label}</div>
      <div className="mt-0.5 font-bold">{value}</div>
    </div>
  );
}
