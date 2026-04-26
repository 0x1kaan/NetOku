import { Link } from 'react-router-dom';
import { ArrowLeft, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-ink">
      <header className="border-b-2 border-ink bg-paper">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-display text-xl">
            <span className="grid h-8 w-8 place-items-center border-2 border-ink bg-pop text-ink">N</span>
            NetOku
          </Link>
          <Link to="/auth">
            <Button variant="ink" size="sm">Giriş</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto inline-flex items-center gap-2 border-2 border-ink bg-primary-tint px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em]">
            <Search className="h-3.5 w-3.5" />
            404 — Sayfa bulunamadı
          </div>
          <h1 className="mt-6 font-display text-[clamp(48px,7vw,72px)] leading-[0.95]">
            Bu sayfa <span className="bg-pop px-2">kayıp</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-muted">
            Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir. Ana sayfaya dönüp tekrar deneyin.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/">
              <Button variant="ink" size="lg" className="gap-2">
                <Home className="h-4 w-4" /> Ana Sayfa
              </Button>
            </Link>
            <Button variant="paper" size="lg" className="gap-2" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" /> Geri Dön
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t-2 border-ink bg-paper py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-ink-muted md:flex-row">
          <div>© {new Date().getFullYear()} NetOku. Tüm hakları saklıdır.</div>
          <nav className="flex flex-wrap justify-center gap-5">
            <Link to="/pricing" className="hover:text-ink">Fiyatlandırma</Link>
            <Link to="/contact" className="hover:text-ink">İletişim</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
