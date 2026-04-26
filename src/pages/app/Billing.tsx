import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BigNum, Check, Chip, Eyebrow, Rule, Sticker } from '@/components/ui/brutal';
import { useAuth } from '@/lib/auth';
import { fetchProfile, PLAN_LIMITS, type Profile } from '@/lib/db';
import { openCustomerPortal, startCheckout, type PolarTier } from '@/lib/polar';
import { supabaseReady } from '@/lib/supabase';
import { errorMessage, messages } from '@/lib/messages';

const PLAN_LABEL: Record<Profile['plan'], string> = {
  free: 'Tadımlık',
  pro: 'Pro',
  school: 'Okul',
};

const POLL_INTERVAL = 3000;
const MAX_POLLS = 10;

const PRICES = {
  pro: { monthly: 19, yearly: 190 },
  school: { monthly: 99, yearly: 990 },
};

const PRO_FEATURES = [
  'Sınırsız analiz',
  '5 derse kadar',
  'Preset & geçmiş',
  'OBS not aktarımı',
  'Öncelikli destek',
];
const SCHOOL_FEATURES = [
  "Pro'daki her şey",
  '5 kullanıcı',
  'Ortak arşiv ve preset',
  'Toplu export',
  'Kurulum desteği',
];

export function Billing() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'portal' | PolarTier | null>(null);
  const [yearly, setYearly] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollCount = useRef(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) return null;
    const p = await fetchProfile(user.id);
    setProfile(p);
    return p;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, [user, loadProfile]);

  useEffect(() => {
    if (searchParams.get('success') !== '1') return;
    setSearchParams({}, { replace: true });
    toast.success('Ödeme tamamlandı! Plan güncelleniyor…');
    pollCount.current = 0;
    setPolling(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!polling || !user) return;
    const tick = async () => {
      pollCount.current += 1;
      const p = await fetchProfile(user.id).catch(() => null);
      if (p) setProfile(p);
      if (p && p.plan !== 'free') {
        setPolling(false);
        toast.success(`Plan ${PLAN_LABEL[p.plan]}'a yükseltildi!`);
        return;
      }
      if (pollCount.current >= MAX_POLLS) {
        setPolling(false);
        toast.info('Plan henüz güncellenmedi. Birkaç dakika içinde otomatik yenilenir.');
        return;
      }
      pollTimer.current = setTimeout(tick, POLL_INTERVAL);
    };
    pollTimer.current = setTimeout(tick, POLL_INTERVAL);
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [polling, user]);

  const upgrade = async (tier: PolarTier) => {
    setBusy(tier);
    try {
      await startCheckout(tier, yearly);
    } catch (e) {
      toast.error(errorMessage(e, messages.billing.checkoutFailed));
      setBusy(null);
    }
  };

  const portal = async () => {
    setBusy('portal');
    try {
      await openCustomerPortal();
    } catch (e) {
      toast.error(errorMessage(e, messages.billing.portalFailed));
      setBusy(null);
    }
  };

  const plan = profile?.plan ?? 'free';
  const limit = PLAN_LIMITS[plan];
  const used = profile?.usage_count ?? 0;
  const resetAt = profile?.usage_reset_at ? new Date(profile.usage_reset_at) : null;
  const usagePct = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="space-y-10">
      <div>
        <Eyebrow>— Fatura</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(40px,5vw,56px)] leading-[1.02] tracking-[-0.02em]">
          Plan ve <em className="italic text-primary">kullanım.</em>
        </h1>
      </div>

      {!supabaseReady && (
        <Card className="border-destructive bg-destructive-tint p-4 text-sm text-ink">
          Supabase yapılandırılmamış. Plan bilgileri görüntülenemiyor.
        </Card>
      )}

      {polling && (
        <Card className="flex items-center gap-3 bg-pop p-4 text-sm">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Plan güncelleniyor, lütfen bekleyin…
        </Card>
      )}

      {loading ? (
        <div className="h-[200px] animate-pulse border-2 border-ink bg-paper shadow-brutal" />
      ) : (
        <Card
          className={`relative p-8 ${
            plan === 'free' ? 'bg-paper' : plan === 'pro' ? 'bg-pop' : 'bg-primary text-white'
          }`}
        >
          {plan !== 'free' && (
            <div className="absolute -top-4 right-6">
              <Sticker color={plan === 'pro' ? 'ink' : 'pop'} rotate={6}>
                ★ Aktif
              </Sticker>
            </div>
          )}
          <Eyebrow color={plan === 'school' ? 'white' : 'ink'}>— Mevcut plan</Eyebrow>
          <div className="mt-2 flex flex-wrap items-baseline gap-4">
            <BigNum className={`text-[88px] ${plan === 'school' ? 'text-white' : 'text-ink'}`}>
              {PLAN_LABEL[plan]}
            </BigNum>
            {plan !== 'free' && <CheckCircle2 className="h-6 w-6" />}
          </div>

          <div className="mt-6 space-y-2">
            <div className={`text-sm ${plan === 'school' ? 'text-white/80' : 'text-ink-muted'}`}>
              Bu ay kullanım
            </div>
            <div className="flex items-baseline gap-2">
              {limit === null ? (
                <span className="font-display text-[44px] leading-none">Sınırsız analiz</span>
              ) : (
                <>
                  <span className="font-display text-[44px] leading-none">{used}</span>
                  <span className="text-sm">/ {limit} analiz</span>
                </>
              )}
            </div>
            {limit !== null && (
              <div className="h-2 max-w-md border-2 border-ink bg-paper">
                <div
                  className={`h-full ${plan === 'school' ? 'bg-white' : 'bg-ink'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            {resetAt && plan === 'free' && (
              <div className="text-xs text-ink-muted">
                Sayaç {resetAt.toLocaleDateString('tr-TR')} tarihinde sıfırlanır
              </div>
            )}
          </div>

          {plan !== 'free' && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                variant={plan === 'school' ? 'pop' : 'ink'}
                size="sm"
                onClick={portal}
                disabled={busy !== null}
                className="gap-2"
              >
                {busy === 'portal' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Aboneliği Yönet
              </Button>
              {plan === 'pro' && (
                <Button
                  variant="paper"
                  size="sm"
                  onClick={portal}
                  disabled={busy !== null}
                  className="gap-2"
                >
                  Okul'a yükselt
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {!loading && plan === 'free' && (
        <div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>— Yükselt</Eyebrow>
              <h2 className="mt-2 font-display text-[32px] leading-tight tracking-[-0.02em]">
                Daha fazlasına hazır mısın?
              </h2>
            </div>
            <div className="inline-flex gap-0">
              <Chip active={!yearly} onClick={() => setYearly(false)}>
                Aylık
              </Chip>
              <Chip active={yearly} onClick={() => setYearly(true)}>
                Yıllık — 2 ay bedava
              </Chip>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <PlanCard
              name="Pro"
              tagline="Öğretmen çantası."
              price={yearly ? PRICES.pro.yearly / 12 : PRICES.pro.monthly}
              yearly={yearly}
              yearlyPrice={PRICES.pro.yearly}
              features={PRO_FEATURES}
              bg="bg-pop"
              ctaVariant="ink"
              busy={busy === 'pro'}
              disabled={busy !== null || polling}
              onCta={() => upgrade('pro')}
              highlight
            />
            <PlanCard
              name="Okul"
              tagline="Tüm öğretmenler odası."
              price={yearly ? PRICES.school.yearly / 12 : PRICES.school.monthly}
              yearly={yearly}
              yearlyPrice={PRICES.school.yearly}
              features={SCHOOL_FEATURES}
              bg="bg-primary"
              textOnDark
              ctaVariant="pop"
              busy={busy === 'school'}
              disabled={busy !== null || polling}
              onCta={() => upgrade('school')}
            />
          </div>

          <div className="mt-6">
            <Link
              to="/pricing"
              className="text-sm font-bold underline underline-offset-2 hover:text-primary"
            >
              Tüm planları karşılaştır →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  yearly,
  yearlyPrice,
  features,
  bg,
  textOnDark,
  ctaVariant,
  busy,
  disabled,
  onCta,
  highlight,
}: {
  name: string;
  tagline: string;
  price: number;
  yearly: boolean;
  yearlyPrice: number;
  features: string[];
  bg: string;
  textOnDark?: boolean;
  ctaVariant: 'ink' | 'pop';
  busy: boolean;
  disabled: boolean;
  onCta: () => void;
  highlight?: boolean;
}) {
  const dark = textOnDark;
  const rounded = Math.round(price);
  return (
    <Card className={`relative p-6 ${bg} ${dark ? 'text-white' : ''}`}>
      {highlight && (
        <div className="absolute -top-4 right-5">
          <Sticker color="red" rotate={6}>
            ★ Popüler
          </Sticker>
        </div>
      )}
      <Eyebrow color={dark ? 'white' : 'ink'}>— {name.toUpperCase()}</Eyebrow>
      <div className="mt-2 font-display text-[32px] leading-tight">{name}</div>
      <div className={`mb-4 text-sm ${dark ? 'text-white/80' : 'opacity-80'}`}>{tagline}</div>
      <div className="flex items-baseline gap-1.5">
        <BigNum className={`text-[72px] ${dark ? 'text-white' : 'text-ink'}`}>
          ${rounded}
        </BigNum>
        <span className={`text-sm ${dark ? 'text-white/70' : 'opacity-70'}`}>/ay</span>
      </div>
      {yearly && (
        <div className={`text-[11px] ${dark ? 'text-white/70' : 'opacity-70'}`}>
          Yıllık ${yearlyPrice} faturalanır
        </div>
      )}
      <Rule className={`my-5 ${dark ? 'bg-white' : 'bg-ink'}`} />
      <div className="mb-6 flex flex-col gap-2">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm">
            <Check className={dark ? 'text-white' : 'text-ink'} />
            {f}
          </div>
        ))}
      </div>
      <Button
        variant={ctaVariant}
        size="md"
        className="w-full justify-center gap-2"
        onClick={onCta}
        disabled={disabled}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Yönlendiriliyor…
          </>
        ) : (
          <>Yükselt →</>
        )}
      </Button>
    </Card>
  );
}
