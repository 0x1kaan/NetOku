import type { AnalysisResult, FormSettings } from '@/types/domain';
import { applyPlanOverride } from './planOverride';
import { requireSupabase, supabase, supabaseReady } from './supabase';

export type OrgRole = 'owner' | 'manager' | 'teacher' | 'viewer';
export type RecordVisibility = 'private' | 'organization';

export interface Profile {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'school';
  usage_count: number;
  usage_reset_at: string;
  polar_customer_id: string | null;
  polar_subscription_id: string | null;
  polar_subscription_status: string | null;
  organization_id: string | null;
  organization_role: OrgRole;
}

export interface AnalysisReportMeta {
  brandName?: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  shareCount?: number;
  lastSharedAt?: string;
}

export interface AnalysisSummary {
  totalStudents: number;
  evaluatedStudents: number;
  excludedStudents: number;
  bookletsAutoAssigned: boolean;
  courses: Array<{ name: string; avgNet: number; maxNet: number }>;
}

export interface AnalysisRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  visibility: RecordVisibility;
  title: string;
  file_name: string | null;
  file_size: number | null;
  settings: FormSettings;
  summary: AnalysisSummary;
  result: AnalysisResult | null;
  student_count: number;
  excluded_count: number;
  exam_date: string | null;
  exam_type: string | null;
  report_meta: AnalysisReportMeta;
  created_at: string;
}

export interface PresetRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  scope: RecordVisibility;
  name: string;
  description: string | null;
  category: string;
  settings: FormSettings;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface StudentReportShareRecord {
  id: string;
  analysis_id: string;
  organization_id: string | null;
  created_by: string;
  student_id: string;
  student_name: string;
  share_token: string;
  report_payload: unknown;
  expires_at: string | null;
  created_at: string;
}

export const PLAN_LIMITS: Record<Profile['plan'], number | null> = {
  free: 10,
  pro: null,
  school: null,
};

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabaseReady || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return applyPlanOverride((data as Profile | null) ?? null);
}

export async function incrementUsage(userId: string): Promise<Profile | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('increment_usage', { p_user: userId });
  if (error) throw error;
  return applyPlanOverride((data as Profile | null) ?? null);
}

export function summarize(analysis: AnalysisResult): AnalysisSummary {
  return {
    totalStudents: analysis.meta.totalStudents,
    evaluatedStudents: analysis.meta.evaluatedStudents,
    excludedStudents: analysis.meta.excludedStudents,
    bookletsAutoAssigned: analysis.meta.bookletsAutoAssigned,
    courses: analysis.courseStats.map((s) => ({
      name: s.courseName,
      avgNet: s.avgNet,
      maxNet: s.maxNet,
    })),
  };
}

export async function saveAnalysis(params: {
  userId: string;
  title: string;
  fileName?: string | null;
  fileSize?: number | null;
  settings: FormSettings;
  analysis: AnalysisResult;
  organizationId?: string | null;
  visibility?: RecordVisibility;
  examDate?: string | null;
  examType?: string | null;
  reportMeta?: AnalysisReportMeta;
}): Promise<AnalysisRecord> {
  const sb = requireSupabase();
  const summary = summarize(params.analysis);
  const { data, error } = await sb
    .from('analyses')
    .insert({
      user_id: params.userId,
      organization_id: params.organizationId ?? null,
      visibility: params.visibility ?? 'private',
      title: params.title,
      file_name: params.fileName ?? null,
      file_size: params.fileSize ?? null,
      settings: params.settings,
      summary,
      result: params.analysis,
      student_count: params.analysis.students.length,
      excluded_count: params.analysis.excluded.length,
      exam_date: params.examDate ?? null,
      exam_type: params.examType ?? null,
      report_meta: params.reportMeta ?? {},
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as AnalysisRecord;
}

export async function updateAnalysis(
  id: string,
  patch: Partial<{
    title: string;
    organization_id: string | null;
    visibility: RecordVisibility;
    exam_date: string | null;
    exam_type: string | null;
    report_meta: AnalysisReportMeta;
  }>,
): Promise<AnalysisRecord> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('analyses')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as AnalysisRecord;
}

function applyWorkspaceFilter<T extends 'analyses' | 'presets'>(
  table: T,
  userId: string,
  organizationId?: string | null,
) {
  if (!supabaseReady || !supabase) return null;
  const query = supabase.from(table).select('*');
  if (!organizationId) return query.eq('user_id', userId);
  const orgScopeField = table === 'analyses' ? 'visibility' : 'scope';
  return query.or(
    `user_id.eq.${userId},and(organization_id.eq.${organizationId},${orgScopeField}.eq.organization)`,
  );
}

export async function listAnalyses(userId: string, limit = 50): Promise<AnalysisRecord[]> {
  if (!supabaseReady || !supabase) return [];
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AnalysisRecord[];
}

export async function listWorkspaceAnalyses(params: {
  userId: string;
  organizationId?: string | null;
  limit?: number;
}): Promise<AnalysisRecord[]> {
  const query = applyWorkspaceFilter('analyses', params.userId, params.organizationId);
  if (!query) return [];
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 100);
  if (error) throw error;
  return (data ?? []) as AnalysisRecord[];
}

