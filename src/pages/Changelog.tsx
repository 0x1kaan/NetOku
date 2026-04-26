import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  title: string;
  description: string;
  items: string[];
}

const entries: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '16 Nisan 2026',
    type: 'feature',
    title: 'Hesap yönetimi ve KVKK uyumu',
    description: 'Tüm kullanıcılar için hesap yönetimini iyileştirdik.',
    items: [
      'Yeni Ayarlar sayfası: profil, parola değiştir, veri yönetimi',
      'Verilerinizi JSON formatında dışa aktarma (KVKK/GDPR)',
      'Hesap silme akışı — tek tıkla tüm verilerinizi kalıcı silin',
      'E-posta doğrulama zorunluluğu ve doğrulanmamış hesaplar için uyarı',
      'Landing sayfasında kullanıcı yorumları ve SEO için structured data',
      '404 sayfası',
    ],
  },
  {
    version: '1.1.0',
    date: '1 Nisan 2026',
    type: 'feature',
    title: 'Polar.sh ile ödeme',
    description: 'Pro ve Okul planlarını Polar.sh üzerinden sunuyoruz.',
    items: [
      'Aylık Pro ($19) ve Okul ($99) abonelik planları',
      'Stripe yerine Polar.sh entegrasyonu — düşük komisyon',
      'Polar müşteri portalı ile abonelik yönetimi',
      'Webhook ile gerçek zamanlı plan güncelleme',
      "Kullanım limitinin %80'ine ulaşılınca e-posta uyarısı",
    ],
  },
  {
    version: '1.0.0',
    date: '15 Mart 2026',
    type: 'feature',
    title: 'NetOku v1 canlıda',
    description: 'İlk kararlı sürüm yayında.',
    items: [
      'OMR .txt dosyası yükleme ve otomatik analiz',
      'Cevap anahtarı otomatik algılama (boş öğrenci no satırları)',
      'A/B/C/D kitapçık tipi desteği',
      '5 derse kadar yapılandırılabilir kriterler',
      "Renk kodlu Excel rapor çıktısı (Pro'da OBS aktarma)",
      'Preset sistemi — kayıtlı form tipleri',
      'Analiz geçmişi ve öğrenci numarası düzeltme modalı',
    ],
  },
];

const TYPE_LABEL: Record<ChangelogEntry['type'], { label: string; className: string }> = {
  feature: { label: 'Yenilik', className: 'bg-pop' },
  improvement: { label: 'İyileştirme', className: 'bg-primary-tint' },
  fix: { label: 'Düzeltme', className: 'bg-success-tint' },
};

export function Changelog() {
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

      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto inline-flex items-center gap-2 border-2 border-ink bg-primary-tint px-4 py-1.5 text-xs font-bold uppercase tracking-[0.08em]">
            <Sparkles className="h-3.5 w-3.5" />
            Ürün güncellemeleri
          </div>
          <h1 className="mt-5 font-display text-[clamp(44px,6vw,64px)] leading-[0.95]">Changelog</h1>
          <p className="mt-3 text-sm text-ink-muted">
            NetOku'ya eklenen yeni özellikler, iyileştirmeler ve düzeltmeler.
          </p>
        </div>

        <ol className="space-y-6">
          {entries.map((entry) => {
            const typeMeta = TYPE_LABEL[entry.type];
            return (
              <li key={entry.version} className="border-2 border-ink bg-paper p-6 shadow-brutal">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex border-2 border-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] ${typeMeta.className}`}>
                    {typeMeta.label}
                  </span>
                  <span className="font-mono text-sm font-bold">v{entry.version}</span>
                  <time className="text-xs text-ink-muted">{entry.date}</time>
                </div>
                <h2 className="mt-3 font-display text-[22px] leading-tight">{entry.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{entry.description}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  {entry.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 bg-ink" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      <footer className="mt-16 border-t-2 border-ink bg-paper">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-ink-muted">
          <div>© {new Date().getFullYear()} NetOku. Tüm hakları saklıdır.</div>
          <nav className="flex flex-wrap gap-4">
            <Link to="/pricing" className="hover:text-ink">Fiyatlandırma</Link>
            <Link to="/contact" className="hover:text-ink">İletişim</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
