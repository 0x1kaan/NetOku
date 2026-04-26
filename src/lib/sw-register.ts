/**
 * Service worker registration helper.
 * Gated by the `serviceWorker` feature flag in main.tsx.
 *
 * Dev builds skip registration so HMR is not intercepted.
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // do not cache dev assets

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((error) => {
        // Non-fatal: app works without SW. Log at debug level only.
        if (import.meta.env.DEV) {
          console.warn('[sw] registration failed', error);
        }
      });
  });
}

export async function unregisterServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
}
