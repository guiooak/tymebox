import { useState } from 'react';
import { Button, FormDatetimePicker, FormField, Modal } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
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
  const tt = useT();
  const t = tt.milestones;
  const [finishedAt, setFinishedAt] = useState(goal?.finishedAt ?? '');
  const [weight, setWeight] = useState(String(goal?.weight ?? 1));

  // Reset the fields whenever a different goal is opened (adjusting state
  // during render instead of in an effect avoids a stale first frame).
  const [shownGoal, setShownGoal] = useState(goal);
  if (goal !== shownGoal) {
    setShownGoal(goal);
    if (goal) {
      setFinishedAt(goal.finishedAt);
      setWeight(String(goal.weight));
    }
  }

  const parsedWeight = Number(weight);
  const weightError =
    !weight.trim() || Number.isNaN(parsedWeight) || parsedWeight <= 0
      ? t.weightError
      : null;

  // Save is disabled while the weight is invalid.
  const onConfirm = () => {
    onSave({ finishedAt, weight: parsedWeight });
    onClose();
  };

  return (
    <Modal
      open={!!goal}
      onClose={onClose}
      title={goal ? t.editTitle(goal.name) : t.editMilestone}
      closeOnOverlayClick
      footer={
        <>
          <Button theme="secondary" outline onClick={onClose}>
            {tt.common.cancel}
          </Button>
          <Button onClick={onConfirm} disabled={!!weightError}>
            {t.save}
          </Button>
        </>
      }
    >
      <FormField label={t.completedAt}>
        <FormDatetimePicker value={finishedAt} onChange={setFinishedAt} />
        <small className={styles.hint}>{finishedAt ? t.completedHint : t.openHint}</small>
        {finishedAt && (
          <Button
            size="sm"
            theme="secondary"
            outline
            className={styles.clearTime}
            onClick={() => setFinishedAt('')}
          >
            {t.markNotDone}
          </Button>
        )}
      </FormField>

      <FormField label={t.weight}>
        <input
          className={styles.weightInput}
          type="number"
          min={1}
          step={1}
          value={weight}
          aria-label={t.weight}
          onChange={(event) => setWeight(event.target.value)}
        />
        <small className={styles.hint}>{t.weightHint}</small>
        {weightError && <span className={styles.error}>{weightError}</span>}
      </FormField>
    </Modal>
  );
}
