import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import './index.css';
import App from './App';
import { AuthProvider } from './lib/auth';
import { initAnalytics } from './lib/analytics';
import { initMonitoring } from './lib/monitoring';
import { applyUrlOverrides, isFlagEnabled } from './lib/flags';
import { registerServiceWorker } from './lib/sw-register';

// Feature flags from URL → localStorage (before any flag read)
applyUrlOverrides();

// Monitoring first so any init errors are captured
initMonitoring();
initAnalytics();

if (isFlagEnabled('serviceWorker')) {
  registerServiceWorker();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
