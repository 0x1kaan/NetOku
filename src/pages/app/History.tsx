import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, BigNum, Eyebrow, Rule, Tag } from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import {
  deleteAnalysis,
  deleteAnalyses,
  fetchProfile,
  listWorkspaceAnalyses,
  type AnalysisRecord,
} from '@/lib/db';
import { supabaseReady } from '@/lib/supabase';
import { errorMessage, messages } from '@/lib/messages';

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m]} ${y}`;
}

export function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnalysisRecord | null>(null);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await fetchProfile(user.id);
      setItems(
        await listWorkspaceAnalyses({
          userId: user.id,
          organizationId: profile?.organization_id,
          limit: 120,
        }),
      );
    } catch (e) {
      toast.error(errorMessage(e, messages.history.loadFailed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAnalysis(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      toast.error(errorMessage(err, messages.history.deleteFailed));
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const bulkRemove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`${selectedIds.length} analizi silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteAnalyses(selectedIds);
      setItems((xs) => xs.filter((x) => !selectedIds.includes(x.id)));
      setSelectedIds([]);
      toast.success(`${selectedIds.length} analiz silindi.`);
    } catch (err) {
      toast.error(errorMessage(err, messages.history?.deleteFailed ?? 'Silme işlemi başarısız.'));
    }
  };

  const exportSelected = () => {
    if (selectedIds.length === 0) return;
    const selectedData = items.filter(i => selectedIds.includes(i.id));
    const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `netoku_analyses_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`${selectedIds.length} analiz dışa aktarıldı.`);
  };

  // group by month
  const groups: Array<{ key: string; items: AnalysisRecord[] }> = [];
  const seen: Record<string, number> = {};
  items.forEach((a) => {
    const k = monthKey(a.created_at);
    if (!(k in seen)) {
      seen[k] = groups.length;
      groups.push({ key: k, items: [] });
    }
    groups[seen[k]].items.push(a);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Eyebrow>— Arşiv</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.02] tracking-[-0.02em]">
          Geçmiş analizler.
        </h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          Kaydedilen çalışmalar ay ay. Tıkla, aç; tekrar bak.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={selectedIds.length !== 2}
          onClick={() => navigate(`/app/insights?left=${selectedIds[0]}&right=${selectedIds[1]}`)}
        >
          2 analizi karşılaştır
        </Button>
        {selectedIds.length > 0 && (
          <>
            <Button variant="outline" onClick={exportSelected}>
              JSON İndir ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              onClick={bulkRemove}
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              Sil ({selectedIds.length})
            </Button>
          </>
        )}
      </div>

      {!supabaseReady && (
        <Card className="border-destructive bg-destructive-tint p-4 text-sm text-ink">
          Supabase yapılandırılmamış. Geçmiş kaydedilemiyor.
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse border-2 border-ink bg-paper shadow-brutal-sm"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <p className="text-sm text-ink-muted">Henüz kayıt yok.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g, idx) => {
            const open = openMonths[g.key] ?? idx === 0;
            return (
              <Card key={g.key} className="overflow-hidden p-0">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMonths((m) => ({ ...m, [g.key]: !open }))
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-ink/5"
                >
                  <div className="flex items-center gap-4">
                    <BigNum className="text-[44px]">{g.items.length}</BigNum>
                    <div>
                      <div className="font-display text-[24px] leading-tight">
                        {monthLabel(g.key)}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {g.items.length} analiz
                      </div>
                    </div>
                  </div>
                  <div
                    className="text-2xl leading-none transition-transform"
                    style={{ transform: open ? 'rotate(45deg)' : 'none' }}
                  >
                    +
                  </div>
                </button>

                {open && (
                  <>
                    <Rule />
                    <div className="divide-y-2 divide-ink">
                      {g.items.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelected(a)}
                          className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink/5"
                        >
                          <Avatar name={a.title} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-display text-[18px] leading-tight">
                              {a.title}
                            </div>
                            <div className="mt-0.5 text-xs text-ink-muted">
                              {new Date(a.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                          <div className="hidden gap-4 text-xs sm:flex">
                            <Tag
                              color={a.visibility === 'organization' ? 'pop' : 'paper'}
                              textColor="ink"
                            >
                              {a.visibility === 'organization' ? 'Kurum' : 'Kisisel'}
                            </Tag>
                            <Tag color="paper" textColor="ink">
                              {a.student_count} öğr.
                            </Tag>
                            {a.excluded_count > 0 && (
                              <Tag color="red-tint" textColor="ink">
                                {a.excluded_count} dışı
                              </Tag>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelected(a.id);
                            }}
                            className={`border-2 px-2 py-1 text-xs font-bold uppercase tracking-[0.05em] ${
                              selectedIds.includes(a.id)
                                ? 'border-ink bg-ink text-paper'
                                : 'border-ink bg-paper text-ink'
                            }`}
                          >
                            {selectedIds.includes(a.id) ? 'Seçili' : 'Seç'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => remove(a.id, e)}
                            className="p-2 text-ink-muted hover:text-destructive"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AnalysisDetailDialog
        record={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

function AnalysisDetailDialog({
  record,
  open,
  onOpenChange,
}: {
  record: AnalysisRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!record) return null;
  const { summary, settings } = record;
  const wrongLabel = wrongCriterionLabel(settings.wrongCriterion);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-ink bg-paper shadow-brutal-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-[24px]">
            <FileText className="h-4 w-4 shrink-0" />
            {record.title}
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            {new Date(record.created_at).toLocaleString('tr-TR')}
            {record.file_name ? ` · ${record.file_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Toplam" value={summary.totalStudents} />
          <MiniStat label="Değerl." value={summary.evaluatedStudents} />
          <MiniStat label="Dışı" value={summary.excludedStudents} dim />
        </div>

        {summary.courses.length > 0 && (
          <div className="overflow-hidden border-2 border-ink text-sm">
            <table className="w-full">
              <thead className="bg-ink text-xs uppercase tracking-[0.06em] text-white">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Ders</th>
                  <th className="px-3 py-2 text-right font-bold">Soru</th>
                  <th className="px-3 py-2 text-right font-bold">Ort.</th>
                  <th className="px-3 py-2 text-right font-bold">Maks</th>
                </tr>
              </thead>
              <tbody>
                {summary.courses.map((c, i) => (
                  <tr key={i} className="border-t-2 border-ink">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-right text-ink-muted">
                      {settings.courses[i]?.questionCount ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">{c.avgNet.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-ink-muted">
                      {c.maxNet.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          <Tag color="paper" textColor="ink">Yanlış: {wrongLabel}</Tag>
          {summary.bookletsAutoAssigned && (
            <Tag color="pop" textColor="ink">Kitapçık otomatik A</Tag>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ink" size="sm" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div className="border-2 border-ink bg-cream p-3 text-center shadow-brutal-xs">
      <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-[28px] leading-none ${
          dim ? 'text-ink-muted' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function wrongCriterionLabel(criterion: number): string {
  switch (criterion) {
    case 0: return 'Yok';
    case 1: return '¼ puan';
    case 2: return '⅓ puan';
    case 3: return '½ puan';
    case 4: return '1 puan';
    default: return String(criterion);
  }
}
