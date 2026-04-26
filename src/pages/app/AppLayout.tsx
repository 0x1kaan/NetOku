import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, FileUp, LogOut, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, Tag } from '@/components/ui/brutal';
import { SupportWidget } from '@/components/SupportWidget';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseReady } from '@/lib/supabase';
import { fetchProfile, PLAN_LIMITS, type Profile } from '@/lib/db';
import { errorMessage, messages } from '@/lib/messages';

const navItems = [
  { to: '/app', label: 'Özet', end: true, id: 'dashboard' },
  { to: '/app/analyze', label: 'Yeni Analiz', id: 'analyze' },
  { to: '/app/history', label: 'Geçmiş', id: 'history' },
  { to: '/app/insights', label: 'İçgörüler', id: 'insights' },
  { to: '/app/presets', label: "Preset'ler", id: 'presets' },
  { to: '/app/billing', label: 'Fatura', id: 'billing' },
  { to: '/app/settings', label: 'Ayarlar', id: 'settings' },
];

const pageTitleMap: Record<string, string> = {
  '/app': 'Özet',
  '/app/analyze': 'Yeni Analiz',
  '/app/history': 'Geçmiş',
  '/app/insights': 'İçgörüler',
  '/app/presets': "Preset'ler",
  '/app/billing': 'Fatura',
  '/app/settings': 'Ayarlar',
};

function NavItem({
  to,
  end,
  label,
  badge,
}: {
  to: string;
  end?: boolean;
  label: string;
  badge?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'mb-1 flex items-center justify-between px-3.5 py-2.5 text-sm font-medium transition-all duration-100',
          isActive
            ? '-translate-x-px -translate-y-px border-2 border-ink bg-ink font-bold text-white shadow-[3px_3px_0_0_#0A0A0A]'
            : 'border-2 border-transparent text-ink hover:bg-ink/5',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span>{label}</span>
          {badge && !isActive && (
            <Tag color="pop" textColor="ink">
              {badge}
            </Tag>
          )}
        </>
      )}
    </NavLink>
  );
}

export function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const emailUnverified = Boolean(
    user && user.app_metadata?.provider === 'email' && !user.email_confirmed_at,
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetchProfile(user.id)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  const resendVerification = async () => {
    if (!supabase || !user?.email) return;
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      toast.success('Doğrulama e-postası tekrar gönderildi.');
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.emailSendFailed));
    } finally {
      setResendingVerification(false);
    }
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && supabaseReady && !user) navigate('/auth', { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-cream">
        <aside className="hidden w-60 border-r-2 border-ink bg-paper md:block" />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="h-10 w-48 animate-pulse border-2 border-ink bg-paper" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse border-2 border-ink bg-paper shadow-brutal" />
              ))}
            </div>
            <div className="h-48 animate-pulse border-2 border-ink bg-paper shadow-brutal" />
          </div>
        </main>
      </div>
    );
  }

  const planLabel =
    profile?.plan === 'pro' ? 'Pro plan'
    : profile?.plan === 'school' ? 'Okul plan'
    : 'Tadımlık plan';
  const usageLimit = profile ? PLAN_LIMITS[profile.plan] : null;
  const usageCount = profile?.usage_count ?? 0;
  const usagePct =
    usageLimit === null || usageLimit === 0
      ? 0
      : Math.min(100, Math.round((usageCount / usageLimit) * 100));
  const showUsage = profile?.plan === 'free' && usageLimit !== null;

  const Sidebar = ({ onClose }: { onClose?: () => void }) => (
    <>
      <div className="flex items-center justify-between border-b-2 border-ink px-5 py-5">
        <Link to="/app" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="grid h-[34px] w-[34px] place-items-center border-2 border-ink bg-primary font-display text-[20px] text-white shadow-brutal-sm">
            N
          </div>
          <span className="font-display text-[24px] leading-none">NetOku</span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Menüyü kapat">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <nav className="flex-1 p-3" aria-label="Ana menü">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            end={item.end}
            label={item.label}
            badge={item.id === 'analyze' ? 'Yeni' : undefined}
          />
        ))}
      </nav>

      {showUsage && (
        <div className="border-t-2 border-ink bg-pop p-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em]">Bu ay</div>
          <div className="mb-2.5 flex items-baseline gap-1">
            <span className="font-display text-[44px] leading-none">{usageCount}</span>
            <span className="text-sm">/ {usageLimit ?? '∞'} analiz</span>
          </div>
          <div className="h-2 border-2 border-ink bg-paper">
            <div className="h-full bg-ink" style={{ width: `${usagePct}%` }} />
          </div>
          <Link
            to="/app/billing"
            onClick={onClose}
            className="mt-2.5 inline-block text-xs font-bold underline underline-offset-2"
          >
            Pro'ya geç →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-2.5 border-t-2 border-ink p-3.5">
        <Avatar name={user?.email ?? '?'} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-bold">{user?.email ?? 'Misafir'}</div>
          <div className="text-[11px] text-ink-muted">{planLabel}</div>
        </div>
        <button
          onClick={() => {
            signOut();
            navigate('/');
          }}
          title="Çıkış"
          aria-label="Çıkış"
          className="p-1 text-ink hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  const pageTitle = location.pathname.startsWith('/app/students/')
    ? 'Öğrenci'
    : pageTitleMap[location.pathname] ?? 'NetOku';

  return (
    <div className="flex min-h-screen bg-cream font-sans text-ink">
      <a href="#main-content" className="skip-link">
        Ana içeriğe atla
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r-2 border-ink bg-paper md:flex">
        <Sidebar />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b-2 border-ink bg-cream px-4 py-3 md:hidden">
          <Link to="/app" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center border-2 border-ink bg-primary font-display text-sm text-white shadow-brutal-xs">
              N
            </div>
            <span className="font-display text-[20px] leading-none">NetOku</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {/* Desktop top bar */}
        <div className="sticky top-0 z-10 hidden h-16 items-center justify-between border-b-2 border-ink bg-cream px-8 md:flex">
          <div className="font-display text-[26px] leading-none">{pageTitle}</div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/analyze')}
            className="gap-2"
          >
            <FileUp className="h-4 w-4" />
            Yeni Analiz
          </Button>
        </div>

        {/* Mobile slide-over */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r-2 border-ink bg-paper shadow-brutal-xl">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden focus:outline-none">
          {emailUnverified && (
            <div className="border-b-2 border-ink bg-pop px-4 py-3 text-sm text-ink">
              <div className="container mx-auto flex flex-wrap items-center gap-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span className="flex-1 font-medium">
                  E-posta adresin henüz doğrulanmadı. Bazı özellikler sınırlı olabilir.
                </span>
                <Button
                  size="sm"
                  variant="ink"
                  onClick={resendVerification}
                  disabled={resendingVerification}
                >
                  {resendingVerification ? 'Gönderiliyor…' : 'Tekrar Gönder'}
                </Button>
              </div>
            </div>
          )}
          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <SupportWidget />
    </div>
  );
}
