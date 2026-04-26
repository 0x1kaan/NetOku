import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Auth } from '@/pages/Auth';
import { AppLayout } from '@/pages/app/AppLayout';
import { ServerError } from '@/pages/ServerError';
import { CookieBanner } from '@/components/CookieBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  AppRouteSkeleton,
  PublicRouteSkeleton,
  ReportRouteSkeleton,
} from '@/components/RouteSkeleton';
import { setSentryRoute } from '@/lib/monitoring';

const Pricing = lazy(() => import('@/pages/Pricing').then((m) => ({ default: m.Pricing })));
const Changelog = lazy(() => import('@/pages/Changelog').then((m) => ({ default: m.Changelog })));
const Terms = lazy(() => import('@/pages/legal/Terms').then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import('@/pages/legal/Privacy').then((m) => ({ default: m.Privacy })));
const Cookies = lazy(() => import('@/pages/legal/Cookies').then((m) => ({ default: m.Cookies })));
const Refund = lazy(() => import('@/pages/legal/Refund').then((m) => ({ default: m.Refund })));
const Contact = lazy(() => import('@/pages/legal/Contact').then((m) => ({ default: m.Contact })));
const ForgotPassword = lazy(() =>
  import('@/pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
);
const ResetPassword = lazy(() =>
  import('@/pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })),
);
const VerifyEmail = lazy(() =>
  import('@/pages/auth/VerifyEmail').then((m) => ({ default: m.VerifyEmail })),
);
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite').then((m) => ({ default: m.AcceptInvite })));
const SharedStudentReport = lazy(() =>
  import('@/pages/SharedStudentReport').then((m) => ({ default: m.SharedStudentReport })),
);
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));

const Dashboard = lazy(() => import('@/pages/app/Dashboard').then((m) => ({ default: m.Dashboard })));
const Analyze = lazy(() => import('@/pages/app/Analyze').then((m) => ({ default: m.Analyze })));
const History = lazy(() => import('@/pages/app/History').then((m) => ({ default: m.History })));
const Insights = lazy(() => import('@/pages/app/Insights').then((m) => ({ default: m.Insights })));
const StudentProfile = lazy(() =>
  import('@/pages/app/StudentProfile').then((m) => ({ default: m.StudentProfile })),
);
const Presets = lazy(() => import('@/pages/app/Presets').then((m) => ({ default: m.Presets })));
const Billing = lazy(() => import('@/pages/app/Billing').then((m) => ({ default: m.Billing })));
const Settings = lazy(() => import('@/pages/app/Settings').then((m) => ({ default: m.Settings })));

function Lazy({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    setSentryRoute(location.pathname);
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/pricing"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Pricing /></Lazy>}
        />
        <Route
          path="/changelog"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Changelog /></Lazy>}
        />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/forgot-password"
          element={<Lazy fallback={<PublicRouteSkeleton />}><ForgotPassword /></Lazy>}
        />
        <Route
          path="/reset-password"
          element={<Lazy fallback={<PublicRouteSkeleton />}><ResetPassword /></Lazy>}
        />
        <Route
          path="/verify-email"
          element={<Lazy fallback={<PublicRouteSkeleton />}><VerifyEmail /></Lazy>}
        />

        <Route
          path="/terms"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Terms /></Lazy>}
        />
        <Route
          path="/privacy"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Privacy /></Lazy>}
        />
        <Route
          path="/cookies"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Cookies /></Lazy>}
        />
        <Route
          path="/refund"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Refund /></Lazy>}
        />
        <Route
          path="/contact"
          element={<Lazy fallback={<PublicRouteSkeleton />}><Contact /></Lazy>}
        />

        <Route
          path="/invite/:token"
          element={<Lazy fallback={<PublicRouteSkeleton />}><AcceptInvite /></Lazy>}
        />
        <Route
          path="/report/:token"
          element={<Lazy fallback={<ReportRouteSkeleton />}><SharedStudentReport /></Lazy>}
        />
        <Route
          path="/500"
          element={<ServerError />}
        />

        <Route path="/app" element={<AppLayout />}>
          <Route
            index
            element={<Lazy fallback={<AppRouteSkeleton />}><Dashboard /></Lazy>}
          />
          <Route
            path="analyze"
            element={<Lazy fallback={<AppRouteSkeleton />}><Analyze /></Lazy>}
          />
          <Route
            path="history"
            element={<Lazy fallback={<AppRouteSkeleton />}><History /></Lazy>}
          />
          <Route
            path="insights"
            element={<Lazy fallback={<AppRouteSkeleton />}><Insights /></Lazy>}
          />
          <Route
            path="students/:studentId"
            element={<Lazy fallback={<AppRouteSkeleton />}><StudentProfile /></Lazy>}
          />
          <Route
            path="presets"
            element={<Lazy fallback={<AppRouteSkeleton />}><Presets /></Lazy>}
          />
          <Route
            path="billing"
            element={<Lazy fallback={<AppRouteSkeleton />}><Billing /></Lazy>}
          />
          <Route
            path="settings"
            element={<Lazy fallback={<AppRouteSkeleton />}><Settings /></Lazy>}
          />
        </Route>

        <Route
          path="*"
          element={<Lazy fallback={<PublicRouteSkeleton />}><NotFound /></Lazy>}
        />
      </Routes>
      <CookieBanner />
    </ErrorBoundary>
  );
}
