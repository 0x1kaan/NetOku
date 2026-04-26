// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: polar-portal
// POST {} -> { url: string }
// Opens Polar customer portal for the authenticated user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: { 
  env: { get(k: string): string | undefined }; 
  serve: (h: (req: Request) => Response | Promise<Response>) => void 
};

const POLAR_BASE =
  (Deno.env.get('POLAR_ENV') ?? 'production') === 'sandbox'
    ? 'https://sandbox-api.polar.sh'
    : 'https://api.polar.sh';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('polar_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.polar_customer_id) {
      return json({ error: 'No subscription found.' }, 404);
    }

    const res = await fetch(`${POLAR_BASE}/v1/customer-sessions/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('POLAR_ORG_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer_id: profile.polar_customer_id }),
    });
    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Polar error: ${text}` }, 502);
    }
    const data = await res.json();
    return json({ url: data.customer_portal_url });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}