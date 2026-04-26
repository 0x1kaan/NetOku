import { useState } from 'react';
import { MessageCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildStudentReportShareText, buildWhatsAppShareUrl } from '@/lib/share';

interface ShareLinkActionsProps {
  url: string;
  studentName: string;
  compact?: boolean;
}

export function ShareLinkActions({
  url,
  studentName,
  compact = false,
}: ShareLinkActionsProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const message = buildStudentReportShareText({ studentName, url });
  const whatsappUrl = buildWhatsAppShareUrl(message);

  return (
    <>
      <Button
        asChild
        variant="paper"
        size={compact ? 'icon' : 'default'}
        className={compact ? '' : 'gap-2'}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp ile gönder"
          aria-label="WhatsApp ile gönder"
        >
          <MessageCircle className="h-4 w-4" />
          {!compact && 'WhatsApp'}
        </a>
      </Button>
      <Button
        type="button"
        variant="paper"
        size={compact ? 'icon' : 'default'}
        onClick={() => setQrOpen(true)}
        className={compact ? '' : 'gap-2'}
        title="QR kodu göster"
        aria-label="QR kodu göster"
      >
        <QrCode className="h-4 w-4" />
        {!compact && 'QR'}
      </Button>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR ile paylaş</DialogTitle>
            <DialogDescription>
              {studentName} raporunu telefondan açmak için kodu okut.
            </DialogDescription>
          </DialogHeader>
          <div className="grid place-items-center border-2 border-ink bg-cream p-5">
            <div className="border-2 border-ink bg-paper p-3">
              <QRCodeSVG value={url} size={208} level="M" includeMargin />
            </div>
          </div>
          <div className="break-all border-2 border-ink bg-paper p-3 font-mono text-xs">
            {url}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
