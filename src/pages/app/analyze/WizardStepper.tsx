import { Check } from 'lucide-react';
import type { WizardStep } from '@/store/analyzeStore';
import { cn } from '@/lib/utils';

const steps: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Yükle' },
  { key: 'mapping', label: 'Kolon Eşleştir' },
  { key: 'courses', label: 'Dersler' },
  { key: 'review', label: 'Gözden Geçir' },
  { key: 'result', label: 'Sonuç' },
];

export function WizardStepper({ current }: { current: WizardStep }) {
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => {
        const state = i < idx ? 'done' : i === idx ? 'active' : 'todo';
        return (
          <li key={s.key} className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex items-center gap-2 border-2 border-ink px-3 py-1.5 text-xs font-bold uppercase tracking-[0.05em] transition-colors',
                state === 'active' && 'bg-ink text-white shadow-brutal-xs',
                state === 'done' && 'bg-success-tint text-ink',
                state === 'todo' && 'bg-paper text-ink-muted',
              )}
            >
              {state === 'done' ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="text-[10px]">{i + 1}</span>
              )}
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className="h-px w-4 bg-ink/30" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
