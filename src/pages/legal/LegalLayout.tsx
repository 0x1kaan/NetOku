import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
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

      <article className="container mx-auto max-w-3xl px-4 py-12">
        <div className="border-2 border-ink bg-paper p-8 shadow-brutal md:p-10">
          <h1 className="font-display text-[clamp(32px,4.5vw,44px)] leading-[1.05]">{title}</h1>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-ink-muted">Son güncelleme: {updated}</p>
          <div className="mt-8 max-w-none space-y-5 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-[20px] [&_h2]:leading-tight [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-ink [&_a]:underline [&_a]:decoration-2 [&_a]:underline-offset-2 [&_strong]:font-bold">
            {children}
          </div>
        </div>
      </article>

      <footer className="mt-16 border-t-2 border-ink bg-paper">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-muted">
          <div>© {new Date().getFullYear()} NetOku. Tüm hakları saklıdır.</div>
          <nav className="flex flex-wrap gap-4">
            <Link to="/terms" className="hover:text-ink">Kullanım Şartları</Link>
            <Link to="/privacy" className="hover:text-ink">Gizlilik</Link>
            <Link to="/cookies" className="hover:text-ink">Çerezler</Link>
            <Link to="/refund" className="hover:text-ink">İade Politikası</Link>
            <Link to="/contact" className="hover:text-ink">İletişim</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
