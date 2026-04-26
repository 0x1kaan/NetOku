import { useMemo, useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getCourseAnswerRanges,
  getRequiredAnswerLength,
  normalizeAnswerKeys,
} from '@/core/answerKeys';
import type { AnswerKey, FormSettings } from '@/types/domain';

const BOOKLETS = ['A', 'B', 'C', 'D', 'E'];

interface AnswerKeyEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  answerKeys: AnswerKey[];
  settings: FormSettings;
  onApply: (answerKeys: AnswerKey[]) => void;
}

function sanitizeCourseAnswers(value: string): string {
  return value.toUpperCase().replace(/[^A-E*]/g, '');
}

function readCourseAnswers(answerKey: AnswerKey, start: number, length: number): string {
  return answerKey.answers.slice(start, start + length).replace(/\s/g, '');
}

function writeCourseAnswers(
  answerKey: AnswerKey,
  start: number,
  length: number,
  value: string,
  requiredLength: number,
): AnswerKey {
  const next = answerKey.answers.padEnd(requiredLength, ' ').split('');
  const sanitized = sanitizeCourseAnswers(value).slice(0, length);
  const padded = sanitized.padEnd(length, ' ');
  for (let index = 0; index < length; index += 1) {
    next[start + index] = padded[index];
  }

  return {
    ...answerKey,
    answers: next.join('').replace(/\s+$/, ''),
  };
}

export function AnswerKeyEditorModal({
  open,
  onOpenChange,
  answerKeys,
  settings,
  onApply,
}: AnswerKeyEditorModalProps) {
  const ranges = useMemo(() => getCourseAnswerRanges(settings), [settings]);
  const requiredLength = useMemo(() => getRequiredAnswerLength(settings), [settings]);
  const [draft, setDraft] = useState<AnswerKey[]>(() => {
    const normalized = normalizeAnswerKeys(answerKeys);
    return normalized.length > 0
      ? normalized
      : [{ booklet: 'A', answers: ''.padEnd(requiredLength, ' ') }];
  });

  const usedBooklets = new Set(draft.map((key) => key.booklet));
  const nextBooklet = BOOKLETS.find((booklet) => !usedBooklets.has(booklet)) ?? null;
  const incomplete = draft.some((key) =>
    ranges.some((range) => readCourseAnswers(key, range.start, range.length).length < range.length),
  );

  const updateKey = (booklet: string, rangeIndex: number, value: string) => {
    const range = ranges[rangeIndex];
    if (!range) return;
    setDraft((current) =>
      current.map((key) =>
        key.booklet === booklet
          ? writeCourseAnswers(key, range.start, range.length, value, requiredLength)
          : key,
      ),
    );
  };

  const addBooklet = () => {
    if (!nextBooklet) return;
    setDraft((current) => [
      ...current,
      { booklet: nextBooklet, answers: ''.padEnd(requiredLength, ' ') },
    ]);
  };

  const removeBooklet = (booklet: string) => {
    setDraft((current) => current.filter((key) => key.booklet !== booklet));
  };

  const apply = () => {
    if (incomplete) return;
    onApply(normalizeAnswerKeys(draft));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Cevap anahtarını düzenle
          </DialogTitle>
          <DialogDescription>
            Kitapçık cevaplarını düzelt; kaydedince analiz aynı öğrenci verisiyle yeniden hesaplanır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {draft.map((answerKey) => (
            <div key={answerKey.booklet} className="border-2 border-ink bg-cream p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-[24px] leading-tight">
                  Kitapçık {answerKey.booklet}
                </div>
                {draft.length > 1 && (
                  <Button
                    type="button"
                    variant="paper"
                    size="sm"
                    onClick={() => removeBooklet(answerKey.booklet)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </Button>
                )}
              </div>

              <div className="grid gap-3">
                {ranges.map((range, index) => {
                  const value = readCourseAnswers(answerKey, range.start, range.length);
                  const complete = value.length === range.length;
                  return (
                    <label key={`${answerKey.booklet}-${range.courseName}`} className="grid gap-1">
                      <span className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">
                        <span>{range.courseName}</span>
                        <span className={complete ? 'text-success' : 'text-destructive'}>
                          {value.length}/{range.length}
                        </span>
                      </span>
                      <input
                        value={value}
                        maxLength={range.length}
                        onChange={(event) => updateKey(answerKey.booklet, index, event.target.value)}
                        className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm tracking-[0.08em]"
                        spellCheck={false}
                        aria-label={`${answerKey.booklet} ${range.courseName} cevapları`}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="paper" onClick={addBooklet} disabled={!nextBooklet} className="gap-2">
            <Plus className="h-4 w-4" />
            Kitapçık ekle
          </Button>
          <Button type="button" variant="paper" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button type="button" variant="ink" onClick={apply} disabled={incomplete}>
            Yeniden hesapla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

