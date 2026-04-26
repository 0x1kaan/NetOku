import { requireSupabase, supabase } from './supabase';
import { messages } from './messages';

export interface ExportedData {
  exported_at: string;
  profile: unknown;
  analyses: unknown[];
  presets: unknown[];
}

export async function exportData(): Promise<ExportedData> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<ExportedData>('export-data', {});
  if (error) throw error;
  if (!data) throw new Error(messages.settings.exportDataUnavailable);
  return data;
}

/** Returns the current user's referral code, generating one if not yet set. */
export async function getReferralCode(userId: string): Promise<string> {
  const sb = requireSupabase();
  // Try RPC to ensure code exists
  const { data, error } = await sb.rpc('ensure_referral_code', { p_user: userId });
  if (error) throw error;
  return data as string;
}

/** Returns how many users signed up using the current user's referral code. */
export async function getReferralCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', userId);
  return count ?? 0;
}

export interface TaxInfo {
  tax_id: string;
  tax_name: string;
  tax_address: string;
}

/** Save Turkish tax info to the user's profile. */
export async function saveTaxInfo(userId: string, info: TaxInfo): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('profiles')
    .update({
      tax_id: info.tax_id || null,
      tax_name: info.tax_name || null,
      tax_address: info.tax_address || null,
    })
    .eq('id', userId);
  if (error) throw error;
}

export async function deleteAccount(): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<{ ok?: boolean; error?: string }>(
    'delete-account',
    {},
  );
  if (data?.error) throw new Error(data.error);
  if (error) throw error;
}