export async function getAnalysis(id: string): Promise<AnalysisRecord | null> {
  if (!supabaseReady || !supabase) return null;
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as AnalysisRecord | null) ?? null;
}

export async function deleteAnalysis(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('analyses').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAnalyses(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const sb = requireSupabase();
  const { error } = await sb.from('analyses').delete().in('id', ids);
  if (error) throw error;
}

export async function listPresets(userId: string): Promise<PresetRecord[]> {
  if (!supabaseReady || !supabase) return [];
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PresetRecord[];
}

export async function listWorkspacePresets(params: {
  userId: string;
  organizationId?: string | null;
}): Promise<PresetRecord[]> {
  const query = applyWorkspaceFilter('presets', params.userId, params.organizationId);
  if (!query) return [];
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PresetRecord[];
}

export async function createPreset(params: {
  userId: string;
  name: string;
  settings: FormSettings;
  isDefault?: boolean;
  organizationId?: string | null;
  scope?: RecordVisibility;
  description?: string | null;
  category?: string;
}): Promise<PresetRecord> {
  const sb = requireSupabase();
  if (params.isDefault) {
    await sb.from('presets').update({ is_default: false }).eq('user_id', params.userId);
  }
  const { data, error } = await sb
    .from('presets')
    .insert({
      user_id: params.userId,
      organization_id: params.organizationId ?? null,
      scope: params.scope ?? 'private',
      name: params.name,
      description: params.description ?? null,
      category: params.category ?? 'custom',
      settings: params.settings,
      is_default: params.isDefault ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PresetRecord;
}

export async function deletePreset(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('presets').delete().eq('id', id);
  if (error) throw error;
}

export async function createStudentReportShare(params: {
  analysisId: string;
  organizationId?: string | null;
  createdBy: string;
  studentId: string;
  studentName: string;
  reportPayload: unknown;
  expiresAt?: string | null;
}): Promise<StudentReportShareRecord> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('student_report_shares')
    .insert({
      analysis_id: params.analysisId,
      organization_id: params.organizationId ?? null,
      created_by: params.createdBy,
      student_id: params.studentId,
      student_name: params.studentName,
      report_payload: params.reportPayload,
      expires_at: params.expiresAt ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as StudentReportShareRecord;
}

export async function getSharedStudentReport<T = Record<string, unknown>>(
  token: string,
): Promise<T | null> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('get_shared_student_report', { p_token: token });
  if (error) throw error;
  return (data as T | null) ?? null;
}

export async function listStudentReportShares(
  analysisId: string,
): Promise<StudentReportShareRecord[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('student_report_shares')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentReportShareRecord[];
}

export async function revokeStudentReportShare(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('student_report_shares').delete().eq('id', id);
  if (error) throw error;
}
