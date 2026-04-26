// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: polar-checkout
// POST { tier: 'pro' | 'school' } -> { url: string }
//
// Guards:
//   - 401  if the request is not authenticated
//   - 409  if the user already has an active paid subscription
//   - 429  if the user triggered a checkout within the last 60 seconds
//
// Env:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   POLAR_ORG_TOKEN               (Organization Access Token)
//   POLAR_PRODUCT_PRO             (Polar product id - Pro)
//   POLAR_PRODUCT_SCHOOL          (Polar product id - School)
//   POLAR_SUCCESS_URL             (e.g. https://netoku.app/app/billing?success=1)
//   POLAR_ENV                     ('production' | 'sandbox')

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

/** Seconds a user must wait between checkout attempts. */
const RATE_LIMIT_SECONDS = 60;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    // ── Verify the calling user ──────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    // ── Read current profile (admin client to bypass RLS) ────────────────────
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('plan, checkout_attempt_at, tax_id, tax_name, tax_address')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[polar-checkout] profile fetch error', profileErr);
      return json({ error: 'Profile not found' }, 500);
    }

    // ── Guard 1: duplicate subscription ─────────────────────────────────────
    // If the user already has a paid plan they don't need a new checkout.
    if (profile && profile.plan !== 'free') {
      return json(
        { error: 'already_subscribed', plan: profile.plan },
        409
      );
    }

    // ── Parse and validate tier before stamping rate-limit ──────────────────
    let body: { tier?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const { tier, yearly } = body as { tier: 'pro' | 'school'; yearly?: boolean };
    if (tier !== 'pro' && tier !== 'school') {
      return json({ error: 'Invalid tier' }, 400);
    }

    // ── Guard 2: rate limit (60 s cooldown) ──────────────────────────────────
    if (profile?.checkout_attempt_at) {
      const lastAttempt = new Date(profile.checkout_attempt_at).getTime();
      const secondsElapsed = (Date.now() - lastAttempt) / 1000;
      if (secondsElapsed < RATE_LIMIT_SECONDS) {
        const retryAfter = Math.ceil(RATE_LIMIT_SECONDS - secondsElapsed);
        return new Response(
          JSON.stringify({ error: 'rate_limited', retry_after: retryAfter }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          }
        );
      }
    }

    // ── Stamp the attempt timestamp before calling Polar ────────────────────
    await admin
      .from('profiles')
      .update({ checkout_attempt_at: new Date().toISOString() })
      .eq('id', user.id);

    // ── Build Polar checkout session ─────────────────────────────────────────

    let productId: string | undefined;
    if (tier === 'pro') {
      productId = yearly
        ? (Deno.env.get('POLAR_PRODUCT_PRO_YEARLY') || Deno.env.get('POLAR_PRODUCT_PRO'))
        : Deno.env.get('POLAR_PRODUCT_PRO');
    } else {
      productId = yearly
        ? (Deno.env.get('POLAR_PRODUCT_SCHOOL_YEARLY') || Deno.env.get('POLAR_PRODUCT_SCHOOL'))
        : Deno.env.get('POLAR_PRODUCT_SCHOOL');
    }
    if (!productId) return json({ error: 'Product not configured' }, 500);

    const res = await fetch(`${POLAR_BASE}/v1/checkouts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('POLAR_ORG_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: [productId],
        customer_email: user.email,
        customer_external_id: user.id,
        success_url: Deno.env.get('POLAR_SUCCESS_URL'),
        metadata: {
          user_id: user.id,
          tier,
          billing_period: yearly ? 'yearly' : 'monthly',
          ...(profile?.tax_id ? { tax_id: profile.tax_id } : {}),
          ...(profile?.tax_name ? { tax_name: profile.tax_name } : {}),
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[polar-checkout] Polar API error', res.status, text);
      return json({ error: `Polar error: ${text}` }, 502);
    }

    const data = await res.json();
    return json({ url: data.url });
  } catch (e) {
    console.error('[polar-checkout] unexpected error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
