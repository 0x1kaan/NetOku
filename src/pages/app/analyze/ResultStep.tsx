import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Copy,
  Download,
  KeyRound,
  Loader2,
  RefreshCw,
  School,
  Settings as SettingsIcon,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ShareLinkActions } from '@/components/ShareLinkActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
const loadExcel = () => import('@/core/excel');
import { trackObsExported, trackPresetSaved, trackReportDownloaded } from '@/lib/analytics';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { useAuth } from '@/lib/auth';
import {
  createPreset,
  createStudentReportShare,
  fetchProfile,
  listStudentReportShares,
  revokeStudentReportShare,
  saveAnalysis,
  type AnalysisRecord,
  type Profile,
  type StudentReportShareRecord,
} from '@/lib/db';
import { getTeamInfo, type TeamInfo } from '@/lib/team';
import { buildStudentReportPayload, type ReportBranding } from '@/lib/reports';
import { supabaseReady } from '@/lib/supabase';
import { errorMessage, messages } from '@/lib/messages';
import type { OBSColumnConfig } from '@/lib/obs-config';
import type { AnswerKey } from '@/types/domain';
import { getAnalysisStrategy } from '@/presets';
import { ShareReportModal } from './ShareReportModal';
import { QuestionBreakdown } from './QuestionBreakdown';
import { OBSCustomizerModal } from './OBSCustomizerModal';
import { AnswerKeyEditorModal } from './AnswerKeyEditorModal';

