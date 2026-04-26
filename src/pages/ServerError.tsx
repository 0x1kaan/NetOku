import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServerErrorProps {
  error?: Error | null;
  onRetry?: () => void;
}

export function ServerError({ error, onRetry }: ServerErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10 font-sans text-ink">
      <div className="w-full max-w-xl border-2 border-ink bg-paper p-8 text-center shadow-brutal">
        <div className="mx-auto grid h-14 w-14 place-items-center border-2 border-ink bg-destructive-tint">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-destructive">
          500
        </p>
        <h1 className="mt-2 font-display text-[34px] leading-tight">
          Beklenmedik bir hata oluştu.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-muted">
          Ekranı güvenli moda aldık ve hatayı teknik takibe gönderdik. Çalışmanı kaybetmemek için
          önce sayfayı tekrar dene.
        </p>
        {error?.message && (
          <p className="mx-auto mt-4 max-w-md border-2 border-ink bg-cream px-3 py-2 text-left font-mono text-xs text-ink-muted">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {onRetry && (
            <Button variant="ink" onClick={onRetry} className="justify-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Tekrar dene
            </Button>
          )}
          <Button asChild variant="paper" className="justify-center">
            <Link to="/app">Uygulamaya dön</Link>
          </Button>
          <Button asChild variant="ghost" className="justify-center">
            <Link to="/">Ana sayfa</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
