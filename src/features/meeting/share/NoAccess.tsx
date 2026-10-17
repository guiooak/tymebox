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
import { useT } from '../../../common/services/i18n';
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
  const t = useT().share;
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
      setError(t.requestSendFailed);
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
      {t.goHome}
    </Button>
  );

  return (
    <Container className={styles.noAccess}>
      <Page>
        <div className={styles.noAccessBody}>
          {myRequest ? (
            <>
              <Heading size="md" level={1}>
                {t.requestSent}
              </Heading>
              <Paragraph className={styles.muted}>
                {t.requestSentText(formatLong(new Date(myRequest.requestedAt)))}
              </Paragraph>
              <div className={styles.row}>
                {goHome}
                <Button
                  theme="danger"
                  outline
                  disabled={busy}
                  onClick={() => void cancel()}
                >
                  {t.cancelRequest}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Heading size="md" level={1}>
                {declined ? t.declined : t.noAccess}
              </Heading>
              <Paragraph className={styles.muted}>
                {access ? t.askOwner(user?.email ?? '') : t.missing}
              </Paragraph>
              {access && (
                <>
                  <label className={styles.label} htmlFor="request-message">
                    {t.messageLabel}
                  </label>
                  <TextArea
                    id="request-message"
                    value={message}
                    maxLength={ACCESS_LIMITS.requestMessage}
                    onChange={setMessage}
                    placeholder={t.messagePlaceholder}
                  />
                  {error && <p className={styles.error}>{error}</p>}
                </>
              )}
              <div className={styles.row}>
                {goHome}
                {access && (
                  <Button disabled={busy} onClick={() => void send()}>
                    {declined ? t.askAgain : t.requestAccess}
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
