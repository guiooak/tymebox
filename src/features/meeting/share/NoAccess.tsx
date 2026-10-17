import { useState } from 'react';
import {
  Button,
  Container,
  Heading,
  Page,
  Paragraph,
  TextArea,
} from '../../../common/components';
import { formatLong } from '../../../common/services/datetime';
import { paths, useNavigation } from '../../../common/services/router';
import { ACCESS_LIMITS } from '../domain/access';
import { useMeetingStore } from '../store';
import styles from './share.module.css';

/**
 * Shown for an event you can't open — private and not shared with you, or one
 * that doesn't exist (the two look the same, so a link reveals nothing).
 * You can ask the owner for access from here.
 */
export function NoAccess() {
  const navigation = useNavigation();
  const access = useMeetingStore((state) => state.access);
  const myRequest = useMeetingStore((state) => state.myRequest);
  const user = useMeetingStore((state) => state.user);
  const requestAccess = useMeetingStore((state) => state.requestAccess);
  const cancelAccessRequest = useMeetingStore((state) => state.cancelAccessRequest);

  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A request that disappears while we still have no access was turned down
  // (unless we cancelled it ourselves). Derived while rendering, from the last
  // request seen.
  const [lastRequest, setLastRequest] = useState(myRequest);
  const [declined, setDeclined] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  if (myRequest !== lastRequest) {
    setLastRequest(myRequest);
    setDeclined(!myRequest && !!lastRequest && !cancelling);
    if (!myRequest) {
      setCancelling(false);
    }
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestAccess(message);
      setMessage('');
    } catch {
      setError('Couldn’t send the request. Check the link and try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setCancelling(true);
    try {
      await cancelAccessRequest();
    } catch {
      setCancelling(false);
    } finally {
      setBusy(false);
    }
  };

  const goHome = (
    <Button theme="secondary" outline onClick={() => navigation.go(paths.home)}>
      Go to Home
    </Button>
  );

  return (
    <Container className={styles.noAccess}>
      <Page>
        <div className={styles.noAccessBody}>
          {myRequest ? (
            <>
              <Heading size="md" level={1}>
                Request sent
              </Heading>
              <Paragraph className={styles.muted}>
                You asked for access on {formatLong(new Date(myRequest.requestedAt))}.
                This page opens the event as soon as the owner approves.
              </Paragraph>
              <div className={styles.row}>
                {goHome}
                <Button
                  theme="danger"
                  outline
                  disabled={busy}
                  onClick={() => void cancel()}
                >
                  Cancel request
                </Button>
              </div>
            </>
          ) : (
            <>
              <Heading size="md" level={1}>
                {declined
                  ? 'The owner didn’t approve your request'
                  : 'You don’t have access to this event'}
              </Heading>
              <Paragraph className={styles.muted}>
                {access
                  ? `Ask the owner for access. They'll see your request${
                      user?.email ? ` from ${user.email}` : ''
                    } and can let you in as a viewer or a contributor.`
                  : 'This event doesn’t exist, or it hasn’t been shared with you.'}
              </Paragraph>
              {access && (
                <>
                  <label className={styles.label} htmlFor="request-message">
                    Message to the owner (optional)
                  </label>
                  <TextArea
                    id="request-message"
                    value={message}
                    maxLength={ACCESS_LIMITS.requestMessage}
                    onChange={setMessage}
                    placeholder="I’m on the team running this meeting…"
                  />
                  {error && <p className={styles.error}>{error}</p>}
                </>
              )}
              <div className={styles.row}>
                {goHome}
                {access && (
                  <Button disabled={busy} onClick={() => void send()}>
                    {declined ? 'Ask again' : 'Request access'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Page>
    </Container>
  );
}
