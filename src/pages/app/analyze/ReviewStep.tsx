import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Play, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { parseFile } from '@/core/parser';
import { getRequiredAnswerLength, mergeAnswerKeys } from '@/core/answerKeys';
import { getAnalysisStrategy } from '@/presets';
import { trackAnalysisCompleted, trackLimitReached } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { fetchProfile, incrementUsage, type Profile } from '@/lib/db';
import { requireSupabase, supabaseReady } from '@/lib/supabase';
import { getCurrentUsage, getLimit, isOverLimit } from '@/lib/usage';
import { errorMessage, messages } from '@/lib/messages';
import { ErrorCorrectionModal } from './ErrorCorrectionModal';
import type { AnswerKey, FormSettings, ParseResult } from '@/types/domain';

function parseFileWithManualAnswerKeys(
  raw: string,
  settings: FormSettings,
  manualAnswerKeys: AnswerKey[],
): ParseResult {
  const parsed = parseFile(raw, settings);

  return {
    ...parsed,
    answerKeys: mergeAnswerKeys(parsed.answerKeys, manualAnswerKeys),
  };
}

export function ReviewStep() {
  const {
    rawText,
    settings,
    manualAnswerKeys,
    parsed,
    selectedPreset,
    setParsed,
    setResult,
    setStep,
  } = useAnalyzeStore();
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (rawText && !parsed) {
      setParsed(parseFileWithManualAnswerKeys(rawText, settings, manualAnswerKeys));
    }
  }, [rawText, settings, manualAnswerKeys, parsed, setParsed]);

  useEffect(() => {
    if (!user || !supabaseReady) return;
    fetchProfile(user.id).then(setProfile).catch(() => {});
  }, [user]);

  const limit = profile ? getLimit(profile.plan) : null;
  const effectiveUsed = profile ? getCurrentUsage(profile) : 0;
  const overLimit = profile ? isOverLimit(profile) : false;

  const answerKeyWarnings = useMemo(() => {
    const requiredAnswerLength = getRequiredAnswerLength(settings);
    return mergeAnswerKeys(parsed?.answerKeys ?? [], manualAnswerKeys)
      .filter((key) => key.answers.length < requiredAnswerLength)
      .map((key) => ({
        booklet: key.booklet,
        actual: key.answers.length,
        expected: requiredAnswerLength,
      }));
  }, [manualAnswerKeys, parsed?.answerKeys, settings]);

  // Ctrl+Enter → run analysis
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const hasKeys = (parsed?.answerKeys.length ?? 0) > 0;
      if (
        e.key === 'Enter' &&
        (e.ctrlKey || e.metaKey) &&
        !running &&
        parsed &&
        hasKeys &&
        !overLimit &&
        answerKeyWarnings.length === 0
      ) {
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, parsed, overLimit, answerKeyWarnings.length]);

  const reparse = () => {
    if (!rawText) return;
    setParsed(parseFileWithManualAnswerKeys(rawText, settings, manualAnswerKeys));
  };

  const run = async () => {
    if (!parsed) return;
    if (overLimit) {
      toast.error('Aylık analiz hakkınız doldu. Planı yükseltin.');
      trackLimitReached(profile?.plan ?? 'free', effectiveUsed, limit ?? 0);
      return;
    }
    if (answerKeyWarnings.length > 0) {
      toast.error(messages.analysis.keyMissing);
      return;
    }
    setRunning(true);
    try {
      const missingBooklet = parsed.students.filter((s) => !s.booklet).length;
      const autoAssign =
        missingBooklet > parsed.students.length / 2 || parsed.answerKeys.length === 1;
      const strategy = getAnalysisStrategy(selectedPreset?.id);
      const result = strategy.analyze({
        students: parsed.students,
        answerKeys: parsed.answerKeys,
        settings,
        preset: selectedPreset ?? undefined,
        options: {
          autoAssignBookletsToA: autoAssign,
        },
      });
      setResult(result);
      if (user && supabaseReady) {
        incrementUsage(user.id)
          .then((p) => {
            if (!p) return;
            setProfile(p);
            // Fire usage-warning email if threshold just crossed (flag set by DB)
            if ((p as Profile & { usage_warning_sent?: boolean }).usage_warning_sent) {
              requireSupabase().functions.invoke('send-usage-warning', {}).catch(() => {});
            }
          })
          .catch(() => {});
      }
      trackAnalysisCompleted(parsed.students.length, settings.courses.length, result.excluded.length);
      setStep('result');
    } catch (e) {
      toast.error(errorMessage(e, messages.analysis.failed));
    } finally {
      setRunning(false);
    }
  };

  if (!parsed) {
    return <div className="text-sm text-ink-muted">Önizleme hazırlanıyor…</div>;
  }

  const keys = Array.from(new Set(parsed.answerKeys.map((k) => k.booklet.toUpperCase())));
  const issueCounts = parsed.issues.reduce<Record<string, number>>((acc, iss) => {
    acc[iss.type] = (acc[iss.type] ?? 0) + 1;
    return acc;
  }, {});
  const fixable =
    (issueCounts.invalid_student_id ?? 0) + (issueCounts.missing_booklet ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-[22px] leading-tight">Gözden geçir</div>
          <p className="mt-1 text-sm text-ink-muted">Analizi başlatmadan önce verilerin doğru okunduğundan emin ol.</p>
        </div>
        <Button variant="paper" size="sm" onClick={reparse}>
          Yeniden Oku
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Öğrenci" value={parsed.students.length} />
        <StatCard label="Cevap Anahtarı" value={keys.length} detail={keys.length ? keys.join(', ') : 'Yok'} />
        <StatCard label="Toplam Uyarı" value={parsed.issues.length} variant={parsed.issues.length ? 'warn' : 'ok'} />
      </div>

      {parsed.issues.length > 0 && (
        <div className="border-2 border-ink bg-pop p-4 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4" />
              Dikkat Edilmesi Gerekenler
            </div>
            {fixable > 0 && (
              <Button size="sm" variant="ink" onClick={() => setModalOpen(true)} className="gap-1">
                <Wrench className="h-3.5 w-3.5" />
                Düzelt ({fixable})
              </Button>
            )}
          </div>
          <ul className="space-y-1 text-xs">
            {issueCounts.missing_booklet && (
              <li>• {issueCounts.missing_booklet} satırda kitapçık türü boş. Gerekirse tek kitapçık modu uygulanır.</li>
            )}
            {issueCounts.invalid_student_id && (
              <li>• {issueCounts.invalid_student_id} satırda öğrenci numarası hatalı.</li>
            )}
            {issueCounts.duplicate_student_id && (
              <li>• {issueCounts.duplicate_student_id} mükerrer öğrenci numarası bulundu.</li>
            )}
            {issueCounts.short_line && <li>• {issueCounts.short_line} kısa/bozuk satır atlandı.</li>}
            {issueCounts.empty_answers && <li>• {issueCounts.empty_answers} satırda cevap alanı boş.</li>}
          </ul>
        </div>
      )}

      {keys.length === 0 && (
        <div className="border-2 border-destructive bg-destructive-tint p-4 text-sm text-destructive">
          <div className="font-bold">Cevap anahtarı bulunamadı.</div>
          <p className="mt-1">
            Anahtar satırı için öğrenci numarası alanının boş ya da sıfır, ad-soyad alanının da boş olması gerekir.
          </p>
          <p className="mt-1">
            Kolon eşleştirmeye dönüp başka bir `.txt` dosyasından anahtar yükleyebilir veya manuel cevap anahtarı girebilirsin.
          </p>
          <div className="mt-3">
            <Button size="sm" variant="ink" onClick={() => setStep('mapping')}>
              Anahtar Ekle →
            </Button>
          </div>
        </div>
      )}

      {answerKeyWarnings.length > 0 && (
        <div className="border-2 border-ink bg-pop p-4 text-sm">
          <div className="mb-1 font-bold">Cevap anahtarı eksik veya kısa görünüyor.</div>
          <ul className="space-y-1 text-xs">
            {answerKeyWarnings.map((warning) => (
              <li key={warning.booklet}>
                {warning.booklet} kitapçığı: {warning.actual}/{warning.expected} cevap girildi.
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            Analiz, yanlış net üretmemesi için durduruldu. Kolon eşleştirmeyi veya cevap anahtarı dosyasını kontrol edin.
          </p>
        </div>
      )}

      {overLimit && (
        <div className="border-2 border-destructive bg-destructive-tint p-4 text-sm">
          <div className="mb-2 font-bold">Aylık analiz hakkın doldu ({effectiveUsed}/{limit}).</div>
          <Link to="/app/billing">
            <Button size="sm" variant="ink">Planı Yükselt →</Button>
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="paper" onClick={() => setStep('courses')}>
          ← Geri
        </Button>
        <Button
          variant="ink"
          onClick={run}
          disabled={running || keys.length === 0 || overLimit || answerKeyWarnings.length > 0}
          className="gap-2"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Analizi Başlat
        </Button>
      </div>

      <ErrorCorrectionModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  variant = 'ok',
}: {
  label: string;
  value: number | string;
  detail?: string;
  variant?: 'ok' | 'warn';
}) {
  return (
    <div className="border-2 border-ink bg-paper p-4 shadow-brutal-xs">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
        {variant === 'ok' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        )}
        {label}
      </div>
      <div className="mt-2 font-display text-[32px] leading-tight">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-ink-muted">{detail}</div>}
    </div>
  );
}
