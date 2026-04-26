import { useCallback, useState } from 'react';
import { FileUp, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { inferSettingsFromText } from '@/core/inferSettings';
import { trackFileUploaded } from '@/lib/analytics';
import { readCp1254TextFile } from '@/lib/fileEncoding';

export function UploadStep() {
  const { fileName, settings, setFile, setSettings, setStep } = useAnalyzeStore();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.txt')) {
        toast.error('Lütfen .txt uzantılı bir dosya yükleyin.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Dosya boyutu 20 MB'yi aşamaz.");
        return;
      }
      setLoading(true);
      try {
        const text = await readCp1254TextFile(file);
        const inferred = inferSettingsFromText(text, settings);
        setFile(file.name, text);
        if (inferred.applied) {
          setSettings(inferred.settings);
          toast.success('Kolonlar ve ders blokları otomatik dolduruldu.');
        } else {
          toast.info('Dosya okundu. Kolonları gözden geçirerek devam edebilirsin.');
        }
        trackFileUploaded(Math.round(file.size / 1024));
        setStep('mapping');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Dosya okunamadı.');
      } finally {
        setLoading(false);
      }
    },
    [settings, setFile, setSettings, setStep],
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display text-[22px] leading-tight">Optik form dosyanı yükle</div>
        <p className="mt-1 text-sm text-ink-muted">OMR cihazından aldığın .txt dosyasını sürükle veya seç.</p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 border-2 border-dashed p-14 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-ink/30 bg-cream hover:border-ink hover:bg-ink/5'
        }`}
      >
        <FileUp className={`h-10 w-10 ${dragging ? 'text-primary' : 'text-ink-muted'}`} />
        <div>
          <div className="font-display text-[18px] leading-tight">
            {loading ? 'Okunuyor…' : 'Dosyayı buraya sürükle'}
          </div>
          <div className="mt-1 text-xs text-ink-muted">veya tıklayarak seç · .txt · maks. 20 MB</div>
        </div>
        <input
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>

      {fileName && (
        <div className="flex items-center justify-between border-2 border-ink bg-success-tint p-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="font-bold">{fileName}</span>
          </div>
          <Button variant="ink" size="sm" onClick={() => setStep('mapping')}>
            Devam Et →
          </Button>
        </div>
      )}
    </div>
  );
}
