import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { acceptInvite } from '@/lib/team';
import { supabaseReady } from '@/lib/supabase';

type State = 'loading' | 'needs-auth' | 'success' | 'error';

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<State>('loading');
  const [orgName, setOrgName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (loading) return;

    const processInvite = async () => {
      if (!user && supabaseReady) {
        setState('needs-auth');
        return;
      }

      if (!token) {
        setState('error');
        setErrorMsg('Geçersiz davet bağlantısı.');
        return;
      }

      try {
        const { orgName: name } = await acceptInvite(token);
        setOrgName(name);
        setState('success');
        setTimeout(() => navigate('/app', { replace: true }), 2500);
      } catch (e) {
        setState('error');
        setErrorMsg((e as Error).message);
      }
    };

    processInvite();

  }, [loading, user, token, navigate]);

  const loginUrl = `/auth?redirect=/invite/${token ?? ''}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md border-2 border-ink bg-paper p-8 text-center shadow-brutal">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-xl mb-6">
          <span className="grid h-8 w-8 place-items-center border-2 border-ink bg-pop text-ink">N</span>
          NetOku
        </Link>

        {state === 'loading' && (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-ink" />
            <p className="text-sm text-ink-muted">Davet doğrulanıyor…</p>
          </div>
        )}

        {state === 'needs-auth' && (
          <div className="space-y-4">
            <h1 className="font-display text-[24px] leading-tight">Ekip davetiniz var</h1>
            <p className="text-sm text-ink-muted">
              Daveti kabul etmek için NetOku hesabınıza giriş yapın. Hesabınız yoksa ücretsiz oluşturabilirsiniz.
            </p>
            <Link to={loginUrl}>
              <Button variant="ink" className="w-full">Giriş Yap / Kayıt Ol</Button>
            </Link>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-ink bg-success-tint">
              <CheckCircle2 className="h-7 w-7 text-ink" />
            </div>
            <h1 className="font-display text-[24px] leading-tight">Ekibe katıldınız!</h1>
            <p className="text-sm text-ink-muted">
              <strong>{orgName}</strong> ekibine başarıyla katıldınız. School plan avantajları hesabınıza uygulandı.
            </p>
            <p className="text-xs text-ink-muted">Panele yönlendiriliyorsunuz…</p>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center border-2 border-ink bg-destructive-tint">
              <XCircle className="h-7 w-7 text-ink" />
            </div>
            <h1 className="font-display text-[24px] leading-tight">Davet kabul edilemedi</h1>
            <p className="text-sm text-ink-muted">{errorMsg}</p>
            <div className="flex gap-2">
              <Link to="/app" className="flex-1">
                <Button variant="ink" className="w-full">Panele Git</Button>
              </Link>
              <Link to="/contact" className="flex-1">
                <Button variant="paper" className="w-full">Destek</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
