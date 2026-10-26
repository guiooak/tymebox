import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  BlankSlate,
  Box,
  Button,
  Collapse,
  FormTextarea,
  InlineEdit,
  Label,
  Menu,
  Switch,
} from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import { cx } from '../../../common/components/cx';
import { formatTime, nowISO } from '../../../common/services/datetime';
import { FIELD_LIMITS, type Goal } from '../domain/types';
import { GoalEditModal } from './GoalEditModal';
import { useGoalDragAndDrop } from './useGoalDragAndDrop';
import styles from './GoalsDecisionCollector.module.css';

export type GoalsDecisionCollectorProps = {
  goals: Goal[];
  /** Completion checkboxes are off until the event is running. */
  disabled?: boolean;
  /** Add / rename / reorder / remove — on for everything but a finished event. */
  editable?: boolean;
  automatic: boolean;
  onToggleAutomatic: (value: boolean) => void;
  onChangeGoal: (goalId: string, patch: Partial<Goal>) => void;
  onAllCompleted: () => void;
  onAddGoal?: (name: string) => void;
  onRemoveGoal?: (goalId: string) => void;
  onDuplicateGoal?: (goalId: string) => void;
  onReorderGoals?: (from: number, to: number) => void;
  /** Asked before dropping a milestone that already holds notes. */
  onConfirmRemove?: (goal: Goal) => Promise<boolean>;
};

