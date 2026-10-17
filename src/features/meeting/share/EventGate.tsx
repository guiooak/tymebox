import { useEffect, type ReactNode } from 'react';
import { Loader } from '../../../common/components';
import { Navigate, paths, useRouteParams } from '../../../common/services/router';
import type { Role } from '../domain/access';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';
import { NoAccess } from './NoAccess';
import styles from './share.module.css';

export type EventGateProps = {
  children: (event: Meeting, role: Role) => ReactNode;
};

/**
 * Opens the event named in the URL (`/events/:id…`) and renders the page only
 * once you may see it. Without access it shows the request-access page, and
 * keeps listening: an approval, a new share or the event going public opens it
 * in place.
 */
export function EventGate({ children }: EventGateProps) {
  const { id } = useRouteParams<{ id?: string }>();
  const openEvent = useMeetingStore((state) => state.openEvent);
  const openId = useMeetingStore((state) => state.openId);
  const view = useMeetingStore((state) => state.eventView);
  const event = useMeetingStore((state) => state.event);
  const role = useMeetingStore((state) => state.role);
  // On a fresh load this effect runs before AppShell's (children first), so
  // the store has no user yet; open the event once it does.
  const uid = useMeetingStore((state) => state.user?.uid);

  useEffect(() => (id && uid ? openEvent(id) : undefined), [id, uid, openEvent]);

  if (!id) {
    return <Navigate to={paths.home} replace />;
  }
  const settling = openId !== id || view === 'idle' || view === 'loading';
  if (settling || (view === 'ready' && !role)) {
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  }
  if (view === 'denied' || !event || !role) {
    return <NoAccess />;
  }
  return <>{children(event, role)}</>;
}
