import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { Eyebrow } from '@/components/ui/brutal';
import { getPresetConfig } from '@/presets';
import { UploadStep } from './analyze/UploadStep';
import { MappingStep } from './analyze/MappingStep';
import { CoursesStep } from './analyze/CoursesStep';
import { ReviewStep } from './analyze/ReviewStep';
import { ResultStep } from './analyze/ResultStep';
import { WizardStepper } from './analyze/WizardStepper';

export function Analyze() {
  const [searchParams] = useSearchParams();
  const step = useAnalyzeStore((s) => s.step);
  const fileName = useAnalyzeStore((s) => s.fileName);
  const selectedPresetId = useAnalyzeStore((s) => s.selectedPresetId);
  const applyPreset = useAnalyzeStore((s) => s.applyPreset);
  const clearPreset = useAnalyzeStore((s) => s.clearPreset);
  const setStep = useAnalyzeStore((s) => s.setStep);

  useEffect(() => {
    const presetId = searchParams.get('preset');
    if (!presetId) return;

    const preset = getPresetConfig(presetId);
    if (!preset) {
      clearPreset();
      return;
    }

    if (selectedPresetId !== preset.id) {
      applyPreset(preset.id);
    }
  }, [applyPreset, clearPreset, searchParams, selectedPresetId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Skip if default already prevented (e.g. Radix dialog handled Esc)
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      const isFormField =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';

      // Ctrl/Cmd+Enter → advance. ReviewStep handles its own shortcut (analysis trigger).
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        if (step === 'upload' && fileName) {
          event.preventDefault();
          setStep('mapping');
        } else if (step === 'mapping') {
          event.preventDefault();
          setStep('courses');
        } else if (step === 'courses') {
          event.preventDefault();
          setStep('review');
        }
        return;
      }

      // Esc → go back. Let text fields keep native Esc (blur/clear behavior).
      if (event.key === 'Escape' && !isFormField) {
        if (step === 'mapping') {
          event.preventDefault();
          setStep('upload');
        } else if (step === 'courses') {
          event.preventDefault();
          setStep('mapping');
        } else if (step === 'review') {
          event.preventDefault();
          setStep('courses');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step, fileName, setStep]);

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>— Yeni Analiz</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(36px,4vw,48px)] leading-[1.02] tracking-[-0.02em]">
          Optik form analizi.
        </h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          Dosyayı yükle, yapılandır, sonucu al. İki dakika.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Kısayollar: <kbd className="border border-ink px-1">Ctrl</kbd>+<kbd className="border border-ink px-1">Enter</kbd> ilerle
          {' · '}<kbd className="border border-ink px-1">Esc</kbd> geri
          {step === 'courses' && (<> {' · '}<kbd className="border border-ink px-1">↑</kbd>/<kbd className="border border-ink px-1">↓</kbd> ders seç</>)}
        </p>
      </div>
      <WizardStepper current={step} />
      <div className="border-2 border-ink bg-paper p-6 shadow-brutal-sm">
        {step === 'upload' && <UploadStep />}
        {step === 'mapping' && <MappingStep />}
        {step === 'courses' && <CoursesStep />}
        {step === 'review' && <ReviewStep />}
        {step === 'result' && <ResultStep />}
      </div>
    </div>
  );
}
