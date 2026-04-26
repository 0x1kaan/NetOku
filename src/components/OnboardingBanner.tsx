import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Download, FileUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'netoku_onboarding_dismissed';

const STEPS = [
  {
    icon: <FileUp className="h-5 w-5" />,
    title: '1. Dosyayı yükle',
    desc: 'Optik okuyucunuzdan çıkan .txt dosyasını sürükle-bırak ya da seç.',
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: '2. Sütunları eşle',
    desc: 'Ad, öğrenci no ve ders cevaplarının hangi sütunda olduğunu belirt.',
  },
  {
    icon: <ArrowRight className="h-5 w-5" />,
    title: '3. Analizi başlat',
    desc: 'Net, puan ve hata analizi otomatik hesaplanır.',
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: '4. Excel\'i indir',
    desc: 'Hazır raporu tek tıkla bilgisayarına indir.',
  },
];

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(() =>
    Boolean(localStorage.getItem(STORAGE_KEY))
  );

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative border-2 border-ink bg-primary-tint p-5 shadow-brutal-sm">
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 p-1 text-ink-muted hover:text-ink"
        aria-label="Kapat"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="mb-4 font-display text-[18px] leading-tight">NetOku nasıl çalışır?</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.title} className="flex items-start gap-3 border-2 border-ink bg-paper p-3">
            <div className="mt-0.5 shrink-0">{s.icon}</div>
            <div>
              <p className="text-sm font-bold">{s.title}</p>
              <p className="text-xs text-ink-muted">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link to="/app/analyze">
          <Button variant="ink" size="sm" className="gap-2">
            <FileUp className="h-4 w-4" /> İlk Analizimi Yap
          </Button>
        </Link>
        <button onClick={dismiss} className="text-xs text-ink-muted hover:underline">
          Bir daha gösterme
        </button>
      </div>
    </div>
  );
}
