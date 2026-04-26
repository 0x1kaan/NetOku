// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: delete-account
// POST {} -> { ok: true } | { error: string }
//
// Kullanıcının hesabını ve ilişkili tüm verileri (profiles, analyses, presets) kalıcı olarak siler.
// Aktif aboneliği olan kullanıcılar önce aboneliklerini iptal etmelidir (409).
//
// profiles.id ve analyses/presets.user_id -> auth.users(id) on delete cascade olduğu için
// auth.users'tan silmek profile/analyses/presets kayıtlarını da temizler.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: { 
  env: { get(k: string): string | undefined }; 
  serve: (h: (req: Request) => Response | Promise<Response>) => void 
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Guard: aktif aboneliği olan kullanıcılar önce iptal etmeli
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('plan, polar_subscription_status')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[delete-account] profile fetch', profileErr);
      return json({ error: 'Profile fetch failed' }, 500);
    }

    if (profile && profile.plan !== 'free') {
      return json(
        {
          error:
            'Aktif bir aboneliğiniz var. Önce Fatura sayfasından aboneliğinizi iptal edin, sonra hesabınızı silebilirsiniz.',
        },
        409,
      );
    }

    // auth.users silinince cascade ile profile/analyses/presets de silinir.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      console.error('[delete-account] deleteUser', deleteErr);
      return json({ error: 'Hesap silinemedi.' }, 500);
    }

    console.log('[delete-account] deleted user', user.id);
    return json({ ok: true });
  } catch (e) {
    console.error('[delete-account] unexpected', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
