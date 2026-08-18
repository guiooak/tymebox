import { useState } from 'react';
import { useKeyboardShortcuts, type Shortcut } from '../../../common/components';
import { ShortcutsHelpModal } from './ShortcutsHelpModal';
import styles from './MeetingDashboard.module.css';

export type DashboardShortcutsProps = {
  shortcuts: Shortcut[];
};

/**
 * Registers the board's single-key shortcuts and the "?" help overlay. Lives in
 * its own component so the hook runs regardless of the dashboard's loading
 * branches.
 */
export function DashboardShortcuts({ shortcuts }: DashboardShortcutsProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const all: Shortcut[] = [
    ...shortcuts,
    { key: '?', description: 'Show this help', onTrigger: () => setHelpOpen(true) },
  ];

  useKeyboardShortcuts(all, !helpOpen);

  return (
    <>
      <button
        type="button"
        className={styles.shortcutsHint}
        onClick={() => setHelpOpen(true)}
      >
        Keyboard shortcuts (?)
      </button>
      <ShortcutsHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        shortcuts={all}
      />
    </>
  );
}
