// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: polar-webhook
// Receives Polar webhook events, verifies signature, updates profiles + sends emails.
// Idempotent via webhook_events table (event_id UNIQUE).
//
// Deploy: supabase functions deploy polar-webhook --no-verify-jwt
//
// Env:
//   POLAR_WEBHOOK_SECRET   (Polar webhook signing secret)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY         (for transactional emails)
//   APP_URL                (e.g. https://netoku.app)
//   POLAR_PRODUCT_PRO, POLAR_PRODUCT_SCHOOL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import {
  sendEmail,
  subscriptionCancelledEmail,
  subscriptionConfirmedEmail,
} from '../_shared/email.ts';

declare const Deno: { 
  env: { get(k: string): string | undefined }; 
  serve: (h: (req: Request) => Response | Promise<Response>) => void 
};

interface PolarWebhookEvent {
  id?: string;
  type: string;
  data?: {
    id?: string;
    customer_id?: string;
    customer_external_id?: string;
    product_id?: string;
    status?: string;
    metadata?: {
      user_id?: string;
      [key: string]: unknown;
    };
    customer?: {
      external_id?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type Plan = 'free' | 'pro' | 'school';

function planFromProduct(productId: string | undefined): Plan | null {
  if (!productId) return null;
  if (productId === Deno.env.get('POLAR_PRODUCT_PRO')) return 'pro';
  if (productId === Deno.env.get('POLAR_PRODUCT_PRO_YEARLY')) return 'pro';
  if (productId === Deno.env.get('POLAR_PRODUCT_SCHOOL')) return 'school';
  if (productId === Deno.env.get('POLAR_PRODUCT_SCHOOL_YEARLY')) return 'school';
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  const secret = Deno.env.get('POLAR_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook secret not configured', { status: 500 });

  let event: PolarWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(rawBody, {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
    });
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── Idempotency ─────────────────────────────────────────────
  // webhook-id header is the standard dedup key; fall back to event.id
  // or timestamp-based composite if missing.
  const eventId: string =
    req.headers.get('webhook-id') ?? event?.id ?? `${event?.type}-${event?.data?.id ?? ''}-${Date.now()}`;
  const eventType: string = event?.type ?? 'unknown';

  const { error: dupErr } = await admin
    .from('webhook_events')
    .insert({ event_id: eventId, event_type: eventType });

  if (dupErr) {
    // unique_violation (23505) → already processed; return 200 so Polar stops retrying.
    if ('code' in dupErr && (dupErr as { code: string }).code === '23505') {
      console.log('[webhook] duplicate event ignored:', eventId);
      return new Response('ok (duplicate)', { status: 200 });
    }
    console.error('[webhook] idempotency insert failed:', dupErr);
    // Don't fail the webhook on a log error; continue processing.
  }

  const sub = event?.data;
  const userId: string | undefined =
    sub?.metadata?.user_id ?? sub?.customer?.external_id ?? sub?.customer_external_id;
  if (!userId) return new Response('No user id', { status: 200 });

  const type: string = event.type;

  if (type === 'subscription.created' || type === 'subscription.updated') {
    const plan = planFromProduct(sub?.product_id) ?? 'pro';
    const isActive = sub?.status === 'active';

    await admin
      .from('profiles')
      .update({
        plan: isActive ? plan : 'free',
        polar_customer_id: sub?.customer_id ?? null,
        polar_subscription_id: sub?.id ?? null,
        polar_subscription_status: sub?.status ?? null,
      })
      .eq('id', userId);

    // School plan: ensure organization exists, link owner profile to it.
    if (isActive && plan === 'school' && sub?.id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, organization_id')
        .eq('id', userId)
        .maybeSingle();

      // Find existing org by subscription id OR create one.
      const { data: existingOrg } = await admin
        .from('organizations')
        .select('id')
        .eq('polar_subscription_id', sub.id)
        .maybeSingle();

      let orgId = existingOrg?.id as string | undefined;

      if (!orgId) {
        const orgName = profile?.email
          ? `${profile.email.split('@')[0]} Okul`
          : 'NetOku Okul';
        const { data: newOrg, error: orgErr } = await admin
          .from('organizations')
          .insert({
            owner_id: userId,
            name: orgName,
            seat_limit: 5,
            polar_subscription_id: sub.id,
          })
          .select('id')
          .single();

        if (orgErr) {
          console.error('[webhook] org create failed:', orgErr);
        } else {
          orgId = newOrg?.id;
        }
      }

      if (orgId && profile?.organization_id !== orgId) {
        await admin
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('id', userId);
      }
    }

    // Send confirmation email for new active subscriptions
    if (isActive && type === 'subscription.created') {
      const { data: profile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.email) {
        await sendEmail(subscriptionConfirmedEmail(profile.email, plan)).catch((e) =>
          console.error('[webhook] subscription email failed:', e)
        );
      }
    }
  } else if (
    type === 'subscription.canceled' ||
    type === 'subscription.revoked'
  ) {
    // If this was a School subscription, unwind the org: demote all members and delete.
    if (sub?.id) {
      const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('polar_subscription_id', sub.id)
        .maybeSingle();

      if (org?.id) {
        // Demote all member profiles (owner + invitees).
        await admin
          .from('profiles')
          .update({ plan: 'free', organization_id: null })
          .eq('organization_id', org.id);

        // Delete org (CASCADE removes invites).
        await admin.from('organizations').delete().eq('id', org.id);
      }
    }

    await admin
      .from('profiles')
      .update({
        plan: 'free',
        polar_subscription_status: sub?.status ?? 'canceled',
      })
      .eq('id', userId);

    // Send cancellation email
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.email) {
      await sendEmail(subscriptionCancelledEmail(profile.email)).catch((e) =>
        console.error('[webhook] cancellation email failed:', e)
      );
    }
  }

  return new Response('ok', { status: 200 });
});