export function GoalsDecisionCollector({
  goals,
  disabled,
  editable,
  automatic,
  onToggleAutomatic,
  onChangeGoal,
  onAllCompleted,
  onAddGoal,
  onRemoveGoal,
  onDuplicateGoal,
  onReorderGoals,
  onConfirmRemove,
}: GoalsDecisionCollectorProps) {
  const tt = useT();
  const t = tt.milestones;
  const [openId, setOpenId] = useState<string | null>(
    () => goals.find((g) => !g.finishedAt)?.id ?? null,
  );
  const [allOpen, setAllOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const celebrateTimer = useRef<number | undefined>(undefined);
  const addRef = useRef<HTMLInputElement>(null);

  const isOpen = (goalId: string) => allOpen || openId === goalId;
  const canEdit = !!editable;
  const drag = useGoalDragAndDrop({ enabled: canEdit, onReorder: onReorderGoals });
  const notesEditable = !(disabled && !canEdit);

  // Opening a milestone puts the cursor in its notes, ready to type. The
  // focus waits for the opened row to render; preventScroll keeps the list
  // still. Only user-driven opens ask for it, never the first render.
  const focusOnOpen = useRef<string | null>(null);
  const openGoal = (goalId: string | null) => {
    focusOnOpen.current = goalId && notesEditable ? goalId : null;
    setOpenId(goalId);
  };
  useEffect(() => {
    if (!openId || focusOnOpen.current !== openId) {
      return;
    }
    focusOnOpen.current = null;
    document
      .querySelector<HTMLTextAreaElement>(`textarea[name="decisions-${openId}"]`)
      ?.focus({ preventScroll: true });
  }, [openId]);

  useEffect(() => {
    if (adding) {
      addRef.current?.focus();
    }
  }, [adding]);

  const onCheck = (goal: Goal, checked: boolean) => {
    if (checked) {
      // One-shot reward on the row that was just landed. Cleared by a timer
      // rather than animationend so a re-check mid-animation restarts it.
      setCelebrating(goal.id);
      window.clearTimeout(celebrateTimer.current);
      celebrateTimer.current = window.setTimeout(() => setCelebrating(null), 700);
    }
    onChangeGoal(goal.id, { finishedAt: checked ? nowISO() : '' });
    const updated = goals.map((item) =>
      item.id === goal.id ? { ...item, finishedAt: checked ? nowISO() : '' } : item,
    );
    if (checked && automatic) {
      openGoal(updated.find((item) => !item.finishedAt)?.id ?? null);
    } else if (!checked) {
      openGoal(goal.id);
    }
    if (updated.every((item) => item.finishedAt)) {
      onAllCompleted();
    }
  };

  useEffect(() => () => window.clearTimeout(celebrateTimer.current), []);

  const submitNewGoal = () => {
    const name = draftName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    onAddGoal?.(name);
    setDraftName('');
    // Stay open so several milestones can be typed in a row.
    addRef.current?.focus();
  };

  const onAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitNewGoal();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDraftName('');
      setAdding(false);
    }
  };

  const onDelete = async (goal: Goal) => {
    const needsConfirm = !!goal.decisions.trim() || !!goal.finishedAt;
    if (needsConfirm && onConfirmRemove && !(await onConfirmRemove(goal))) {
      return;
    }
    onRemoveGoal?.(goal.id);
  };

  const menuItems = (goal: Goal, index: number) => [
    { label: t.edit, onSelect: () => setEditingGoal(goal) },
    { label: t.duplicate, onSelect: () => onDuplicateGoal?.(goal.id) },
    {
      label: t.moveUp,
      disabled: index === 0,
      onSelect: () => onReorderGoals?.(index, index - 1),
    },
    {
      label: t.moveDown,
      disabled: index === goals.length - 1,
      onSelect: () => onReorderGoals?.(index, index + 1),
    },
    { label: t.delete, danger: true, onSelect: () => void onDelete(goal) },
  ];

  return (
    <Box className={styles.collector}>
      <div className={styles.toolbar}>
        <div className={styles.automatic}>
          <Switch
            checked={automatic}
            onChange={onToggleAutomatic}
            label={t.automaticMode}
          />
          <Label text={t.automatic} />
        </div>
        <Button
          size="sm"
          theme="secondary"
          outline
          onClick={() => setAllOpen((value) => !value)}
        >
          {allOpen ? t.closeAll : t.openAll}
        </Button>
      </div>

      {goals.length === 0 && (
        <BlankSlate art="milestones" compact title={t.none} description={t.noneText} />
      )}

      <div className={styles.list}>
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            {...drag.rowProps(goal.id, index)}
            className={cx(
              drag.isDropTarget(index) && styles.dropTarget,
              celebrating === goal.id && styles.celebrate,
            )}
          >
            <Collapse
              title={goal.name}
              open={isOpen(goal.id)}
              onToggleOpen={(next) => openGoal(next ? goal.id : null)}
              leading={
                canEdit ? (
                  <span
                    className={styles.dragHandle}
                    aria-hidden="true"
                    title={t.dragToReorder}
                    {...drag.handleProps(goal.id)}
                  >
                    ⠿
                  </span>
                ) : undefined
              }
              titleSlot={
                <div className={styles.titleRow}>
                  <InlineEdit
                    value={goal.name}
                    label={t.nameLabel}
                    placeholder={t.namePlaceholder}
                    maxLength={FIELD_LIMITS.goalName}
                    readOnly={!canEdit}
                    onChange={(name) => name && onChangeGoal(goal.id, { name })}
                  />
                  <span className={styles.badges}>
                    {goal.finishedAt && (
                      <small className={styles.doneAt}>
                        {t.doneAt(formatTime(goal.finishedAt))}
                      </small>
                    )}
                    {goal.weight !== 1 && (
                      <small className={styles.weight}>×{goal.weight}</small>
                    )}
                  </span>
                </div>
              }
              actions={
                canEdit ? (
                  <Menu
                    label={tt.common.actionsFor(goal.name)}
                    items={menuItems(goal, index)}
                  />
                ) : undefined
              }
              checkbox={{
                label: t.done,
                checked: !!goal.finishedAt,
                disabled,
                onChange: (checked) => onCheck(goal, checked),
              }}
            >
              <div className={styles.notes}>
                <FormTextarea
                  name={`decisions-${goal.id}`}
                  value={goal.decisions}
                  onChange={(value) => onChangeGoal(goal.id, { decisions: value })}
                  placeholder={t.notes}
                  ariaLabel={t.notes}
                  readOnly={disabled && !canEdit}
                  minHeight={70}
                  maxLength={FIELD_LIMITS.goalDecisions}
                />
              </div>
            </Collapse>
          </div>
        ))}
      </div>

      {canEdit &&
        (adding ? (
          <div className={styles.addRow}>
            <input
              ref={addRef}
              className={styles.addInput}
              value={draftName}
              placeholder={t.newName}
              maxLength={FIELD_LIMITS.goalName}
              aria-label={t.newNameAria}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={onAddKeyDown}
            />
            <Button size="sm" onClick={submitNewGoal}>
              {t.add}
            </Button>
            <Button
              size="sm"
              theme="secondary"
              outline
              onClick={() => {
                setDraftName('');
                setAdding(false);
              }}
            >
              {tt.common.cancel}
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.addTrigger}
            onClick={() => setAdding(true)}
          >
            {t.addMilestone}
          </button>
        ))}

      <GoalEditModal
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
        onSave={(patch) => editingGoal && onChangeGoal(editingGoal.id, patch)}
      />
    </Box>
  );
}
