import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com';
const COOKIE_CONSENT_STORAGE_KEY = 'netoku_cookie_consent';

interface CookieConsentPreferences {
  version: 1;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

let initialized = false;

export function readCookieConsent(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  if (!raw) return null;

  if (raw === 'accepted') {
    return {
      version: 1,
      essential: true,
      analytics: true,
      marketing: true,
      updatedAt: new Date(0).toISOString(),
    };
  }

  if (raw === 'declined') {
    return {
      version: 1,
      essential: true,
      analytics: false,
      marketing: false,
      updatedAt: new Date(0).toISOString(),
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsentPreferences>;
    return {
      version: 1,
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(preferences: Pick<CookieConsentPreferences, 'analytics' | 'marketing'>) {
  if (typeof window === 'undefined') return;
  const payload: CookieConsentPreferences = {
    version: 1,
    essential: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(payload));
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true;
}

export function initAnalytics(options: { force?: boolean } = {}) {
  if (initialized || !POSTHOG_KEY) return;
  if (!options.force && !hasAnalyticsConsent()) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    persistence: 'localStorage',
  });
  initialized = true;
}

export function setAnalyticsCaptureEnabled(enabled: boolean) {
  if (enabled) {
    initAnalytics({ force: true });
    if (initialized) posthog.opt_in_capturing();
    return;
  }
  if (initialized) posthog.opt_out_capturing();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, props);
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, props);
}

export function reset() {
  if (!initialized) return;
  posthog.reset();
}

// Typed event helpers

/** User lands on the pricing page */
export const trackPricingViewed = (source?: string) =>
  track('pricing_viewed', { source });

/** User clicks a paid plan CTA */
export const trackUpgradeClicked = (tier: string, source: 'pricing' | 'billing' | 'limit_banner') =>
  track('upgrade_clicked', { tier, source });

/** Checkout redirect fired (Polar session created) */
export const trackCheckoutStarted = (tier: string) =>
  track('checkout_started', { tier });

/** User hit their monthly analysis limit */
export const trackLimitReached = (plan: string, used: number, limit: number) =>
  track('limit_reached', { plan, used, limit });

/** Analysis wizard: file uploaded successfully */
export const trackFileUploaded = (fileSizeKb: number) =>
  track('file_uploaded', { file_size_kb: fileSizeKb });

/** Analysis wizard completed - result shown */
export const trackAnalysisCompleted = (students: number, courses: number, excluded: number) =>
  track('analysis_completed', { students, courses, excluded });

/** Excel report downloaded */
export const trackReportDownloaded = () => track('report_downloaded');

/** Preset saved */
export const trackPresetSaved = () => track('preset_saved');

/** OBS not aktarma Excel downloaded (Pro feature) */
export const trackObsExported = (courses: number) =>
  track('obs_exported', { courses });
