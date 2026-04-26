import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, supabaseReady } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { track } from '@/lib/analytics';
import { errorMessage, messages } from '@/lib/messages';
import { AuthShell } from './AuthShell';

const schema = z
  .object({
    password: z.string().min(8, 'En az 8 karakter.'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Parolalar eşleşmiyor.',
    path: ['confirm'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPassword() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!updated) return;
    const timer = window.setTimeout(() => navigate('/app', { replace: true }), 1200);
    return () => window.clearTimeout(timer);
  }, [navigate, updated]);

  const onSubmit = async (data: FormData) => {
    if (!supabaseReady || !supabase) {
      toast.error(messages.infrastructure.supabaseNotConfigured);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      setUpdated(true);
      track('password_reset_completed');
      toast.success(messages.settings.passwordUpdated);
    } catch (e) {
      toast.error(errorMessage(e, messages.settings.passwordUpdateFailed));
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <AuthShell title="Bağlantı kontrol ediliyor." subtitle="Şifre sıfırlama oturumu hazırlanıyor.">
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Yükleniyor...
        </div>
      </AuthShell>
    );
  }

  if (!user) {
    return (
      <AuthShell
        title="Bağlantı geçersiz."
        subtitle="Sıfırlama bağlantısının süresi dolmuş veya tarayıcı oturumu açılamamış olabilir."
      >
        <div className="space-y-3 text-sm">
          <p className="text-ink-muted">
            Yeni bir sıfırlama bağlantısı isteyip gelen e-postadaki bağlantıyı aynı tarayıcıda aç.
          </p>
          <Button asChild variant="primary" className="w-full justify-center">
            <Link to="/forgot-password">Yeni bağlantı iste</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={updated ? 'Parolan güncellendi.' : 'Yeni parola belirle.'}
      subtitle={
        updated
          ? 'Birazdan uygulamaya yönlendirileceksin.'
          : 'Hesabın için güçlü ve yeni bir parola seç.'
      }
    >
      {updated ? (
        <Button asChild variant="ink" className="w-full justify-center">
          <Link to="/app">Uygulamaya git</Link>
        </Button>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
          <div>
            <Label htmlFor="new-password">Yeni Parola</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm-password">Parola Tekrar</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
            />
            {errors.confirm && (
              <p className="mt-1 text-xs text-destructive">{errors.confirm.message}</p>
            )}
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-1.5 w-full justify-center gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Parolayı güncelle
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
