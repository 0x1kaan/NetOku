import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Arrow,
  BigNum,
  Check,
  Eyebrow,
  Rule,
  Sticker,
} from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import { startCheckout, type PolarTier } from '@/lib/polar';
import { trackPricingViewed, trackUpgradeClicked } from '@/lib/analytics';

interface Plan {
  name: string;
  tier: 'free' | PolarTier;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  cta: string;
  highlight?: boolean;
  features: string[];
  cardClass: string;
  textOnDark?: boolean;
  ctaVariant: 'ink' | 'pop';
}

const plans: Plan[] = [
  {
    name: 'Tadımlık',
    tier: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Merhaba demek için.',
    cta: 'Başla',
    features: [
      'Sınırsız analiz',
      '3 derse kadar',
      'Excel çıktısı',
      'Temel destek',
    ],
    cardClass: 'bg-paper',
    ctaVariant: 'ink',
  },
  {
    name: 'Pro',
    tier: 'pro',
    monthlyPrice: 19,
    yearlyPrice: 190,
    description: 'Öğretmen çantası.',
    cta: 'Pro ol',
    highlight: true,
    features: [
      'Sınırsız analiz',
      '5 derse kadar',
      'Preset & geçmiş',
      'OBS not aktarımı',
      'Öncelikli destek',
    ],
    cardClass: 'bg-pop',
    ctaVariant: 'ink',
  },
  {
    name: 'Okul',
    tier: 'school',
    monthlyPrice: 99,
    yearlyPrice: 990,
    description: 'Tüm öğretmenler odası.',
    cta: 'Ekip kur',
    features: [
      "Pro'daki her şey",
      '5 kullanıcı',
      'Ortak arşiv ve preset',
      'Toplu export',
      'Kurulum desteği',
    ],
    cardClass: 'bg-primary text-white',
    textOnDark: true,
    ctaVariant: 'pop',
  },
];

const faqs: Array<[string, string]> = [
  ['İptal etmek kolay mı?', 'Evet. Hesap ayarlarından tek tıkla. Dönem sonuna kadar erişim devam eder.'],
  ['Verilerim güvende mi?', 'Ham .txt tarayıcında işlenir. Sonuçlar şifreli. İstediğin zaman silersin.'],
  [
    'Türk lirası ile ödeyebilir miyim?',
    'İşte bu soruyu sorduğuna sevindik. Evet, TL iyzico üzerinden kabul ediyoruz.',
  ],
  [
    'Ekibimdeki herkes ayrı preset kullanabilir mi?',
    "School planında herkesin kendi preset'i olur, ortak olanlar paylaşılır.",
  ],
];

function NLogo({ size = 38 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center bg-primary text-white border-2 border-ink shadow-brutal-sm font-display"
      style={{ width: size, height: size, fontSize: size * 0.58 }}
    >
      N
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="cursor-pointer border-b-2 border-ink py-5"
      onClick={() => setOpen((v) => !v)}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="font-display text-[22px] leading-tight">{q}</span>
        <span
          className="select-none text-[28px] leading-none transition-transform duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'none' }}
        >
          +
        </span>
      </div>
      {open && (
        <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">{a}</p>
      )}
    </div>
  );
}

