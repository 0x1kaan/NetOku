import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseReady } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { errorMessage, messages } from '@/lib/messages';
import { AuthShell } from './AuthShell';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const initialEmail = useMemo(
    () => params.get('email') ?? user?.email ?? '',
    [params, user?.email],
  );
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const verified = Boolean(user?.email_confirmed_at);

  useEffect(() => {
    if (verified) {
      const timer = window.setTimeout(() => navigate('/app', { replace: true }), 1000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [navigate, verified]);

  const resend = async () => {
    if (!supabaseReady || !supabase) {
      toast.error(messages.infrastructure.supabaseNotConfigured);
      return;
    }
    if (!email.trim()) {
      toast.error(messages.validation.emailInvalid);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      track('verification_email_resent');
      toast.success('Doğrulama e-postası tekrar gönderildi.');
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.emailSendFailed));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={verified ? 'E-posta doğrulandı.' : 'E-postanı doğrula.'}
      subtitle={
        verified
          ? 'Hesabın aktif. Uygulamaya yönlendiriliyorsun.'
          : 'NetOku hesabını kullanmadan önce gelen kutundaki doğrulama bağlantısına tıkla.'
      }
    >
      <div className="space-y-5 text-sm">
        <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-ink bg-pop">
          <MailCheck className="h-6 w-6" />
        </div>

        {verified ? (
          <Button asChild variant="ink" className="w-full justify-center">
            <Link to="/app">Uygulamaya git</Link>
          </Button>
        ) : (
          <>
            <p className="text-center text-ink-muted">
              Bağlantı gelmediyse spam klasörünü kontrol et veya doğrulama e-postasını tekrar gönder.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="verify-email">E-posta</Label>
              <Input
                id="verify-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="hocam@okul.k12.tr"
                autoComplete="email"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              className="w-full justify-center gap-2"
              onClick={resend}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Doğrulama e-postasını tekrar gönder
            </Button>
            <div className="text-center">
              <Link to="/auth" className="font-semibold text-primary underline-offset-4 hover:underline">
                Giriş sayfasına dön
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthShell>
  );
}
