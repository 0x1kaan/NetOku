// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: send-welcome
// Called by a Supabase Auth Hook (after signup) to send the welcome email.
//
// Deploy: supabase functions deploy send-welcome --no-verify-jwt
//
// Configure in Supabase Dashboard → Authentication → Hooks:
//   Event: "After user is created"
//   HTTP endpoint: https://<project>.supabase.co/functions/v1/send-welcome
//
// Env:
//   SUPABASE_WEBHOOK_SECRET  (set in Dashboard → Auth → Hooks → signing secret)
//   RESEND_API_KEY
//   APP_URL

import { sendEmail, welcomeEmail } from '../_shared/email.ts';

declare const Deno: { 
  env: { get(k: string): string | undefined }; 
  serve: (h: (req: Request) => Response | Promise<Response>) => void 
};

interface AuthHookPayload {
  type?: string;
  record?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  user?: {
    id?: string;
    email?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Verify Supabase hook signature
  const secret = Deno.env.get('SUPABASE_WEBHOOK_SECRET');
  if (secret) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let body: AuthHookPayload;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  // Supabase Auth Hook payload shape: { type: "signup", record: { id, email, ... } }
  const email: string | undefined = body?.record?.email ?? body?.user?.email;
  if (!email) {
    console.warn('[send-welcome] No email in payload:', JSON.stringify(body));
    return new Response('ok', { status: 200 });
  }

  try {
    await sendEmail(welcomeEmail(email));
    console.log('[send-welcome] Sent to', email);
  } catch (e) {
    console.error('[send-welcome] Failed:', e);
    // Return 200 so Supabase doesn't retry indefinitely
  }

  return new Response('ok', { status: 200 });
});
