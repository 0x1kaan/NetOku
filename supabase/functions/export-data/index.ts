// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: export-data
// POST {} -> { exported_at, profile, analyses, presets }
//
// Kullanıcının tüm verilerini JSON olarak döner (KVKK/GDPR veri taşınabilirlik hakkı).

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const [profileRes, analysesRes, presetsRes] = await Promise.all([
      admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      admin.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      admin.from('presets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);

    if (profileRes.error) {
      console.error('[export-data] profile fetch', profileRes.error);
      return json({ error: 'Profile fetch failed' }, 500);
    }
    if (analysesRes.error) {
      console.error('[export-data] analyses fetch', analysesRes.error);
      return json({ error: 'Analyses fetch failed' }, 500);
    }
    if (presetsRes.error) {
      console.error('[export-data] presets fetch', presetsRes.error);
      return json({ error: 'Presets fetch failed' }, 500);
    }

    return json({
      exported_at: new Date().toISOString(),
      profile: profileRes.data,
      analyses: analysesRes.data ?? [],
      presets: presetsRes.data ?? [],
    });
  } catch (e) {
    console.error('[export-data] unexpected', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
