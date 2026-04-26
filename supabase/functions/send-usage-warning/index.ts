// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: send-usage-warning
// Called by the frontend after increment_usage returns usage_warning_sent=true.
// Sends a "limit approaching" email to the user.
//
// Deploy: supabase functions deploy send-usage-warning
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY, APP_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail, usageLimitWarningEmail } from '../_shared/email.ts';

declare const Deno: { 
  env: { get(k: string): string | undefined }; 
  serve: (h: (req: Request) => Response | Promise<Response>) => void 
};

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
    if (!user?.email) return json({ error: 'Unauthorized' }, 401);

    // Fetch current usage from admin client to get accurate numbers
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await admin
      .from('profiles')
      .select('usage_count, plan, usage_warning_sent')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.plan !== 'free' || !profile.usage_warning_sent) {
      return json({ skipped: true });
    }

    // Must stay in sync with the `increment_usage` SQL function in migration 0002.
    const PLAN_LIMITS: Record<string, number> = { free: 2 };
    const limit = PLAN_LIMITS[profile.plan] ?? 2;
    await sendEmail(usageLimitWarningEmail(user.email, profile.usage_count, limit));

    return json({ sent: true });
  } catch (e) {
    console.error('[send-usage-warning]', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
