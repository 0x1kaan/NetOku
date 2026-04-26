import { requireSupabase } from './supabase';
import { trackCheckoutStarted } from './analytics';
import { messages } from './messages';

export type PolarTier = 'pro' | 'school';

interface CheckoutResponse {
  url?: string;
  error?: string;
  plan?: string;
  retry_after?: number;
}

interface PortalResponse {
  url: string;
}

/**
 * Çalışma akışı:
 * 1) Frontend `startCheckout('pro')` çağırır.
 * 2) Supabase Edge Function `polar-checkout` JWT ile kullanıcıyı doğrular,
 *    Polar Checkout Session yaratır ve URL'i döner.
 * 3) Frontend window.location ile o URL'e yönlendirir.
 * 4) Polar -> webhook -> `polar-webhook` -> profiles.plan & subscription güncellenir.
 *
 * Hata kodları:
 *  409 already_subscribed  → kullanıcının zaten aktif aboneliği var
 *  429 rate_limited        → 60 sn içinde ikinci deneme
 */
export async function startCheckout(tier: PolarTier, yearly = false): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<CheckoutResponse>('polar-checkout', {
    body: { tier, yearly },
  });

  // supabase-js wraps non-2xx as FunctionsHttpError; the body is in data.
  // Check the business-logic error codes first.
  if (data?.error === 'already_subscribed') {
    throw new Error(messages.billing.alreadySubscribed);
  }
  if (data?.error === 'rate_limited') {
    const secs = data.retry_after ?? 60;
    throw new Error(messages.billing.rateLimited(secs));
  }
  if (error) throw error;
  if (!data?.url) throw new Error(messages.billing.checkoutUrlMissing);

  trackCheckoutStarted(tier);
  window.location.href = data.url;
}

export async function openCustomerPortal(): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<PortalResponse>('polar-portal', {});
  if (error) throw error;
  if (!data?.url) throw new Error(messages.billing.portalUrlMissing);
  window.location.href = data.url;
}
