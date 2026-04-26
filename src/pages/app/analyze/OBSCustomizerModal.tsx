import { useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2 } from 'lucide-react';
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
  loadOBSConfig,
  mergeOBSConfig,
  saveOBSConfig,
  type OBSColumnConfig,
} from '@/lib/obs-config';
import type { FormSettings } from '@/types/domain';

interface OBSCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: FormSettings;
  analysisId?: string;
  exporting: boolean;
  onExport: (config: OBSColumnConfig[]) => Promise<void>;
}

export function OBSCustomizerModal({
  open,
  onOpenChange,
  settings,
  analysisId,
  exporting,
  onExport,
}: OBSCustomizerModalProps) {
  const [draft, setDraft] = useState<OBSColumnConfig[]>(() =>
    mergeOBSConfig(settings.courses, loadOBSConfig(analysisId)),
  );

  const move = (index: number, direction: -1 | 1) => {
    setDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const update = (courseId: string, patch: Partial<OBSColumnConfig>) => {
    setDraft((current) =>
      current.map((entry) => (entry.courseId === courseId ? { ...entry, ...patch } : entry)),
    );
  };

  const saveAndExport = async () => {
    const normalized = mergeOBSConfig(settings.courses, draft);
    saveOBSConfig(analysisId, normalized);
    await onExport(normalized);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>OBS kolonlarını düzenle</DialogTitle>
          <DialogDescription>
            Ders sırası, görünürlük ve aktarılacak değer bu cihazda tercih olarak saklanır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {draft.map((entry, index) => (
            <div
              key={entry.courseId}
              className="grid gap-3 border-2 border-ink bg-cream p-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <label className="flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={entry.visible}
                  onChange={(event) => update(entry.courseId, { visible: event.target.checked })}
                  className="h-4 w-4 accent-black"
                />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{entry.courseId}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-muted">
                    {entry.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {entry.visible ? 'Excelde görünür' : 'Gizli'}
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="paper"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  title="Yukarı taşı"
                  aria-label="Yukarı taşı"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="paper"
                  onClick={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  title="Aşağı taşı"
                  aria-label="Aşağı taşı"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 border-2 border-ink">
                <button
                  type="button"
                  onClick={() => update(entry.courseId, { metric: 'score' })}
                  className={`px-3 py-2 text-xs font-bold uppercase ${
                    entry.metric === 'score' ? 'bg-ink text-white' : 'bg-paper text-ink'
                  }`}
                >
                  Puan
                </button>
                <button
                  type="button"
                  onClick={() => update(entry.courseId, { metric: 'net' })}
                  className={`border-l-2 border-ink px-3 py-2 text-xs font-bold uppercase ${
                    entry.metric === 'net' ? 'bg-ink text-white' : 'bg-paper text-ink'
                  }`}
                >
                  Net
                </button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="paper" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button type="button" variant="ink" onClick={saveAndExport} disabled={exporting} className="gap-2">
            {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet ve Excel indir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
