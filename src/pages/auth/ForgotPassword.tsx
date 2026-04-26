import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailCheck } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rule } from '@/components/ui/brutal';
import { supabase, supabaseReady } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { errorMessage, messages } from '@/lib/messages';
import { AuthShell } from './AuthShell';

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin.'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!supabaseReady || !supabase) {
      toast.error(messages.infrastructure.supabaseNotConfigured);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSentEmail(data.email);
      track('password_reset_requested');
    } catch (e) {
      toast.error(errorMessage(e, messages.common.genericError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sentEmail ? 'E-postanı kontrol et.' : 'Şifreni sıfırla.'}
      subtitle={
        sentEmail
          ? 'Sıfırlama bağlantısı birkaç dakika içinde gelen kutuna düşer.'
          : 'Hesabına ait e-postayı yaz, yeni parola bağlantısını gönderelim.'
      }
    >
      {sentEmail ? (
        <div className="space-y-4 text-center text-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center border-2 border-ink bg-pop">
            <MailCheck className="h-6 w-6" />
          </div>
          <p className="text-ink-muted">
            <span className="font-semibold text-ink">{sentEmail}</span> adresine şifre sıfırlama
            bağlantısı gönderdik.
          </p>
          <Button asChild variant="ink" className="w-full justify-center">
            <Link to="/auth">Giriş sayfasına dön</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
          <div>
            <Label htmlFor="forgot-email">E-posta</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="hocam@okul.k12.tr"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
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
            Sıfırlama bağlantısı gönder
          </Button>
          <Rule className="my-3" />
          <div className="text-center text-sm">
            <Link to="/auth" className="font-semibold text-primary underline-offset-4 hover:underline">
              Giriş sayfasına dön
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
