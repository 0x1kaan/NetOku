import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  readCookieConsent,
  setAnalyticsCaptureEnabled,
  writeCookieConsent,
} from '@/lib/analytics';

type ConsentMode = 'summary' | 'details';

export function CookieBanner() {
  const [visible, setVisible] = useState(() => readCookieConsent() === null);
  const [mode, setMode] = useState<ConsentMode>('summary');
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const save = (preferences: { analytics: boolean; marketing: boolean }) => {
    writeCookieConsent(preferences);
    setAnalyticsCaptureEnabled(preferences.analytics);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihleri"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl border-2 border-ink bg-paper p-4 shadow-brutal sm:left-6 sm:right-auto sm:max-w-md"
    >
      <button
        onClick={() => save({ analytics: false, marketing: false })}
        className="absolute right-2 top-2 p-1 text-ink-muted hover:text-ink"
        aria-label="Zorunlu çerezlerle devam et"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-7">
        <p className="text-sm font-bold text-ink">Çerez tercihleri</p>
        <p className="mt-1 text-sm text-ink-muted">
          Zorunlu çerezler oturum için kullanılır. Analitik ve pazarlama çerezleri için tercihlerini
          ayrı ayrı yönetebilirsin.{' '}
          <Link to="/cookies" className="underline decoration-2 underline-offset-2 hover:text-ink">
            Detaylar
          </Link>
        </p>
      </div>

      {mode === 'details' && (
        <div className="mt-4 space-y-2 text-sm">
          <label className="flex items-start gap-3 border-2 border-ink bg-cream px-3 py-2">
            <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-ink" />
            <span>
              <span className="block font-bold">Zorunlu</span>
              <span className="text-ink-muted">Giriş, güvenlik ve temel uygulama çalışması.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 border-2 border-ink bg-cream px-3 py-2">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(event) => setAnalytics(event.target.checked)}
              className="mt-1 h-4 w-4 accent-ink"
            />
            <span>
              <span className="block font-bold">Analitik</span>
              <span className="text-ink-muted">Ürün akışlarını ve hataları iyileştirmemize yardım eder.</span>
            </span>
          </label>
          <label className="flex items-start gap-3 border-2 border-ink bg-cream px-3 py-2">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(event) => setMarketing(event.target.checked)}
              className="mt-1 h-4 w-4 accent-ink"
            />
            <span>
              <span className="block font-bold">Pazarlama</span>
              <span className="text-ink-muted">Kampanya performansı için ayrılmış tercih.</span>
            </span>
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ink" size="sm" onClick={() => save({ analytics: true, marketing: true })}>
          Tümünü kabul et
        </Button>
        <Button
          variant="paper"
          size="sm"
          onClick={() => save({ analytics: false, marketing: false })}
        >
          Sadece zorunlu
        </Button>
        {mode === 'details' ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => save({ analytics, marketing })}
          >
            Tercihleri kaydet
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setMode('details')}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Tercihler
          </Button>
        )}
      </div>
    </div>
  );
}
