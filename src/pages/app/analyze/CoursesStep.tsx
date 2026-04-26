import { useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeStore } from '@/store/analyzeStore';
import type { CourseConfig } from '@/types/domain';

export function CoursesStep() {
  const { settings, selectedPreset, patchSettings, setStep } = useAnalyzeStore();
  const nameInputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const maxCourses = selectedPreset?.maxSubjects ?? 5;
  const lockSubjectCount = selectedPreset?.form.lockSubjectCount ?? false;
  const allowQuestionEdit = selectedPreset?.form.allowQuestionEdit ?? true;
  const allowPointEdit = selectedPreset?.form.allowPointEdit ?? true;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const target = event.target as HTMLElement | null;
      const index = nameInputsRef.current.findIndex((el) => el === target);
      if (index === -1) return;
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (index + delta + settings.courses.length) % settings.courses.length;
      nameInputsRef.current[nextIndex]?.focus();
      nameInputsRef.current[nextIndex]?.select();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [settings.courses.length]);

  const updateCourse = (index: number, patch: Partial<CourseConfig>) => {
    const next = settings.courses.map((course, i) =>
      i === index ? { ...course, ...patch } : course,
    );
    patchSettings({ courses: next });
  };

  const addCourse = () => {
    if (lockSubjectCount || settings.courses.length >= maxCourses) return;
    patchSettings({
      courses: [
        ...settings.courses,
        { name: `Ders ${settings.courses.length + 1}`, questionCount: 20 },
      ],
    });
  };

  const removeCourse = (index: number) => {
    if (lockSubjectCount || settings.courses.length <= 1) return;
    patchSettings({ courses: settings.courses.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display text-[22px] leading-tight">Ders yapilandirmasi</div>
        <p className="mt-1 text-sm text-ink-muted">
          {lockSubjectCount
            ? `${settings.courses.length} ders bu preset icin sabit.`
            : `En fazla ${maxCourses} ders.`}{' '}
          Offset bos birakilirsa dersler sirayla dizilir.
        </p>
      </div>

      <div className="space-y-3">
        {settings.courses.map((course, i) => (
          <div key={`${course.name}-${i}`} className="border-2 border-ink p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">Ders {i + 1}</div>
              {!lockSubjectCount && settings.courses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCourse(i)}
                  className="p-1 text-ink-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Ders Adi</Label>
                <Input
                  ref={(el) => {
                    nameInputsRef.current[i] = el;
                  }}
                  value={course.name}
                  onChange={(e) => updateCourse(i, { name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Soru Sayisi</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedPreset?.courses[i]?.maxQuestions}
                  disabled={!allowQuestionEdit}
                  value={course.questionCount}
                  onChange={(e) => updateCourse(i, { questionCount: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Puan (opsiyonel)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  disabled={!allowPointEdit}
                  value={course.points ?? ''}
                  placeholder="Net x puan"
                  onChange={(e) =>
                    updateCourse(i, {
                      points: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Baslangic Kolonu (opsiyonel)</Label>
                <Input
                  type="number"
                  min={0}
                  value={course.startOffset ?? ''}
                  placeholder="Otomatik"
                  onChange={(e) =>
                    updateCourse(i, {
                      startOffset: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!lockSubjectCount && settings.courses.length < maxCourses && (
        <Button variant="ink" onClick={addCourse} className="gap-2">
          <Plus className="h-4 w-4" />
          Ders Ekle
        </Button>
      )}

      <div className="flex items-center justify-between">
        <Button variant="paper" onClick={() => setStep('mapping')}>
          &lt;- Geri
        </Button>
        <Button variant="ink" onClick={() => setStep('review')}>Gozden Gecir -&gt;</Button>
      </div>
    </div>
  );
}
