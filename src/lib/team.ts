import type { OrgRole } from './db';
import { requireSupabase } from './supabase';

export interface OrgInvite {
  id: string;
  email: string;
  role: OrgRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface TeamInfo {
  currentRole: OrgRole | null;
  org: {
    id: string;
    name: string;
    seat_limit: number;
    brand_name: string | null;
    logo_url: string | null;
    brand_primary_color: string;
    brand_accent_color: string;
    created_at: string;
  };
  members: { id: string; email: string; organization_role: OrgRole }[];
  invites: OrgInvite[];
}

export async function getTeamInfo(): Promise<TeamInfo | null> {
  const sb = requireSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('organization_id, organization_role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile?.organization_id) return null;

  const { data: org, error: orgErr } = await sb
    .from('organizations')
    .select(
      'id, name, seat_limit, brand_name, logo_url, brand_primary_color, brand_accent_color, created_at',
    )
    .eq('id', profile.organization_id)
    .maybeSingle();

  if (orgErr || !org) return null;

  const { data: members } = await sb
    .from('profiles')
    .select('id, email, organization_role')
    .eq('organization_id', org.id)
    .order('organization_role', { ascending: true })
    .order('email', { ascending: true });

  const { data: invites } = await sb
    .from('organization_invites')
    .select('id, email, role, invited_by, expires_at, accepted_at, created_at')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });

  return {
    currentRole: (profile.organization_role as OrgRole | null) ?? null,
    org,
    members: (members ?? []) as TeamInfo['members'],
    invites: (invites ?? []) as OrgInvite[],
  };
}

export async function inviteMember(email: string, role: OrgRole = 'teacher'): Promise<void> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<{ ok?: boolean; error?: string }>(
    'invite-member',
    { body: { email, role } },
  );
  if (data?.error) throw new Error(data.error);
  if (error) throw error;
}

export async function acceptInvite(token: string): Promise<{ orgName: string }> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<{
    ok?: boolean;
    orgName?: string;
    error?: string;
  }>('accept-invite', { body: { token } });
  if (data?.error) throw new Error(data.error);
  if (error) throw error;
  return { orgName: data?.orgName ?? '' };
}

export async function updateMemberRole(memberId: string, role: OrgRole): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('update_org_member_role', {
    p_member: memberId,
    p_role: role,
  });
  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.rpc('remove_org_member', { p_member: memberId });
  if (error) throw error;
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('organization_invites').delete().eq('id', inviteId);
  if (error) throw error;
}

export async function saveOrganizationBranding(params: {
  organizationId: string;
  name: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
}): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('organizations')
    .update({
      brand_name: params.name || null,
      logo_url: params.logoUrl || null,
      brand_primary_color: params.primaryColor,
      brand_accent_color: params.accentColor,
    })
    .eq('id', params.organizationId);
  if (error) throw error;
}
