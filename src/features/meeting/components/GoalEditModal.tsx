import { useEffect, useState } from 'react';
import { Button, FormDatetimePicker, FormField, Modal } from '../../../common/components';
import type { Goal } from '../domain/types';
import styles from './GoalsDecisionCollector.module.css';

export type GoalEditModalProps = {
  goal: Goal | null;
  onClose: () => void;
  onSave: (patch: { finishedAt: string; weight: number }) => void;
};

/**
 * The ⋮ → Edit form: the two things you can't fix from the row itself — when the
 * milestone was actually completed, and how much it weighs in the burndown.
 */
export function GoalEditModal({ goal, onClose, onSave }: GoalEditModalProps) {
  const [finishedAt, setFinishedAt] = useState('');
  const [weight, setWeight] = useState('1');

  useEffect(() => {
    if (goal) {
      setFinishedAt(goal.finishedAt);
      setWeight(String(goal.weight));
    }
  }, [goal]);

  const parsedWeight = Number(weight);
  const weightError =
    !weight.trim() || Number.isNaN(parsedWeight) || parsedWeight <= 0
      ? 'Weight must be a positive number'
      : null;

  const onConfirm = () => {
    if (weightError) {
      return;
    }
    onSave({ finishedAt, weight: parsedWeight });
    onClose();
  };

  return (
    <Modal
      open={!!goal}
      onClose={onClose}
      title={goal ? `Edit “${goal.name}”` : 'Edit milestone'}
      closeOnOverlayClick
      footer={
        <>
          <Button theme="secondary" outline onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!!weightError}>
            Save
          </Button>
        </>
      }
    >
      <FormField label="Completed at">
        <FormDatetimePicker value={finishedAt} onChange={setFinishedAt} />
        <small className={styles.hint}>
          {finishedAt
            ? 'Correcting this moves the point on the burndown chart.'
            : 'Empty means this milestone is still open.'}
        </small>
        {finishedAt && (
          <Button
            size="sm"
            theme="secondary"
            outline
            className={styles.clearTime}
            onClick={() => setFinishedAt('')}
          >
            Mark as not done
          </Button>
        )}
      </FormField>

      <FormField label="Weight">
        <input
          className={styles.weightInput}
          type="number"
          min={1}
          step={1}
          value={weight}
          aria-label="Weight"
          onChange={(event) => setWeight(event.target.value)}
        />
        <small className={styles.hint}>
          Heavier milestones take a bigger step down on the burndown chart.
        </small>
        {weightError && <span className={styles.error}>{weightError}</span>}
      </FormField>
    </Modal>
  );
}
