import { Badge, Box, Button } from '../../../common/components';
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
  if (!goal) {
    return (
      <Box className={styles.focus}>
        <div className={styles.head}>
          <Badge theme="success">All done</Badge>
        </div>
        <p className={styles.title}>Every milestone is closed. 🎉</p>
      </Box>
    );
  }

  return (
    <Box className={styles.focus}>
      <div className={styles.head}>
        <Badge theme="primary">Now</Badge>
        <span className={styles.progress}>
          {position} of {total}
        </span>
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
        Mark as done
      </Button>
    </Box>
  );
}
