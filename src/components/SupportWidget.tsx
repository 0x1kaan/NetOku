import { useEffect, useState } from 'react';
import { BookOpen, HelpCircle, Mail, MessageSquare, X } from 'lucide-react';

/** Sağ alt köşede sabit bir destek butonu ve ona tıklayınca açılan popover. */
export function SupportWidget() {
  const [open, setOpen] = useState(false);

  // ESC kapatır
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {open && (
          <div
            role="dialog"
            aria-label="Destek"
            className="w-72 border-2 border-ink bg-paper p-4 shadow-brutal"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-[18px] leading-tight">Yardım lazım mı?</h3>
                <p className="mt-1 text-xs text-ink-muted">Genelde 1 iş günü içinde yanıtlıyoruz.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <a
                href="mailto:destek@netoku.app"
                className="flex items-center gap-3 border-2 border-ink bg-cream p-3 text-sm transition-colors hover:bg-primary-tint"
              >
                <Mail className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold">E-posta ile yaz</div>
                  <div className="text-xs text-ink-muted">destek@netoku.app</div>
                </div>
              </a>

              <a
                href="mailto:feedback@netoku.app?subject=NetOku%20Geri%20Bildirim"
                className="flex items-center gap-3 border-2 border-ink bg-cream p-3 text-sm transition-colors hover:bg-primary-tint"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold">Öneri / Geri bildirim</div>
                  <div className="text-xs text-ink-muted">Eksik bulduğunuz bir şey mi var?</div>
                </div>
              </a>

              <a
                href="/changelog"
                className="flex items-center gap-3 border-2 border-ink bg-cream p-3 text-sm transition-colors hover:bg-primary-tint"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div className="font-bold">Yenilikler</div>
                  <div className="text-xs text-ink-muted">Son güncellemeler ve özellikler</div>
                </div>
              </a>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Destek penceresini kapat' : 'Destek penceresini aç'}
          className="grid h-12 w-12 place-items-center border-2 border-ink bg-pop text-ink shadow-brutal-sm transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal"
        >
          {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
        </button>
      </div>
    </>
  );
}
