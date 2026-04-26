import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

function sampleRate(envKey: string, fallback: number) {
  const raw = (import.meta.env as Record<string, string | boolean | undefined>)[envKey];
  if (typeof raw !== 'string') return fallback;
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0, parsed));
}

export function initMonitoring() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION as string | undefined,

    tracesSampleRate: sampleRate(
      'VITE_SENTRY_TRACES_SAMPLE_RATE',
      import.meta.env.PROD ? 0.1 : 1.0,
    ),
    replaysSessionSampleRate: sampleRate('VITE_SENTRY_REPLAY_SAMPLE_RATE', 0.1),
    replaysOnErrorSampleRate: sampleRate('VITE_SENTRY_REPLAY_ERROR_SAMPLE_RATE', 1.0),

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'AbortError',
      'Non-Error promise rejection captured',
      'Network request failed',
      'NetworkError when attempting to fetch resource',
      'Failed to fetch',
      'Load failed',
      'cancelled',
      'Script error.',
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'atomicFindClose',
      'InvalidStateError',
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-extension:\/\//i,
      /^safari-web-extension:\/\//i,
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
    ],

    beforeSend(event) {
      if (window.location.hostname === 'localhost') return null;
      if (window.location.hostname === '127.0.0.1') return null;
      return event;
    },
  });
}

export function setSentryUser(id: string, email?: string) {
  Sentry.setUser({ id, email });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function setSentryRoute(pathname: string) {
  Sentry.getCurrentScope().setTag('route', pathname);
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}
