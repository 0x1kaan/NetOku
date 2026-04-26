import type { FormSettings } from '@/types/domain';

export type OBSMetric = 'score' | 'net';

export interface OBSColumnConfig {
  courseId: string;
  visible: boolean;
  metric: OBSMetric;
}

const STORAGE_KEY = 'netoku.obs-config.v1';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function legacyKey(analysisId?: string): string | null {
  return analysisId ? `${STORAGE_KEY}:${analysisId}` : null;
}

function sanitizeConfig(value: unknown): OBSColumnConfig[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as Partial<OBSColumnConfig>;
    if (typeof entry.courseId !== 'string') return [];
    return [
      {
        courseId: entry.courseId,
        visible: entry.visible !== false,
        metric: entry.metric === 'net' ? 'net' : 'score',
      },
    ];
  });
}

export function createDefaultOBSConfig(
  courses: FormSettings['courses'],
): OBSColumnConfig[] {
  return courses.map((course) => ({
    courseId: course.name,
    visible: true,
    metric: 'score',
  }));
}

export function mergeOBSConfig(
  courses: FormSettings['courses'],
  savedConfig: OBSColumnConfig[],
): OBSColumnConfig[] {
  const availableIds = new Set(courses.map((course) => course.name));
  const seen = new Set<string>();
  const orderedSaved = savedConfig.flatMap((entry) => {
    if (!availableIds.has(entry.courseId) || seen.has(entry.courseId)) return [];
    seen.add(entry.courseId);
    return [entry];
  });

  const missing = createDefaultOBSConfig(courses).filter((entry) => !seen.has(entry.courseId));
  return [...orderedSaved, ...missing];
}

export function loadOBSConfig(analysisId?: string): OBSColumnConfig[] {
  if (!canUseStorage()) return [];

  const raw =
    window.localStorage.getItem(STORAGE_KEY) ??
    (legacyKey(analysisId) ? window.localStorage.getItem(legacyKey(analysisId)!) : null);
  if (!raw) return [];

  try {
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveOBSConfig(
  analysisId: string | undefined,
  config: OBSColumnConfig[],
): void {
  if (!canUseStorage()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeConfig(config)));
  const oldKey = legacyKey(analysisId);
  if (oldKey) {
    window.localStorage.removeItem(oldKey);
  }
}

