import { useMemo, useState } from 'react';
import { ChevronDown, FileJson, KeyRound, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAnalyzeStore } from '@/store/analyzeStore';
import { BUILTIN_TEMPLATES } from '@/lib/builtinTemplates';
import { applyLegacySettingsJson } from '@/lib/legacySettings';
import { extractAnswerKeysFromKeyFile } from '@/core/answerKeys';
import { readCp1254TextFile, readTextFileAuto } from '@/lib/fileEncoding';

export function MappingStep() {
  const {
    rawText,
    settings,
    manualAnswerKeys,
    applyPreset,
    patchSettings,
    setSettings,
    setManualAnswerKeys,
    setStep,
  } = useAnalyzeStore();
  const [templateOpen, setTemplateOpen] = useState(false);

  const preview = useMemo(() => {
    if (!rawText) return [] as string[];
    return rawText.split(/\r?\n/).filter((l) => l.length > 0).slice(0, 5);
  }, [rawText]);

  const maxLen = useMemo(() => preview.reduce((m, l) => Math.max(m, l.length), 0), [preview]);

  const ruler = useMemo(() => {
    const len = Math.max(maxLen, settings.answersStart + 20);
    return {
      tens: Array.from({ length: len }, (_, i) => ((i + 1) % 10 === 0 ? String((i + 1) / 10) : ' ')).join(''),
      ones: Array.from({ length: len }, (_, i) => String((i + 1) % 10)).join(''),
    };
  }, [maxLen, settings.answersStart]);

  const numField = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    min = 1,
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </div>
  );

  const addExtra = () => {
    patchSettings({
      extras: [
        ...settings.extras,
        { name: `Alan ${settings.extras.length + 1}`, start: 1, length: 1 },
      ],
    });
  };

  const updateExtra = (index: number, patch: Partial<{ name: string; start: number; length: number }>) => {
    patchSettings({
      extras: settings.extras.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    });
  };

  const removeExtra = (index: number) => {
    patchSettings({ extras: settings.extras.filter((_, i) => i !== index) });
  };

  const addManualAnswerKey = () => {
    const used = new Set(manualAnswerKeys.map((key) => key.booklet.toUpperCase()));
    const nextBooklet = ['A', 'B', 'C', 'D'].find((booklet) => !used.has(booklet)) ?? 'A';
    setManualAnswerKeys([...manualAnswerKeys, { booklet: nextBooklet, answers: '' }]);
  };

  const updateManualAnswerKey = (
    index: number,
    patch: Partial<{ booklet: string; answers: string }>,
  ) => {
    setManualAnswerKeys(
      manualAnswerKeys.map((key, i) =>
        i === index
          ? {
              ...key,
              booklet:
                patch.booklet !== undefined
                  ? patch.booklet.trim().toUpperCase().slice(0, 1)
                  : key.booklet,
              answers:
                patch.answers !== undefined
                  ? patch.answers.replace(/\r?\n/g, '').replace(/\s+$/, '').toUpperCase()
                  : key.answers,
            }
          : key,
      ),
    );
  };

  const removeManualAnswerKey = (index: number) => {
    setManualAnswerKeys(manualAnswerKeys.filter((_, i) => i !== index));
  };

  const loadAnswerKeyFile = async (file: File) => {
    const text = await readCp1254TextFile(file);
    const fileKeys = extractAnswerKeysFromKeyFile(text, settings);

    if (fileKeys.length === 0) {
      const firstLine =
        text
          .split(/\r?\n/)
          .find((line) => line.trim().length > 0)
          ?.replace(/\s+$/, '')
          .toUpperCase() ?? '';
      setManualAnswerKeys([
        ...manualAnswerKeys,
        { booklet: 'A', answers: firstLine },
      ]);
      return;
    }

    const byBooklet = new Map<string, { booklet: string; answers: string }>();
    for (const key of manualAnswerKeys) {
      byBooklet.set(key.booklet.toUpperCase(), key);
    }
    for (const key of fileKeys) {
      byBooklet.set(key.booklet, key);
    }
    setManualAnswerKeys(Array.from(byBooklet.values()));
  };

  const loadLegacySettingsFile = async (file: File) => {
    try {
      const text = await readTextFileAuto(file);
      setSettings(applyLegacySettingsJson(text, settings));
      setTemplateOpen(false);
      toast.success('Eski ayar JSON dosyasi yuklendi. Ders bilgilerini gozden gecir.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ayar JSON dosyasi yuklenemedi.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="font-display text-[22px] leading-tight">Kolonları eşleştir</div>
        <p className="mt-1 text-sm text-ink-muted">
          Satırlardaki alanların kaçıncı kolonda başladığını ve kaç karakter olduğunu belirtin. Aşağıda dosyadan örnek satırlar var.
        </p>
      </div>

      <div className="relative flex flex-wrap gap-2">
        <Button
          variant="ink"
          size="sm"
          className="gap-2"
          onClick={() => setTemplateOpen((v) => !v)}
        >
          <LayoutTemplate className="h-4 w-4" />
          Hazır Şablon Seç
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${templateOpen ? 'rotate-180' : ''}`} />
        </Button>

        <label>
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadLegacySettingsFile(file);
              e.currentTarget.value = '';
            }}
          />
          <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-paper px-3 text-xs font-bold uppercase tracking-[0.04em] shadow-brutal-xs transition-colors hover:bg-ink/5">
            <FileJson className="h-4 w-4" />
            Ayar JSON YÃ¼kle
          </span>
        </label>

        {templateOpen && (
          <div className="absolute left-0 top-full z-20 mt-1 w-80 border-2 border-ink bg-paper shadow-brutal">
            <div className="border-b-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
              Bilinen OMR formatları
            </div>
            {BUILTIN_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="w-full border-b border-ink/10 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-ink/5"
                onClick={() => {
                  applyPreset(tpl.id);
                  setTemplateOpen(false);
                }}
              >
                <div className="text-sm font-bold">{tpl.name}</div>
                <div className="mt-0.5 text-xs text-ink-muted">{tpl.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto border-2 border-ink bg-cream p-3 font-mono text-xs leading-tight">
        <pre className="text-ink-muted">{ruler.tens}</pre>
        <pre className="text-ink-muted">{ruler.ones}</pre>
        {preview.map((l, i) => (
          <pre key={i} className="whitespace-pre">{l}</pre>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-2 border-ink p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.05em]">Ad Soyad</h3>
          <div className="grid grid-cols-2 gap-3">
            {numField('Başlangıç', settings.nameColumn.start, (n) =>
              patchSettings({ nameColumn: { ...settings.nameColumn, start: n } }),
            )}
            {numField('Uzunluk', settings.nameColumn.length, (n) =>
              patchSettings({ nameColumn: { ...settings.nameColumn, length: n } }),
            )}
          </div>
        </div>
        <div className="border-2 border-ink p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.05em]">Öğrenci No</h3>
          <div className="grid grid-cols-2 gap-3">
            {numField('Başlangıç', settings.studentIdColumn.start, (n) =>
              patchSettings({ studentIdColumn: { ...settings.studentIdColumn, start: n } }),
            )}
            {numField('Uzunluk', settings.studentIdColumn.length, (n) =>
              patchSettings({ studentIdColumn: { ...settings.studentIdColumn, length: n } }),
            )}
          </div>
        </div>
        <div className="border-2 border-ink p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.05em]">Kitapçık</h3>
          <div className="grid grid-cols-2 gap-3">
            {numField('Başlangıç', settings.bookletColumn.start, (n) =>
              patchSettings({ bookletColumn: { ...settings.bookletColumn, start: n } }),
            )}
            {numField('Uzunluk', settings.bookletColumn.length, (n) =>
              patchSettings({ bookletColumn: { ...settings.bookletColumn, length: n } }),
            )}
          </div>
        </div>
        <div className="border-2 border-ink p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.05em]">Cevaplar</h3>
          {numField('Başlangıç Kolonu', settings.answersStart, (n) => patchSettings({ answersStart: n }))}
        </div>
      </div>

      <div className="border-2 border-ink p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.05em]">
              <KeyRound className="h-4 w-4" />
              Cevap Anahtarı (Manuel)
            </h3>
            <p className="mt-1 text-xs text-ink-muted">
              Dosyada anahtar satırı yoksa kitapçık ve cevap dizisini buraya ekleyin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label>
              <input
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void loadAnswerKeyFile(file);
                  e.currentTarget.value = '';
                }}
              />
              <span className="inline-flex h-9 cursor-pointer items-center justify-center border-2 border-ink bg-paper px-3 text-xs font-bold uppercase tracking-[0.04em] shadow-brutal-xs transition-colors hover:bg-ink/5">
                Dosyadan Yükle
              </span>
            </label>
            <Button variant="ink" size="sm" onClick={addManualAnswerKey} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Anahtar Ekle
            </Button>
          </div>
        </div>

        {manualAnswerKeys.length === 0 ? (
          <p className="text-xs text-ink-muted">
            Manuel anahtar yok. Dosyadaki boş veya 0 numaralı satır anahtar olarak okunur.
          </p>
        ) : (
          <div className="space-y-3">
            {manualAnswerKeys.map((key, i) => (
              <div key={i} className="grid gap-3 border-2 border-ink/30 bg-cream p-3 md:grid-cols-[88px_1fr_auto] md:items-start">
                <div className="space-y-1">
                  <Label className="text-xs">Kitapçık</Label>
                  <Input
                    value={key.booklet}
                    maxLength={1}
                    onChange={(e) => updateManualAnswerKey(i, { booklet: e.target.value })}
                    placeholder="A"
                    className="text-center font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cevap Dizisi</Label>
                  <textarea
                    value={key.answers}
                    onChange={(e) => updateManualAnswerKey(i, { answers: e.target.value })}
                    placeholder="ABCDABCD... (* serbest/doğru kabul)"
                    className="min-h-20 w-full resize-y border-2 border-ink bg-paper px-3 py-2 font-mono text-sm uppercase outline-none transition-colors placeholder:text-ink-muted focus:ring-0"
                  />
                  <div className="text-xs text-ink-muted">
                    {key.answers.length} cevap
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeManualAnswerKey(i)}
                  className="p-2 text-ink-muted hover:text-destructive md:mt-6"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-2 border-ink p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-[0.05em]">Ek Alanlar</h3>
          <Button variant="ink" size="sm" onClick={addExtra} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Alan Ekle
          </Button>
        </div>
        {settings.extras.length === 0 ? (
          <p className="text-xs text-ink-muted">
            Ek alan yok. Program, Derslik vb. için ekleyin.
          </p>
        ) : (
          <div className="space-y-3">
            {settings.extras.map((extra, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_80px_auto] items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Alan Adı</Label>
                  <Input
                    value={extra.name}
                    onChange={(e) => updateExtra(i, { name: e.target.value })}
                    placeholder="Program"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Başlangıç</Label>
                  <Input
                    type="number"
                    min={1}
                    value={extra.start}
                    onChange={(e) => updateExtra(i, { start: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Uzunluk</Label>
                  <Input
                    type="number"
                    min={1}
                    value={extra.length}
                    onChange={(e) => updateExtra(i, { length: Number(e.target.value) || 1 })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeExtra(i)}
                  className="p-2 text-ink-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-2 border-ink p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.05em]">Yanlış Kriteri</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => patchSettings({ wrongCriterion: n as 0 | 1 | 2 | 3 | 4 })}
              className={`border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
                settings.wrongCriterion === n
                  ? 'bg-ink text-white shadow-brutal-xs'
                  : 'bg-paper text-ink hover:bg-ink/5'
              }`}
            >
              {n === 0 ? 'Kriter yok' : `${n} yanlış = 1 doğru`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="paper" onClick={() => setStep('upload')}>
          ← Geri
        </Button>
        <Button variant="ink" onClick={() => setStep('courses')}>Devam Et →</Button>
      </div>
    </div>
  );
}
