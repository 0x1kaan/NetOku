import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Arrow, Rule } from '@/components/ui/brutal';
import { supabase, supabaseReady } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { track } from '@/lib/analytics';
import { errorMessage, messages } from '@/lib/messages';
import {
  checkLockout,
  clearAuthFailures,
  recordAuthFailure,
  AUTH_RATE_LIMIT_CONFIG,
} from '@/lib/authRateLimit';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin.'),
  password: z.string().min(6, 'En az 6 karakter.'),
});
const resetSchema = z.object({ email: z.string().email('Geçerli bir e-posta girin.') });
const updateSchema = z
  .object({
    password: z.string().min(8, 'En az 8 karakter.'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Parolalar eşleşmiyor.',
    path: ['confirm'],
  });
type FormData = z.infer<typeof schema>;
type ResetData = z.infer<typeof resetSchema>;
type UpdateData = z.infer<typeof updateSchema>;

type Mode = 'signin' | 'signup' | 'reset' | 'update-password';

export function Auth() {
  const [params] = useSearchParams();
  const refCode = params.get('ref');
  if (refCode) sessionStorage.setItem('netoku_ref', refCode);
  const rawMode = params.get('mode');
  const initialMode: Mode =
    rawMode === 'signup'
      ? 'signup'
      : rawMode === 'update-password'
      ? 'update-password'
      : 'signin';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && mode !== 'update-password') navigate('/app', { replace: true });
  }, [user, mode, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetData>({ resolver: zodResolver(resetSchema) });
  const {
    register: registerUpdate,
    handleSubmit: handleUpdateSubmit,
    formState: { errors: updateErrors },
  } = useForm<UpdateData>({ resolver: zodResolver(updateSchema) });

  const signInWithGoogle = async () => {
    if (!supabaseReady || !supabase) return;
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (e) {
      toast.error(errorMessage(e, messages.auth.googleSignInFailed));
      setOauthLoading(false);
    }
  };

  const onUpdate = async (data: UpdateData) => {
    if (!supabaseReady || !supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      setPasswordUpdated(true);
      toast.success(messages.settings.passwordUpdated);
    } catch (e) {
      toast.error(errorMessage(e, messages.common.genericError));
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (data: ResetData) => {
    if (!supabaseReady || !supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (e) {
      toast.error(errorMessage(e, messages.common.genericError));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!supabaseReady || !supabase) {
      toast.error('Supabase yapılandırılmamış. Lütfen .env dosyasını kontrol edin.');
      return;
    }
    const lockoutSeconds = checkLockout(data.email);
    if (lockoutSeconds !== null) {
      toast.error(messages.auth.rateLimited(lockoutSeconds));
      return;
    }
    const sb = supabase;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data: signUpData, error } = await sb.auth.signUp({
          email: data.email,
          password: data.password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        track('signup_completed');
        const pendingRef = sessionStorage.getItem('netoku_ref');
        if (pendingRef && signUpData.user) {
          const newUserId = signUpData.user.id;
          try {
            const { data: referrer } = await sb
              .from('profiles')
              .select('id')
              .eq('referral_code', pendingRef)
              .maybeSingle();
            if (referrer?.id) {
              await sb.from('profiles').update({ referred_by: referrer.id }).eq('id', newUserId);
            }
          } catch {
            // attribution is non-blocking
          } finally {
            sessionStorage.removeItem('netoku_ref');
          }
        }
        if (signUpData.session) {
          navigate('/app', { replace: true });
        } else {
          navigate(`/verify-email?email=${encodeURIComponent(data.email)}`, { replace: true });
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        clearAuthFailures(data.email);
        track('signin_completed');
        navigate('/app', { replace: true });
      }
    } catch (e) {
      if (mode === 'signin') {
        const state = recordAuthFailure(data.email);
        if (state.lockoutUntil > Date.now()) {
          const seconds = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
          toast.error(messages.auth.rateLimited(seconds));
        } else {
          const remaining = AUTH_RATE_LIMIT_CONFIG.MAX_FAILURES - state.failures;
          toast.error(
            `${errorMessage(e, messages.common.genericError)} (${remaining} deneme kaldı)`,
          );
        }
      } else {
        toast.error(errorMessage(e, messages.common.genericError));
      }
    } finally {
      setLoading(false);
    }
  };

  const title = signupEmail
    ? 'E-postanı kontrol et.'
    : mode === 'signup'
    ? 'Hoş geldin.'
    : mode === 'reset'
    ? 'Unuttun mu?'
    : mode === 'update-password'
    ? 'Yeni parola.'
    : 'Tekrar hoş geldin.';

  const subtitle = signupEmail
    ? 'Hesabını aktifleştirmek için postandaki bağlantıya tıkla.'
    : mode === 'signup'
    ? 'Deneme analizlerini özgürce yap.'
    : mode === 'reset'
    ? 'Sıfırlama bağlantısı gönderelim.'
    : mode === 'update-password'
    ? 'Hesabın için yeni bir parola belirle.'
    : 'Hesabına devam et.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6 py-10 font-sans text-ink">
      <div className="w-full max-w-[440px]">
        <Link to="/" className="mb-7 inline-flex items-center gap-2.5">
          <div className="grid h-11 w-11 place-items-center border-2 border-ink bg-primary font-display text-[26px] text-white shadow-[3px_3px_0_0_#0A0A0A]">
            N
          </div>
          <span className="font-display text-[32px] leading-none">NetOku</span>
        </Link>

        <Card className="p-8">
          <h2 className="mb-1.5 font-display text-[36px] leading-[1.05] tracking-[-0.02em]">
            {title}
          </h2>
          <p className="mb-6 text-sm text-ink-muted">{subtitle}</p>

          {!supabaseReady && (
            <div className="mb-4 border-2 border-destructive bg-destructive-tint p-3 text-xs text-ink">
              Supabase ortam değişkenleri tanımlanmamış.{' '}
              <code className="font-mono">.env</code> dosyasına <code className="font-mono">VITE_SUPABASE_URL</code> ve{' '}
              <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> ekleyin.
            </div>
          )}

          {/* Success / info states */}
          {signupEmail ? (
            <div className="space-y-4 text-center text-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-ink bg-pop">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-ink">E-postanı kontrol et</p>
                <p className="mt-1 text-ink-muted">
                  <span className="font-semibold text-ink">{signupEmail}</span> adresine bir
                  doğrulama bağlantısı gönderdik. Hesabını aktifleştirmek için bağlantıya tıkla.
                </p>
              </div>
              <button
                className="font-semibold text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setSignupEmail(null);
                  setMode('signin');
                }}
              >
                Giriş sayfasına dön
              </button>
            </div>
          ) : mode === 'update-password' ? (
            passwordUpdated ? (
              <div className="space-y-4 text-center text-sm">
                <p className="text-ink-muted">Parolan başarıyla güncellendi.</p>
                <button
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => navigate('/app', { replace: true })}
                >
                  Uygulamaya git
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateSubmit(onUpdate)} className="flex flex-col gap-3.5">
                <div>
                  <Label htmlFor="new-password">Yeni Parola</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    {...registerUpdate('password')}
                  />
                  {updateErrors.password && (
                    <p className="mt-1 text-xs text-destructive">{updateErrors.password.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirm-password">Parola Tekrar</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    {...registerUpdate('confirm')}
                  />
                  {updateErrors.confirm && (
                    <p className="mt-1 text-xs text-destructive">{updateErrors.confirm.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="mt-1.5 w-full justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Parolayı güncelle <Arrow className="text-white" />
                    </>
                  )}
                </Button>
              </form>
            )
          ) : mode === 'reset' ? (
            resetSent ? (
              <div className="space-y-4 text-center text-sm">
                <p className="text-ink-muted">
                  Şifre sıfırlama bağlantısı e-postana gönderildi. Gelen kutunu kontrol et.
                </p>
                <button
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode('signin');
                    setResetSent(false);
                  }}
                >
                  Giriş sayfasına dön
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit(onReset)} className="flex flex-col gap-3.5">
                <div>
                  <Label htmlFor="reset-email">E-posta</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    {...registerReset('email')}
                  />
                  {resetErrors.email && (
                    <p className="mt-1 text-xs text-destructive">{resetErrors.email.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="mt-1.5 w-full justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Bağlantı gönder <Arrow className="text-white" />
                    </>
                  )}
                </Button>
                <Rule className="my-3" />
                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                    onClick={() => setMode('signin')}
                  >
                    Giriş sayfasına dön
                  </button>
                </div>
              </form>
            )
          ) : (
            <>
              <Button
                type="button"
                variant="paper"
                size="lg"
                className="mb-4 w-full justify-center gap-2.5"
                disabled={oauthLoading || loading}
                onClick={signInWithGoogle}
              >
                {oauthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                Google ile devam et
              </Button>
              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-ink-dim">
                <span className="h-[2px] flex-1 bg-ink/20" />
                veya e-posta ile
                <span className="h-[2px] flex-1 bg-ink/20" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
                <div>
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="hocam@okul.k12.tr"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Parola</Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted underline-offset-4 hover:underline"
                        onClick={() => navigate('/forgot-password')}
                      >
                        Unuttum
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="mt-1.5 w-full justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signup' ? 'Hesap oluştur' : 'Giriş yap'}{' '}
                      <Arrow className="text-white" />
                    </>
                  )}
                </Button>
              </form>

              <Rule className="my-6" />
              <div className="text-center text-sm">
                {mode === 'signup' ? (
                  <>
                    Hesabın var mı?{' '}
                    <button
                      className="font-bold text-primary underline-offset-4 hover:underline"
                      onClick={() => setMode('signin')}
                    >
                      Giriş yap
                    </button>
                  </>
                ) : (
                  <>
                    Hesabın yok mu?{' '}
                    <button
                      className="font-bold text-primary underline-offset-4 hover:underline"
                      onClick={() => setMode('signup')}
                    >
                      Kayıt ol
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
