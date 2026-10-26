import { useState } from 'react';
import { Button } from '../../../common/components';
import { useT, type Messages } from '../../../common/services/i18n';
import type { AccessRequest, GrantedRole } from '../domain/access';
import { useMeetingStore } from '../store';
import { Initial, RoleSelect } from './shareControls';
import styles from './share.module.css';

function timeAgo(ms: number, t: Messages['share']): string {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) {
    return t.justNow;
  }
  if (minutes < 60) {
    return t.minutesAgo(minutes);
  }
  const hours = Math.round(minutes / 60);
  return hours < 24 ? t.hoursAgo(hours) : t.daysAgo(Math.round(hours / 24));
}

function RequestRow({ request }: { request: AccessRequest }) {
  const approveRequest = useMeetingStore((state) => state.approveRequest);
  const denyRequest = useMeetingStore((state) => state.denyRequest);
  const t = useT().share;
  const [role, setRole] = useState<GrantedRole>('viewer');
  const [busy, setBusy] = useState(false);
  // Google can hand over a blank display name; fall back to the email.
  const name = request.name.trim();

  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={styles.person}>
      <Initial name={name || request.email} photoURL={request.photoURL} />
      <div className={styles.personText}>
        <strong>{name || request.email}</strong>
        <span className={styles.muted}>
          {name ? `${request.email} · ` : ''}
          {timeAgo(request.requestedAt, t)}
        </span>
        {request.message && <q className={styles.message}>{request.message}</q>}
      </div>
      <div className={styles.personActions}>
        <RoleSelect
          size="sm"
          value={role}
          onChange={setRole}
          label={t.roleFor(request.email)}
        />
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void act(() => approveRequest(request, role))}
        >
          {t.approve}
        </Button>
        <Button
          size="sm"
          theme="danger"
          outline
          disabled={busy}
          onClick={() => void act(() => denyRequest(request))}
        >
          {t.deny}
        </Button>
      </div>
    </li>
  );
}

/** Pending requests to join the event, each approved with a role or denied. */
export function RequestsList() {
  const t = useT().share;
  const requests = useMeetingStore((state) => state.requests);
  if (requests.length === 0) {
    return null;
  }
  return (
    <section className={styles.section} aria-labelledby="share-requests">
      <h4 id="share-requests" className={styles.sectionTitle}>
        {t.requests} <span className={styles.count}>{requests.length}</span>
      </h4>
      <ul className={styles.people}>
        {requests.map((request) => (
          <RequestRow key={request.key} request={request} />
        ))}
      </ul>
    </section>
  );
}
