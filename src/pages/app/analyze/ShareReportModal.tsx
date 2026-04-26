import { useEffect, useState } from 'react';
import { Copy, Check, Loader2, Share2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShareLinkActions } from '@/components/ShareLinkActions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createStudentReportShare,
  revokeStudentReportShare,
  type AnalysisRecord,
  type StudentReportShareRecord,
} from '@/lib/db';
import { buildStudentReportPayload, type ReportBranding } from '@/lib/reports';
import { errorMessage, messages } from '@/lib/messages';

const EXPIRY_OPTIONS = [
  { label: 'Süresiz', days: null as number | null },
  { label: '7 gün', days: 7 },
  { label: '30 gün', days: 30 },
  { label: '90 gün', days: 90 },
];

interface ShareReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  record: AnalysisRecord | null;
  branding: ReportBranding;
  userId: string;
  existingShare?: StudentReportShareRecord | null;
  onShareCreated?: (share: StudentReportShareRecord) => void;
  onShareRevoked?: (shareId: string) => void;
}

export function ShareReportModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  record,
  branding,
  userId,
  existingShare,
  onShareCreated,
  onShareRevoked,
}: ShareReportModalProps) {
  const [expiryDays, setExpiryDays] = useState<number | null>(30);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [share, setShare] = useState<StudentReportShareRecord | null>(existingShare ?? null);

  useEffect(() => {
    setShare(existingShare ?? null);
    setCopied(false);
  }, [existingShare, studentId, open]);

  const shareUrl = share
    ? `${window.location.origin}/report/${share.share_token}`
    : '';

  const create = async () => {
    if (!record) return;
    setCreating(true);
    try {
      const payload = buildStudentReportPayload({
        record,
        studentId,
        branding,
      });
      if (!payload) {
        toast.error('Bu öğrenci için rapor oluşturulamadı.');
        return;
      }
      const expiresAt =
        expiryDays === null
          ? null
          : new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      const created = await createStudentReportShare({
        analysisId: record.id,
        organizationId: record.organization_id,
        createdBy: userId,
        studentId: payload.student.id,
        studentName: payload.student.name,
        reportPayload: payload,
        expiresAt,
      });
      setShare(created);
      onShareCreated?.(created);
      toast.success(messages.insights.shareLinkCreated);
    } catch (error) {
      toast.error(errorMessage(error, messages.insights.shareLinkFailed));
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link kopyalandı.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Link kopyalanamadı.');
    }
  };

  const revoke = async () => {
    if (!share) return;
    setRevoking(true);
    try {
      await revokeStudentReportShare(share.id);
      onShareRevoked?.(share.id);
      setShare(null);
      toast.success('Paylaşım iptal edildi.');
    } catch (error) {
      toast.error(errorMessage(error, 'Paylaşım iptal edilemedi.'));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Öğrenci raporunu paylaş
          </DialogTitle>
          <DialogDescription>
            <span className="font-bold text-ink">{studentName}</span> ({studentId}) için veli/öğrenci linki oluştur.
          </DialogDescription>
        </DialogHeader>

        {!share ? (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
                Geçerlilik süresi
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EXPIRY_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setExpiryDays(option.days)}
                    className={`border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-[0.04em] transition-colors ${
                      expiryDays === option.days
                        ? 'bg-ink text-white shadow-brutal-xs'
                        : 'bg-paper text-ink hover:bg-ink/5'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                Link süresi dolduğunda otomatik kapatılır. İstediğinde elle de iptal edebilirsin.
              </p>
            </div>

            <Button
              variant="ink"
              onClick={create}
              disabled={creating || !record}
              className="w-full gap-2"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Linki Oluştur
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-ink bg-cream p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                Paylaşım Linki
              </div>
              <div className="mt-1 break-all font-mono text-xs">{shareUrl}</div>
              {share.expires_at && (
                <div className="mt-2 text-[10px] text-ink-muted">
                  Geçerli: {new Date(share.expires_at).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ink" onClick={copy} className="flex-1 gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Kopyalandı' : 'Linki Kopyala'}
              </Button>
              <ShareLinkActions url={shareUrl} studentName={studentName} compact />
              <Button
                variant="paper"
                onClick={revoke}
                disabled={revoking}
                className="gap-2"
                title="Paylaşımı iptal et"
              >
                {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>

            <p className="text-xs text-ink-muted">
              Bu linke sahip olan herkes sadece bu öğrencinin raporunu görebilir. Diğer öğrencilerin verisi paylaşılmaz.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
