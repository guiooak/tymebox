import { Button, Modal, type Shortcut } from '../../../common/components';
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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      closeOnOverlayClick
      footer={<Button onClick={onClose}>Got it</Button>}
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
