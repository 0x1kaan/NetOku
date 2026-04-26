// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: invite-member
// POST { email: string, role?: owner|manager|teacher|viewer } -> { ok: true } | { error: string }
//
// School plan manager/owner kullanıcısı, kendi organizasyonuna yeni üye daveti gönderir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail, teamInviteEmail } from '../_shared/email.ts';

declare const Deno: { 
  env: { get(k: string): string | undefined }; 
  serve: (h: (req: Request) => Response | Promise<Response>) => void 
};

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeRole(input: unknown): 'manager' | 'teacher' | 'viewer' {
  if (input === 'manager' || input === 'viewer') return input;
  return 'teacher';
}

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
    const email: string | undefined = body?.email?.toString?.().trim?.().toLowerCase?.();
    const role = normalizeRole(body?.role);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Geçerli bir e-posta adresi girin.' }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: inviter } = await admin
      .from('profiles')
      .select('plan, email, organization_id, organization_role')
      .eq('id', user.id)
      .maybeSingle();

    if (
      !inviter ||
      inviter.plan !== 'school' ||
      !inviter.organization_id ||
      !['owner', 'manager'].includes(inviter.organization_role ?? '')
    ) {
      return json(
        { error: 'Sadece owner veya manager rolündeki School kullanıcıları ekip davet edebilir.' },
        403,
      );
    }

    const { data: org } = await admin
      .from('organizations')
      .select('id, name, seat_limit')
      .eq('id', inviter.organization_id)
      .maybeSingle();

    if (!org) {
      return json({ error: 'Organizasyon bulunamadı. Lütfen destek ile ileti�xime geçin.' }, 404);
    }

    if (email === inviter.email?.toLowerCase()) {
      return json({ error: 'Kendinizi davet edemezsiniz.' }, 400);
    }

    const { count: memberCount } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id);

    if ((memberCount ?? 0) >= org.seat_limit) {
      return json(
        {
          error: `Ekip limiti doldu (${org.seat_limit} kullanıcı). Limit yükseltmek için destek ile ileti�xime geçin.`,
        },
        409,
      );
    }

    const { data: existingMember } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('organization_id', org.id)
      .maybeSingle();

    if (existingMember) {
      return json({ error: 'Bu kullanıcı zaten ekipte.' }, 409);
    }

    const { data: pending } = await admin
      .from('organization_invites')
      .select('id')
      .eq('organization_id', org.id)
      .eq('email', email)
      .is('accepted_at', null)
      .maybeSingle();

    if (pending) {
      return json({ error: 'Bu e-posta için zaten bekleyen bir davet var.' }, 409);
    }

    const token = generateToken();

    const { error: insertErr } = await admin
      .from('organization_invites')
      .insert({
        organization_id: org.id,
        email,
        role,
        token,
        invited_by: user.id,
      });

    if (insertErr) {
      console.error('[invite-member] insert failed', insertErr);
      return json({ error: 'Davet olu�xturulamadı.' }, 500);
    }

    await sendEmail(
      teamInviteEmail(email, inviter.email ?? 'NetOku kullanıcısı', org.name, token),
    ).catch((e) => console.error('[invite-member] email failed', e));

    return json({ ok: true });
  } catch (e) {
    console.error('[invite-member] unexpected', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
