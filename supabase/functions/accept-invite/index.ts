// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: accept-invite
// POST { token: string } -> { ok: true, orgName: string } | { error: string }
//
// Davet tokenını do�xrular, kullanıcıyı organizasyona ekler, plan'ı school yapar
// ve davette belirtilen rolü profile yazar.

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token?.toString?.().trim?.();
    if (!token) return json({ error: 'Token gerekli.' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: invite } = await admin
      .from('organization_invites')
      .select('id, organization_id, email, role, expires_at, accepted_at')
      .eq('token', token)
      .maybeSingle();

    if (!invite) return json({ error: 'Davet bulunamadı veya geçersiz.' }, 404);
    if (invite.accepted_at) return json({ error: 'Bu davet daha önce kullanılmı�x.' }, 409);
    if (new Date(invite.expires_at) < new Date()) {
      return json({ error: 'Davet süresi dolmu�x. Yöneticiden yeni davet isteyin.' }, 410);
    }

    const { data: org } = await admin
      .from('organizations')
      .select('id, name, seat_limit')
      .eq('id', invite.organization_id)
      .maybeSingle();

    if (!org) return json({ error: 'Organizasyon bulunamadı.' }, 404);

    const { count: memberCount } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    if ((memberCount ?? 0) >= org.seat_limit) {
      return json(
        { error: `Ekip limiti doldu (${org.seat_limit} kullanıcı). Yönetici ile ileti�xime geçin.` },
        409,
      );
    }

    const { data: userProfile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userProfile?.organization_id === org.id) {
      return json({ ok: true, orgName: org.name });
    }

    await admin
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq('id', invite.id);

    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        organization_id: org.id,
        organization_role: invite.role ?? 'teacher',
        plan: 'school',
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('[accept-invite] profile update failed', updateErr);
      return json({ error: 'Ekibe katılma i�xlemi ba�xarısız oldu.' }, 500);
    }

    console.log('[accept-invite] user', user.id, 'joined org', org.id);
    return json({ ok: true, orgName: org.name });
  } catch (e) {
    console.error('[accept-invite] unexpected', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
