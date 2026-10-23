import { useEffect, type ReactNode } from 'react';
import { Loader } from '../common/components';
import { useLocale, useT } from '../common/services/i18n';
import { useIsPhone } from '../common/services/viewport';
import {
  eventPath,
  eventReportPath,
  Navigate,
  Route,
  RouteGuard,
  Routes,
  landingPath,
  legacyRedirects,
  paths,
  useCurrentPath,
  useReturnPath,
} from '../common/services/router';
import { useAuthStore } from '../features/auth';
import { Landing, LocalizedLanding } from '../features/landing';
import { LegalPage } from '../features/legal';
import { ThresholdAlertsWatcher } from '../features/meeting/alerts';
import { useMeetingStore } from '../features/meeting/store';
import { Home } from '../features/meeting/home/Home';
import { MeetingForm } from '../features/meeting/form/MeetingForm';
import { MeetingDashboard } from '../features/meeting/dashboard/MeetingDashboard';
import { MeetingReport } from '../features/meeting/report/MeetingReport';
import { MeetingsHistory } from '../features/meeting/history/MeetingsHistory';
import { AppFooter } from './AppFooter';
import { AppSidebar } from './AppSidebar';
import { BottomTabBar, MobileTopBar } from './MobileNav';
import { SaveErrorToast } from './SaveErrorToast';
import styles from './App.module.css';

/** Open signed in or out, and title themselves. */
const LEGAL_PATHS = new Set<string>([
  paths.privacyPt,
  paths.privacyEn,
  paths.termsPt,
  paths.termsEn,
]);

export function AppShell() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const bind = useMeetingStore((state) => state.bind);
  const t = useT();
  const locale = useLocale();
  const isPhone = useIsPhone();

  // Primitive deps: the auth store hands out a new user object on every
  // auth callback, and rebinding tears down every live subscription.
  const uid = user?.uid;
  const email = user?.email ?? '';
  const name = user?.displayName ?? user?.email ?? '';
  const photoURL = user?.photoURL ?? '';
  // The tab title follows the interface language (index.html keeps the
  // English one for link previews, which don't run the app). The legal pages
  // name themselves.
  const currentPath = useCurrentPath();
  const legalPage = LEGAL_PATHS.has(currentPath);
  useEffect(() => {
    if (!legalPage) {
      document.title = t.shell.documentTitle;
    }
  }, [t, legalPage]);

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
      {authed && (isPhone ? <MobileTopBar /> : <AppSidebar />)}
      {authed && <ThresholdAlertsWatcher />}
      {authed && <SaveErrorToast />}
      <div
        className={
          authed && isPhone ? `${styles.content} ${styles.withTabBar}` : styles.content
        }
      >
        <main className={styles.main}>
          <Routes>
            <Route
              path={paths.login}
              element={authed ? <BackToRequestedPage /> : <Landing />}
            />
            <Route
              path={paths.home}
              element={authed ? <Home /> : <Navigate to={landingPath(locale)} replace />}
            />
            <Route
              path={paths.landingPt}
              element={
                authed ? (
                  <Navigate to={paths.home} replace />
                ) : (
                  <LocalizedLanding locale="pt-BR" />
                )
              }
            />
            <Route
              path={paths.landingEn}
              element={
                authed ? (
                  <Navigate to={paths.home} replace />
                ) : (
                  <LocalizedLanding locale="en-US" />
                )
              }
            />
            <Route
              path={paths.privacyPt}
              element={<LegalPage doc="privacy" locale="pt-BR" />}
            />
            <Route
              path={paths.privacyEn}
              element={<LegalPage doc="privacy" locale="en-US" />}
            />
            <Route
              path={paths.termsPt}
              element={<LegalPage doc="terms" locale="pt-BR" />}
            />
            <Route
              path={paths.termsEn}
              element={<LegalPage doc="terms" locale="en-US" />}
            />
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
        {authed && isPhone && <BottomTabBar />}
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
