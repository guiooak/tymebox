import { Button, Modal } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import { useMeetingStore } from '../store';
import { LinkSettings } from './LinkSettings';
import { PeopleList, usePeopleDraft } from './PeopleList';
import { RequestsList } from './RequestsList';
import styles from './share.module.css';

export { eventLink } from './LinkSettings';

export type ShareModalProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * The owner's sharing controls: pending requests, the link, general access
 * (private or public with a role) and the people it's shared with. Every
 * change saves at once; the database rules check it.
 */
export function ShareModal({ open, onClose }: ShareModalProps) {
  const t = useT().share;
  const event = useMeetingStore((state) => state.event);
  const access = useMeetingStore((state) => state.access);
  const draft = usePeopleDraft();

  if (!event || !access) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title(event.name)}
      width={600}
      closeOnOverlayClick
      footer={<Button onClick={onClose}>{t.done}</Button>}
    >
      <div className={styles.modalBody}>
        <RequestsList />
        <LinkSettings eventId={event.id} access={access} />
        <PeopleList ownerName={event.ownerName} draft={draft} />
      </div>
    </Modal>
  );
}
