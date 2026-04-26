import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileSpreadsheet, FileUp, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UsageBanner } from '@/components/ui/usage-banner';
import { Avatar, BigNum, Eyebrow, Sticker, Tag } from '@/components/ui/brutal';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { useAuth } from '@/lib/auth';
import { fetchProfile, listAnalyses, type AnalysisRecord, type Profile } from '@/lib/db';
import { supabaseReady } from '@/lib/supabase';

const PLAN_LABEL: Record<Profile['plan'], string> = {
  free: 'Tadımlık',
  pro: 'Pro',
  school: 'Okul',
};

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Günaydın';
  if (h < 17) return 'İyi günler';
  return 'İyi akşamlar';
}

export function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recent, setRecent] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabaseReady) {
      // Use setTimeout to defer setState to avoid synchronous call in effect
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }
    Promise.all([fetchProfile(user.id), listAnalyses(user.id, 5)])
      .then(([p, a]) => {
        setProfile(p);
        setRecent(a);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const plan = profile?.plan ?? 'free';
  const now = new Date();
  const greeting = greetingFor(now);
  const dateStr = now.toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const totalLabel = recent.length === 5 ? '5+' : String(recent.length);
  const lastAnalysis = recent[0];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>— {dateStr}</Eyebrow>
          <h1 className="mt-3 font-display text-[clamp(44px,6vw,64px)] leading-[1.02] tracking-[-0.02em]">
            {greeting},{' '}
            <em className="italic text-primary">hocam.</em>
          </h1>
          <p className="mt-2 text-[15px] text-ink-muted">
            Bugün neye bakalım?
          </p>
        </div>
        <div className="flex items-center gap-4">
          {recent.length > 0 && (
            <Sticker color="pop" rotate={-4}>
              ★ {recent.length} analiz
            </Sticker>
          )}
          <Link to="/app/analyze">
            <Button variant="primary" size="md" className="gap-2">
              <FileUp className="h-4 w-4" />
              Yeni Analiz
            </Button>
          </Link>
        </div>
      </div>

      {!loading && <UsageBanner profile={profile} />}

      {/* Onboarding banner — only before first analysis */}
      {!loading && recent.length === 0 && <OnboardingBanner />}

      {/* Stat cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-[180px] animate-pulse p-6" />
          ))
        ) : (
          <>
            <Card className="p-6">
              <Eyebrow>— Toplam</Eyebrow>
              <div className="mt-3 flex items-baseline gap-2">
                <BigNum className="text-[72px]">{totalLabel}</BigNum>
                <span className="text-sm text-ink-muted">analiz</span>
              </div>
              <div className="mt-2 text-sm text-ink-muted">Kaydedilen çalışmalar</div>
            </Card>

            <Card className="bg-pop p-6">
              <Eyebrow>— Son analiz</Eyebrow>
              <div className="mt-3 font-display text-[32px] leading-tight">
                {lastAnalysis ? timeAgo(lastAnalysis.created_at) : 'Henüz yok'}
              </div>
              <div className="mt-2 truncate text-sm text-ink/80">
                {lastAnalysis?.title ?? 'İlk analizini yap'}
              </div>
            </Card>

            <Card className="bg-primary p-6 text-white">
              <Eyebrow color="white">— Plan</Eyebrow>
              <div className="mt-3 font-display text-[32px] leading-tight text-white">
                {PLAN_LABEL[plan]}
              </div>
              <div className="mt-2 text-sm text-white/80">
                {plan === 'free' ? (
                  <Link to="/app/billing" className="font-bold underline underline-offset-2">
                    Pro'ya geç →
                  </Link>
                ) : (
                  'Aktif abonelik'
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Recent analyses */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <Eyebrow>— Son analizler</Eyebrow>
            <h2 className="mt-2 font-display text-[32px] leading-tight tracking-[-0.02em]">
              Geçmişin
            </h2>
          </div>
          <Link
            to="/app/history"
            className="text-sm font-bold underline underline-offset-2 hover:text-primary"
          >
            Tümünü gör →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse border-2 border-ink bg-paper shadow-brutal-sm"
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyHistoryState />
        ) : (
          <div className="space-y-3">
            {recent.map((a) => (
              <Link
                key={a.id}
                to={`/app/history`}
                className="flex items-center gap-4 border-2 border-ink bg-paper p-4 shadow-brutal-sm transition-all duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal"
              >
                <Avatar name={a.title} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[20px] leading-tight">
                    {a.title}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {a.student_count} öğrenci · {a.summary.courses.length} ders
                  </div>
                </div>
                <Tag color="paper" textColor="ink">
                  {timeAgo(a.created_at)}
                </Tag>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <Eyebrow>— Kısayollar</Eyebrow>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <QuickCard
            to="/app/analyze"
            bg="bg-pop"
            label="Yeni Analiz"
            desc=".txt yükle, 2 dk"
          />
          <QuickCard
            to="/app/presets"
            bg="bg-primary-tint"
            label="Preset'ler"
            desc="Şablon kaydet / yükle"
          />
          <QuickCard
            to="/app/billing"
            bg="bg-destructive-tint"
            label="Plan"
            desc={`Şu an: ${PLAN_LABEL[plan]}`}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyHistoryState() {
  return (
    <div className="relative border-2 border-dashed border-ink bg-paper p-10 shadow-brutal-sm">
      <div className="absolute -top-4 right-6">
        <Sticker color="pop" rotate={6}>
          ✨ İlk adım
        </Sticker>
      </div>
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center border-2 border-ink bg-primary-tint">
          <FileSpreadsheet className="h-8 w-8" />
        </div>
        <h3 className="font-display text-[28px] leading-tight tracking-[-0.02em]">
          Buraya geçmiş analizlerin gelecek
        </h3>
        <p className="mt-3 text-sm text-ink-muted">
          İlk analizini yaptığında ders netleri, öğrenci raporları ve Excel çıktıları
          burada birikmeye başlar. 2 dakikada ilk dosyanı dene.
        </p>

        <div className="mt-6 grid gap-2 text-left text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2 border-2 border-ink bg-cream p-3">
            <Zap className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-bold">Hızlı</div>
              <div className="text-xs text-ink-muted">Yükle, eşle, analiz</div>
            </div>
          </div>
          <div className="flex items-start gap-2 border-2 border-ink bg-cream p-3">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-bold">Ayrıntılı</div>
              <div className="text-xs text-ink-muted">Ders bazlı net</div>
            </div>
          </div>
          <div className="flex items-start gap-2 border-2 border-ink bg-cream p-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-bold">Paylaşılabilir</div>
              <div className="text-xs text-ink-muted">Excel + link</div>
            </div>
          </div>
        </div>

        <Link to="/app/analyze" className="mt-6 inline-block">
          <Button variant="ink" size="md" className="gap-2">
            <FileUp className="h-4 w-4" /> İlk Analizimi Yap
          </Button>
        </Link>
      </div>
    </div>
  );
}

function QuickCard({
  to,
  bg,
  label,
  desc,
}: {
  to: string;
  bg: string;
  label: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className={`group block border-2 border-ink p-5 shadow-brutal-sm transition-all duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal ${bg}`}
    >
      <div className="font-display text-[26px] leading-tight">{label}</div>
      <div className="mt-1 text-sm text-ink/80">{desc}</div>
      <div className="mt-4 text-sm font-bold">→</div>
    </Link>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa önce`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}g önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
}
