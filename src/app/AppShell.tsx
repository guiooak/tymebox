import { useEffect, type ReactNode } from 'react';
import { Loader } from '../common/components';
import { useT } from '../common/services/i18n';
import {
  eventPath,
  eventReportPath,
  Navigate,
  Route,
  RouteGuard,
  Routes,
  legacyRedirects,
  paths,
  useReturnPath,
} from '../common/services/router';
import { useAuthStore } from '../features/auth';
import { Landing } from '../features/landing';
import { ThresholdAlertsWatcher } from '../features/meeting/alerts';
import { useMeetingStore } from '../features/meeting/store';
import { Home } from '../features/meeting/home/Home';
import { MeetingForm } from '../features/meeting/form/MeetingForm';
import { MeetingDashboard } from '../features/meeting/dashboard/MeetingDashboard';
import { MeetingReport } from '../features/meeting/report/MeetingReport';
import { MeetingsHistory } from '../features/meeting/history/MeetingsHistory';
import { AppFooter } from './AppFooter';
import { AppSidebar } from './AppSidebar';
import { SaveErrorToast } from './SaveErrorToast';
import styles from './App.module.css';

export function AppShell() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bind = useMeetingStore((state) => state.bind);
  const t = useT();

  // Primitive deps: the auth store hands out a new user object on every
  // auth callback, and rebinding tears down every live subscription.
  const uid = user?.uid;
  const email = user?.email ?? '';
  const name = user?.displayName ?? user?.email ?? '';
  const photoURL = user?.photoURL ?? '';
  useEffect(() => {
    if (!uid) {
      return;
    }
    return bind({ uid, email, name, photoURL });
  }, [uid, email, name, photoURL, bind]);

  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <Loader label={t.shell.starting} />
      </div>
    );
  }

  const authed = status === 'authenticated';
  const protect = (element: ReactNode) => (
    <RouteGuard when={authed} redirectTo={paths.login}>
      {element}
    </RouteGuard>
  );

  return (
    <div className={styles.layout}>
      {authed && <AppSidebar />}
      {authed && <ThresholdAlertsWatcher />}
      {authed && <SaveErrorToast />}
      <div className={styles.content}>
        <main className={styles.main}>
          <Routes>
            <Route
              path={paths.login}
              element={authed ? <BackToRequestedPage /> : <Landing />}
            />
            <Route path={paths.home} element={authed ? <Home /> : <Landing />} />
            <Route path={paths.newMeeting} element={protect(<MeetingForm />)} />
            <Route path={paths.liveMeeting} element={protect(<CurrentEventRedirect />)} />
            <Route
              path={paths.report}
              element={protect(<CurrentEventRedirect toReport />)}
            />
            <Route path={paths.event} element={protect(<MeetingDashboard />)} />
            <Route path={paths.eventReport} element={protect(<MeetingReport />)} />
            <Route path={paths.meetings} element={protect(<MeetingsHistory />)} />
            {legacyRedirects.map(([from, to]) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            <Route path="*" element={<Navigate to={paths.home} replace />} />
          </Routes>
        </main>
        {authed && <AppFooter />}
      </div>
    </div>
  );
}

/** After signing in, go where the visitor was headed (e.g. a shared link). */
function BackToRequestedPage() {
  return <Navigate to={useReturnPath(paths.home)} replace />;
}

/**
 * The URLs from before events had ids (/events/live, /events/report) open your
 * current event, or Home when there isn't one.
 */
function CurrentEventRedirect({ toReport = false }: { toReport?: boolean }) {
  const loading = useMeetingStore((state) => state.loading);
  const currentId = useMeetingStore((state) => state.currentMeetingId);
  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  }
  if (!currentId) {
    return <Navigate to={paths.home} replace />;
  }
  return (
    <Navigate to={toReport ? eventReportPath(currentId) : eventPath(currentId)} replace />
  );
}
