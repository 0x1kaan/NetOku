import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { messages } from './messages';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const apiKey = publishableKey || anonKey;

export const supabaseReady = Boolean(url && apiKey);

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url!, apiKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(messages.infrastructure.supabaseNotConfigured);
  }
  return supabase;
}
