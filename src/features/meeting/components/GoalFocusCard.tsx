import { Badge, Box, Button } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import type { Goal } from '../domain/types';
import styles from './GoalFocusCard.module.css';

export type GoalFocusCardProps = {
  /** The milestone currently being worked on — null when everything is done. */
  goal: Goal | null;
  position: number;
  total: number;
  disabled?: boolean;
  onComplete: () => void;
};

/**
 * The one thing a facilitator needs mid-meeting without scrolling: what's open
 * right now, and a single click to close it.
 */
export function GoalFocusCard({
  goal,
  position,
  total,
  disabled,
  onComplete,
}: GoalFocusCardProps) {
  const t = useT().milestones;
  if (!goal) {
    return (
      <Box className={styles.focus}>
        <div className={styles.head}>
          <Badge theme="success">{t.allDone}</Badge>
        </div>
        <p className={styles.title}>{t.allClosed}</p>
      </Box>
    );
  }

  return (
    <Box className={styles.focus}>
      <div className={styles.head}>
        <Badge theme="primary">{t.now}</Badge>
        <span className={styles.progress}>{t.position(position, total)}</span>
      </div>
      <p className={styles.title}>{goal.name}</p>
      {goal.decisions.trim() && <p className={styles.notes}>{goal.decisions}</p>}
      <Button
        theme="success"
        size="sm"
        disabled={disabled}
        onClick={onComplete}
        className={styles.action}
      >
        {t.markDone}
      </Button>
    </Box>
  );
}
