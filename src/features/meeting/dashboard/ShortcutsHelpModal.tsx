import { Button, Modal, type Shortcut } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import styles from './MeetingDashboard.module.css';

export type ShortcutsHelpModalProps = {
  open: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
};

export function ShortcutsHelpModal({
  open,
  onClose,
  shortcuts,
}: ShortcutsHelpModalProps) {
  const t = useT().board;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.shortcutsTitle}
      closeOnOverlayClick
      footer={<Button onClick={onClose}>{t.gotIt}</Button>}
    >
      <dl className={styles.shortcuts}>
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className={styles.shortcutRow}>
            <dt>
              <kbd className={styles.kbd}>{shortcut.key}</kbd>
            </dt>
            <dd>{shortcut.description}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