export function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);
  const [loadingTier, setLoadingTier] = useState<PolarTier | null>(null);

  useEffect(() => {
    trackPricingViewed();
  }, []);

  const handleCta = async (plan: Plan) => {
    if (plan.tier === 'free') {
      navigate(user ? '/app' : '/auth?mode=signup');
      return;
    }
    if (!user) {
      navigate(`/auth?mode=signup&next=upgrade-${plan.tier}`);
      return;
    }
    setLoadingTier(plan.tier);
    trackUpgradeClicked(plan.tier, 'pricing');
    try {
      await startCheckout(plan.tier, yearly);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ödeme başlatılamadı.');
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink font-sans">
      <header className="border-b-2 border-ink bg-cream">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-7 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <NLogo />
            <span className="font-display text-[26px] leading-none">NetOku</span>
          </Link>
          <Link to="/auth">
            <Button variant="paper" size="sm">Giriş</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-7 py-20">
        <div className="mb-12 text-center">
          <Eyebrow>— Fiyatlar</Eyebrow>
          <h1 className="my-5 font-display text-[clamp(40px,6vw,80px)] leading-[1.02] tracking-[-0.02em]">
            Sade. Şeffaf. <em className="italic text-primary">Türk lirası değil</em> ama kolay hesap.
          </h1>
          <p className="mx-auto mb-8 max-w-[540px] text-lg text-ink-muted">
            İhtiyacın kadar. Büyüdüğünde seninle büyür.
          </p>
          <div className="inline-flex border-2 border-ink bg-paper">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2.5 text-sm font-semibold ${
                !yearly ? 'bg-ink text-white' : 'bg-transparent text-ink'
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`border-l-2 border-ink px-5 py-2.5 text-sm font-semibold ${
                yearly ? 'bg-ink text-white' : 'bg-transparent text-ink'
              }`}
            >
              Yıllık — 2 ay bedava
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const price =
              plan.monthlyPrice === 0
                ? 0
                : yearly
                ? Math.round(plan.yearlyPrice / 12)
                : plan.monthlyPrice;
            const isLoading = loadingTier === plan.tier;
            const dark = plan.textOnDark;

            return (
              <Card
                key={plan.name}
                className={`relative min-h-[460px] p-7 ${plan.cardClass}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 right-5">
                    <Sticker color="red" rotate={6}>
                      ★ Popüler
                    </Sticker>
                  </div>
                )}
                <Eyebrow color={dark ? 'white' : 'ink'}>
                  — {String(plan.tier).toUpperCase()}
                </Eyebrow>
                <div className="mb-1 mt-3 font-display text-[40px] leading-tight">
                  {plan.name}
                </div>
                <div
                  className={`mb-6 text-sm ${dark ? 'text-white/80' : 'opacity-80'}`}
                >
                  {plan.description}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <BigNum
                    className={`text-[84px] ${dark ? 'text-white' : 'text-ink'}`}
                  >
                    ${price}
                  </BigNum>
                  <span className={`text-sm ${dark ? 'text-white/70' : 'opacity-70'}`}>
                    /ay
                  </span>
                </div>
                {yearly && plan.yearlyPrice > 0 && (
                  <div className={`mb-6 text-[11px] ${dark ? 'text-white/70' : 'opacity-70'}`}>
                    Yıllık ${plan.yearlyPrice} faturalanır
                  </div>
                )}
                <Rule
                  className={`my-6 ${dark ? 'bg-white' : 'bg-ink'}`}
                />
                <div className="mb-6 flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className={dark ? 'text-white' : 'text-ink'} />
                      {f}
                    </div>
                  ))}
                </div>
                <Button
                  variant={plan.ctaVariant}
                  size="md"
                  className="w-full justify-center gap-2"
                  disabled={loadingTier !== null}
                  onClick={() => handleCta(plan)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yönlendiriliyor…
                    </>
                  ) : (
                    <>
                      {plan.cta} <Arrow />
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="mx-auto mt-20 max-w-[640px]">
          <h2 className="mb-8 text-center font-display text-[clamp(32px,4vw,48px)] leading-tight tracking-[-0.02em]">
            Sıkça sorulanlar
          </h2>
          {faqs.map(([q, a]) => (
            <FaqItem key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-[1200px] border-t-2 border-ink px-7 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px]">
            © {new Date().getFullYear()} NetOku — Kolay gelsin.
          </span>
          <nav className="flex flex-wrap gap-5 text-[13px]">
            <Link to="/" className="hover:underline">Anasayfa</Link>
            <Link to="/terms" className="hover:underline">Kullanım Şartları</Link>
            <Link to="/privacy" className="hover:underline">Gizlilik</Link>
            <Link to="/contact" className="hover:underline">İletişim</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