export function ResultStep() {
  const { result, settings, fileName, reset, selectedPreset, setResult } = useAnalyzeStore();
  const { user } = useAuth();
  const [activeCourse, setActiveCourse] = useState(0);
  const [activeView, setActiveView] = useState<'students' | 'questions'>('students');
  const [downloading, setDownloading] = useState(false);
  const [downloadingObs, setDownloadingObs] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedRecord, setSavedRecord] = useState<AnalysisRecord | null>(null);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [shares, setShares] = useState<StudentReportShareRecord[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [keyEditorOpen, setKeyEditorOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);
  const [bulkSharing, setBulkSharing] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!user || !supabaseReady) return;
    fetchProfile(user.id).then(setProfile).catch(() => {});
    getTeamInfo().then(setTeam).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!savedRecord || !supabaseReady) return;
    listStudentReportShares(savedRecord.id)
      .then(setShares)
      .catch(() => {});
  }, [savedRecord]);

  const branding: ReportBranding = useMemo(
    () => ({
      brandName: team?.org.brand_name || team?.org.name || 'NetOku',
      logoUrl: team?.org.logo_url ?? null,
      primaryColor: team?.org.brand_primary_color ?? '#0F172A',
      accentColor: team?.org.brand_accent_color ?? '#F4D35E',
    }),
    [team],
  );

  const sharesByStudentId = useMemo(() => {
    const map = new Map<string, StudentReportShareRecord>();
    shares.forEach((share) => {
      if (!map.has(share.student_id)) {
        map.set(share.student_id, share);
      }
    });
    return map;
  }, [shares]);

  const stats = useMemo(() => result?.courseStats ?? [], [result]);
  const answerKeyBooklets = useMemo(
    () =>
      Array.from(
        new Set((result?.answerKeys ?? []).map((answerKey) => answerKey.booklet.toUpperCase())),
      ),
    [result],
  );
  const analysisVisibility =
    profile?.plan === 'school' && profile.organization_id ? 'organization' : 'private';

  useEffect(() => {
    if (savedRef.current || !result || !user || !supabaseReady || !profile) return;
    savedRef.current = true;
    saveAnalysis({
      userId: user.id,
      organizationId: analysisVisibility === 'organization' ? profile.organization_id : null,
      visibility: analysisVisibility,
      title: (fileName ?? 'Analiz').replace(/\.txt$/i, ''),
      fileName: fileName ?? null,
      settings,
      analysis: result,
    })
      .then(setSavedRecord)
      .catch((e) => {
      savedRef.current = false;
      toast.error(e instanceof Error ? `Geçmişe kaydedilemedi: ${e.message}` : 'Geçmişe kaydedilemedi.');
    });
  }, [result, user, fileName, settings, profile, analysisVisibility]);

  const isPro = profile?.plan === 'pro' || profile?.plan === 'school';
  const questionRecord = useMemo(() => ({ result }), [result]);

  const openShareModal = useCallback(
    (studentId: string, studentName: string) => {
      if (!isPro) {
        toast.error('Paylaşım linki Pro ve School planlarında kullanılabilir.');
        return;
      }
      if (!savedRecord) {
        toast.error('Analiz kaydedilene kadar bekleyin.');
        return;
      }
      setShareTarget({ id: studentId, name: studentName });
      setShareModalOpen(true);
    },
    [isPro, savedRecord],
  );

  const onShareCreated = useCallback((share: StudentReportShareRecord) => {
    setShares((prev) => [share, ...prev.filter((existing) => existing.id !== share.id)]);
  }, []);

  const onShareRevoked = useCallback((shareId: string) => {
    setShares((prev) => prev.filter((existing) => existing.id !== shareId));
  }, []);

  const copyShareUrl = useCallback(async (share: StudentReportShareRecord) => {
    const url = `${window.location.origin}/report/${share.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link kopyalandı.');
    } catch {
      toast.error('Link kopyalanamadı.');
    }
  }, []);

  const revokeShare = useCallback(
    async (share: StudentReportShareRecord) => {
      try {
        await revokeStudentReportShare(share.id);
        onShareRevoked(share.id);
        toast.success('Paylaşım iptal edildi.');
      } catch (error) {
        toast.error(errorMessage(error, 'Paylaşım iptal edilemedi.'));
      }
    },
    [onShareRevoked],
  );

  const reanalyzeWithAnswerKeys = useCallback(
    (answerKeys: AnswerKey[]) => {
      if (!result) return;
      const studentRows = [...result.students, ...result.excluded]
        .sort((left, right) => left.student.lineNumber - right.student.lineNumber)
        .map((studentResult) => studentResult.student);
      const missingBooklet = studentRows.filter((student) => !student.booklet).length;
      const autoAssign =
        result.meta.bookletsAutoAssigned ||
        answerKeys.length === 1 ||
        missingBooklet > studentRows.length / 2;
      const strategy = getAnalysisStrategy(selectedPreset?.id);
      const nextResult = strategy.analyze({
        students: studentRows,
        answerKeys,
        settings,
        preset: selectedPreset ?? undefined,
        options: {
          autoAssignBookletsToA: autoAssign,
        },
      });

      savedRef.current = false;
      setSavedRecord(null);
      setShares([]);
      setShareTarget(null);
      setShareModalOpen(false);
      setResult(nextResult);
      toast.success('Cevap anahtarı güncellendi. Analiz yeniden hesaplandı.');
    },
    [result, selectedPreset, setResult, settings],
  );

  const bulkShare = useCallback(async () => {
    if (!isPro || !user || !result || !savedRecord) return;
    const studentsToShare = result.students.filter(
      (studentResult) => !sharesByStudentId.has(studentResult.student.studentId),
    );
    if (studentsToShare.length === 0) {
      toast.info('Tüm öğrencilerin zaten aktif paylaşım linki var.');
      return;
    }
    setBulkSharing(true);
    const created: StudentReportShareRecord[] = [];
    let failures = 0;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    for (const studentResult of studentsToShare) {
      try {
        const payload = buildStudentReportPayload({
          record: savedRecord,
          studentId: studentResult.student.studentId,
          branding,
        });
        if (!payload) {
          failures += 1;
          continue;
        }
        const share = await createStudentReportShare({
          analysisId: savedRecord.id,
          organizationId: savedRecord.organization_id,
          createdBy: user.id,
          studentId: payload.student.id,
          studentName: payload.student.name,
          reportPayload: payload,
          expiresAt,
        });
        created.push(share);
      } catch {
        failures += 1;
      }
    }
    if (created.length > 0) {
      setShares((prev) => [...created, ...prev]);
      const allShares = [...created, ...shares];
      const csvRows = ['Öğrenci No,Ad Soyad,Paylaşım Linki,Geçerli Tarih'];
      result.students.forEach((studentResult) => {
        const share = allShares.find(
          (item) => item.student_id === studentResult.student.studentId,
        );
        if (!share) return;
        const url = `${window.location.origin}/report/${share.share_token}`;
        const expires = share.expires_at
          ? new Date(share.expires_at).toLocaleDateString('tr-TR')
          : 'Süresiz';
        const safeName = studentResult.student.name.replace(/,/g, ' ');
        csvRows.push(`${studentResult.student.studentId},${safeName},${url},${expires}`);
      });
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const base = (fileName ?? 'sinav').replace(/\.txt$/i, '');
      anchor.download = `${base}_paylasim_linkleri.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    }
    if (failures === 0) {
      toast.success(`${created.length} öğrenci için link oluşturuldu. CSV indirildi.`);
    } else {
      toast.warning(`${created.length} oluşturuldu, ${failures} başarısız. CSV oluşturulanları içeriyor.`);
    }
    setBulkSharing(false);
  }, [isPro, user, result, savedRecord, sharesByStudentId, branding, shares, fileName]);

  const download = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const { buildWorkbook, downloadWorkbook } = await loadExcel();
      const blob = await buildWorkbook(result, settings, {
        title: fileName ?? 'sinav.txt',
        createdAt: new Date(),
      });
      const base = (fileName ?? 'sinav').replace(/\.txt$/i, '');
      downloadWorkbook(blob, `${base}_analiz.xlsx`);
      trackReportDownloaded();
    } catch (error) {
      toast.error(errorMessage(error, messages.analysis.excelExportFailed));
    } finally {
      setDownloading(false);
    }
  }, [result, settings, fileName]);

  const downloadObs = useCallback(async (obsConfig?: OBSColumnConfig[]) => {
    if (!result || !isPro) return;
    setDownloadingObs(true);
    try {
      const { buildObsWorkbook, downloadWorkbook } = await loadExcel();
      const blob = await buildObsWorkbook(result, settings, {
        title: fileName ?? 'sinav.txt',
        createdAt: new Date(),
      }, obsConfig);
      const base = (fileName ?? 'sinav').replace(/\.txt$/i, '');
      downloadWorkbook(blob, `${base}_obs.xlsx`);
      trackObsExported(obsConfig?.filter((entry) => entry.visible).length ?? settings.courses.length);
    } catch (error) {
      toast.error(errorMessage(error, messages.analysis.obsExportFailed));
    } finally {
      setDownloadingObs(false);
    }
  }, [result, settings, fileName, isPro]);

  const savePreset = useCallback(async () => {
    if (!user || !presetName.trim()) return;
    setSavingPreset(true);
    try {
      await createPreset({
        userId: user.id,
        name: presetName.trim(),
        settings,
        scope: analysisVisibility,
        organizationId: analysisVisibility === 'organization' ? profile?.organization_id : null,
      });
      toast.success(`"${presetName}" preset olarak kaydedildi.`);
      trackPresetSaved();
      setPresetName('');
    } catch (e) {
      toast.error(errorMessage(e, messages.presets.saveFailed));
    } finally {
      setSavingPreset(false);
    }
  }, [user, presetName, settings, analysisVisibility, profile]);

  // Ctrl+Shift+D → download Excel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'D' && (e.ctrlKey || e.metaKey) && e.shiftKey && !downloading) {
        e.preventDefault();
        download();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [downloading, download]);

  if (!result) {
    return <div className="text-sm text-ink-muted">Sonuç bulunamadı.</div>;
  }

  const course = settings.courses[activeCourse];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-[22px] leading-tight">Sonuçlar hazır</div>
          <p className="mt-1 text-sm text-ink-muted">
            {result.students.length} öğrenci değerlendirildi.
            {result.excluded.length > 0 && ` ${result.excluded.length} öğrenci değerlendirme dışı.`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="paper" onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Yeni analiz
          </Button>
          <Button variant="paper" onClick={() => setKeyEditorOpen(true)} className="gap-2">
            <KeyRound className="h-4 w-4" />
            Anahtarı Düzenle
          </Button>
          {isPro ? (
            <Button
              variant="paper"
              onClick={() => setObsModalOpen(true)}
              disabled={downloadingObs}
              className="gap-2"
            >
              {downloadingObs ? <Loader2 className="h-4 w-4 animate-spin" /> : <SettingsIcon className="h-4 w-4" />}
              OBS Aktar
            </Button>
          ) : (
            <Link to="/app/billing">
              <Button variant="paper" className="gap-2 opacity-60" title="Pro plana geç">
                <School className="h-4 w-4" />
                OBS Aktar <span className="ml-1 border border-ink px-1 py-0.5 text-[9px] font-bold uppercase">Pro</span>
              </Button>
            </Link>
          )}
          {isPro ? (
            <Button
              variant="paper"
              onClick={bulkShare}
              disabled={bulkSharing || !savedRecord}
              className="gap-2"
              title="Tüm öğrenciler için 30 günlük link + CSV indir"
            >
              {bulkSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Toplu Paylaşım
            </Button>
          ) : (
            <Link to="/app/billing">
              <Button variant="paper" className="gap-2 opacity-60" title="Pro plana geç">
                <Share2 className="h-4 w-4" />
                Toplu Paylaşım <span className="ml-1 border border-ink px-1 py-0.5 text-[9px] font-bold uppercase">Pro</span>
              </Button>
            </Link>
          )}
          <Button variant="ink" onClick={download} disabled={downloading} className="gap-2" title="Ctrl+Shift+D">
            <Download className="h-4 w-4" />
            Excel indir
          </Button>
        </div>
      </div>

      {savedRecord && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-success-tint p-3 text-sm">
          <div>
            <div className="font-bold">
              {analysisVisibility === 'organization'
                ? 'Analiz kurum arşivine kaydedildi.'
                : 'Analiz kişisel arşive kaydedildi.'}
            </div>
            <div className="text-ink-muted">
              Gelişim takibi, karşılaştırma ve veli raporu için veri hazır.
            </div>
          </div>
          <Link to={`/app/insights?report=${savedRecord.id}`}>
            <Button variant="ink" className="gap-2">
              İçgörülere git
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {(answerKeyBooklets.length > 0 || result.meta.bookletsAutoAssigned || result.meta.invalidStudentIds > 0) && (
        <div className="grid gap-3 md:grid-cols-3">
          {answerKeyBooklets.length > 0 && (
            <SummaryNote
              label="Cevap anahtarlari"
              value={answerKeyBooklets.join(', ')}
              detail={`${answerKeyBooklets.length} kitapcik algilandi`}
            />
          )}
          {result.meta.bookletsAutoAssigned && (
            <SummaryNote
              label="Kitapcik modu"
              value="Otomatik atandi"
              detail="Bos kitapciklar tek mevcut anahtarla degerlendirildi."
              tone="warn"
            />
          )}
          {result.meta.invalidStudentIds > 0 && (
            <SummaryNote
              label="Hatali numara"
              value={result.meta.invalidStudentIds}
              detail="Excel raporunda isaretlendi."
              tone="warn"
            />
          )}
        </div>
      )}

      {user && supabaseReady && (
        <div className="flex flex-wrap items-end gap-2 border-2 border-ink bg-primary-tint p-4">
          <div className="grow">
            <label className="text-xs font-bold uppercase tracking-[0.05em]" htmlFor="preset-name">
              Bu yapılandırmayı preset olarak kaydet
            </label>
            <p className="mb-2 mt-1 text-xs text-ink-muted">
              {analysisVisibility === 'organization'
                ? 'School planında bu preset kurum kütüphanesinde de görünür.'
                : 'Bu preset sadece senin hesabında görünür.'}
            </p>
            <Input
              id="preset-name"
              placeholder="Örn. 5 ders TYT şablonu"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && presetName.trim()) savePreset();
              }}
            />
          </div>
          <Button
            variant="ink"
            onClick={savePreset}
            disabled={savingPreset || !presetName.trim()}
            className="gap-2"
          >
            <Bookmark className="h-4 w-4" />
            Kaydet
          </Button>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Öğrenci" value={result.students.length} icon={<Users className="h-4 w-4" />} />
        {stats.map((stat, index) => (
          <Stat
            key={stat.courseName + index}
            label={settings.courses[index]?.name ?? `Ders ${index + 1}`}
            value={`Ort. ${stat.avgNet.toFixed(2)} net`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-b-2 border-ink pb-2">
        <button
          type="button"
          onClick={() => setActiveView('students')}
          className={`border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
            activeView === 'students'
              ? 'bg-ink text-white shadow-brutal-xs'
              : 'bg-paper text-ink hover:bg-ink/5'
          }`}
        >
          Öğrenci Sonuçları
        </button>
        <button
          type="button"
          onClick={() => setActiveView('questions')}
          className={`border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
            activeView === 'questions'
              ? 'bg-ink text-white shadow-brutal-xs'
              : 'bg-paper text-ink hover:bg-ink/5'
          }`}
        >
          Soru Analizi
          {!isPro && <span className="ml-2 border border-current px-1 py-0.5 text-[9px]">Pro</span>}
        </button>
      </div>

      {activeView === 'students' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {settings.courses.map((item, index) => (
              <button
                key={item.name + index}
                type="button"
                onClick={() => setActiveCourse(index)}
                className={`border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
                  index === activeCourse
                    ? 'bg-ink text-white shadow-brutal-xs'
                    : 'bg-paper text-ink hover:bg-ink/5'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          <VirtualStudentTable
            students={result.students}
            activeCourse={activeCourse}
            showPoints={course?.points !== undefined}
            sharesByStudentId={sharesByStudentId}
            onShareClick={isPro && savedRecord ? openShareModal : null}
          />

          {isPro && shares.length > 0 && (
            <ActiveSharesPanel
              shares={shares}
              onCopy={copyShareUrl}
              onRevoke={revokeShare}
            />
          )}
        </>
      ) : (
        <QuestionBreakdown record={questionRecord} settings={settings} isPro={isPro} />
      )}

      {isPro && obsModalOpen && (
        <OBSCustomizerModal
          open={obsModalOpen}
          onOpenChange={setObsModalOpen}
          settings={settings}
          analysisId={savedRecord?.id ?? fileName ?? undefined}
          exporting={downloadingObs}
          onExport={downloadObs}
        />
      )}

      {keyEditorOpen && (
        <AnswerKeyEditorModal
          open={keyEditorOpen}
          onOpenChange={setKeyEditorOpen}
          answerKeys={result.answerKeys ?? []}
          settings={settings}
          onApply={reanalyzeWithAnswerKeys}
        />
      )}

      {shareTarget && user && (
        <ShareReportModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          studentId={shareTarget.id}
          studentName={shareTarget.name}
          record={savedRecord}
          branding={branding}
          userId={user.id}
          existingShare={sharesByStudentId.get(shareTarget.id) ?? null}
          onShareCreated={onShareCreated}
          onShareRevoked={onShareRevoked}
        />
      )}

      {result.excluded.length > 0 && (
        <div className="border-2 border-ink bg-pop p-4 text-sm">
          <div className="font-bold">Değerlendirme dışı ({result.excluded.length})</div>
          <ul className="mt-2 space-y-1 text-xs">
            {result.excluded.map((excludedStudent) => (
              <li key={`${excludedStudent.student.lineNumber}-${excludedStudent.student.studentId}`}>
                {excludedStudent.student.name} ({excludedStudent.student.studentId || '-'}) —{' '}
                {excludedStudent.exclusionReason ?? 'Belirtilmedi'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActiveSharesPanel({
  shares,
  onCopy,
  onRevoke,
}: {
  shares: StudentReportShareRecord[];
  onCopy: (share: StudentReportShareRecord) => void;
  onRevoke: (share: StudentReportShareRecord) => void;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleRevoke = async (share: StudentReportShareRecord) => {
    setRevoking(share.id);
    try {
      await onRevoke(share);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="border-2 border-ink bg-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em]">
          <Share2 className="h-4 w-4" />
          Aktif Paylaşımlar ({shares.length})
        </div>
        <div className="text-[10px] text-ink-muted">Sadece sen görüyorsun</div>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {shares.map((share) => {
          const expiresLabel = share.expires_at
            ? `${new Date(share.expires_at).toLocaleDateString('tr-TR')} tarihinde sona erer`
            : 'Süresiz';
          return (
            <div
              key={share.id}
              className="flex flex-wrap items-center justify-between gap-2 border-2 border-ink/20 bg-cream p-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{share.student_name}</div>
                <div className="text-[10px] text-ink-muted">
                  {share.student_id} · {expiresLabel}
                </div>
              </div>
              <div className="flex gap-1">
                <ShareLinkActions
                  url={`${window.location.origin}/report/${share.share_token}`}
                  studentName={share.student_name}
                  compact
                />
                <button
                  type="button"
                  onClick={() => onCopy(share)}
                  className="border-2 border-ink bg-paper p-1.5 hover:bg-ink/5"
                  title="Linki kopyala"
                  aria-label="Linki kopyala"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRevoke(share)}
                  disabled={revoking === share.id}
                  className="border-2 border-ink bg-paper p-1.5 hover:bg-destructive hover:text-white"
                  title="Paylaşımı iptal et"
                  aria-label="Paylaşımı iptal et"
                >
                  {revoking === share.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="border-2 border-ink bg-paper p-3 shadow-brutal-xs">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-[22px] leading-tight">{value}</div>
    </div>
  );
}

function SummaryNote({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className={`border-2 border-ink p-3 text-sm shadow-brutal-xs ${
      tone === 'warn' ? 'bg-pop' : 'bg-paper'
    }`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">{label}</div>
      <div className="mt-2 font-display text-[20px] leading-tight">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{detail}</div>
    </div>
  );
}

type StudentResultRow = NonNullable<
  ReturnType<typeof useAnalyzeStore.getState>['result']
>['students'][number];

const ROW_HEIGHT = 40;
const MAX_LIST_HEIGHT = 560;

function VirtualStudentTable({
  students,
  activeCourse,
  showPoints,
  sharesByStudentId,
  onShareClick,
}: {
  students: StudentResultRow[];
  activeCourse: number;
  showPoints: boolean;
  sharesByStudentId: Map<string, StudentReportShareRecord>;
  onShareClick: ((studentId: string, studentName: string) => void) | null;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const visibleStudents = useMemo(
    () => students.filter((s) => s.courses[activeCourse]),
    [students, activeCourse],
  );

  const virtualizer = useVirtualizer({
    count: visibleStudents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  const showShareColumn = onShareClick !== null;
  const gridTemplate = (() => {
    const base = ['minmax(160px,1fr)', '120px', '48px', '48px', '48px', '48px', '72px'];
    if (showPoints) base.push('72px');
    if (showShareColumn) base.push('44px');
    return base.join(' ');
  })();

  const items = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const listHeight = Math.min(totalSize, MAX_LIST_HEIGHT);

  return (
    <div className="border-2 border-ink">
      <div
        className="grid items-center bg-ink px-3 py-2 text-xs uppercase tracking-[0.06em] text-white"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div className="font-bold">Ad Soyad</div>
        <div className="font-bold">No</div>
        <div className="text-center font-bold" title="Kitapçık">K</div>
        <div className="text-center font-bold" title="Doğru">D</div>
        <div className="text-center font-bold" title="Yanlış">Y</div>
        <div className="text-center font-bold" title="Boş">B</div>
        <div className="text-right font-bold">Net</div>
        {showPoints && <div className="text-right font-bold">Puan</div>}
        {showShareColumn && <div className="text-center font-bold" title="Paylaş"></div>}
      </div>
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: `${listHeight}px`, maxHeight: `${MAX_LIST_HEIGHT}px` }}
        role="list"
        aria-label="Öğrenci sonuçları"
      >
        <div style={{ height: `${totalSize}px`, position: 'relative' }}>
          {items.map((virtualRow) => {
            const studentResult = visibleStudents[virtualRow.index];
            const courseResult = studentResult.courses[activeCourse];
            if (!courseResult) return null;
            return (
              <div
                key={`${studentResult.student.lineNumber}-${studentResult.student.studentId}-${courseResult.courseName}`}
                role="listitem"
                className={`grid items-center border-t-2 border-ink/10 px-3 text-sm ${
                  virtualRow.index % 2 === 1 ? 'bg-cream' : 'bg-paper'
                }`}
                style={{
                  gridTemplateColumns: gridTemplate,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="truncate">{studentResult.student.name}</div>
                <div className="truncate font-mono text-xs">{studentResult.student.studentId}</div>
                <div className="text-center">{studentResult.booklet || '-'}</div>
                <div className="text-center font-bold text-success">{courseResult.correct}</div>
                <div className="text-center font-bold text-destructive">{courseResult.wrong}</div>
                <div className="text-center text-ink-muted">{courseResult.empty}</div>
                <div className="text-right font-bold">{courseResult.net.toFixed(2)}</div>
                {showPoints && <div className="text-right">{courseResult.score.toFixed(2)}</div>}
                {showShareColumn && onShareClick && (
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        onShareClick(
                          studentResult.student.studentId,
                          studentResult.student.name,
                        )
                      }
                      className={`p-1 transition-colors ${
                        sharesByStudentId.has(studentResult.student.studentId)
                          ? 'text-primary'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                      title={
                        sharesByStudentId.has(studentResult.student.studentId)
                          ? 'Aktif paylaşım var — düzenle'
                          : 'Paylaşım linki oluştur'
                      }
                      aria-label="Paylaşım linki"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t-2 border-ink/20 bg-paper px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        {visibleStudents.length} öğrenci • sanallaştırıldı
      </div>
    </div>
  );
}
