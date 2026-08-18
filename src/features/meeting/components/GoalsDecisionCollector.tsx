import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  Box,
  Button,
  Collapse,
  FormField,
  FormTextarea,
  InlineEdit,
  Label,
  Menu,
  Switch,
} from '../../../common/components';
import { formatTime, nowISO } from '../../../common/services/datetime';
import type { Goal } from '../domain/types';
import { GoalEditModal } from './GoalEditModal';
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
  const [openId, setOpenId] = useState<string | null>(
    () => goals.find((g) => !g.finishedAt)?.id ?? null,
  );
  const [allOpen, setAllOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [handleArmed, setHandleArmed] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);

  const isOpen = (goalId: string) => allOpen || openId === goalId;
  const canEdit = !!editable;

  useEffect(() => {
    if (adding) {
      addRef.current?.focus();
    }
  }, [adding]);

  const onCheck = (goal: Goal, checked: boolean) => {
    onChangeGoal(goal.id, { finishedAt: checked ? nowISO() : '' });
    const updated = goals.map((item) =>
      item.id === goal.id ? { ...item, finishedAt: checked ? nowISO() : '' } : item,
    );
    if (checked && automatic) {
      setOpenId(updated.find((item) => !item.finishedAt)?.id ?? null);
    } else if (!checked) {
      setOpenId(goal.id);
    }
    if (updated.every((item) => item.finishedAt)) {
      onAllCompleted();
    }
  };

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
    { label: 'Edit', onSelect: () => setEditingGoal(goal) },
    { label: 'Duplicate', onSelect: () => onDuplicateGoal?.(goal.id) },
    {
      label: 'Move up',
      disabled: index === 0,
      onSelect: () => onReorderGoals?.(index, index - 1),
    },
    {
      label: 'Move down',
      disabled: index === goals.length - 1,
      onSelect: () => onReorderGoals?.(index, index + 1),
    },
    { label: 'Delete', danger: true, onSelect: () => void onDelete(goal) },
  ];

  const onDrop = (index: number) => {
    if (dragIndex != null && dragIndex !== index) {
      onReorderGoals?.(dragIndex, index);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    setHandleArmed(null);
  };

  return (
    <Box className={styles.collector}>
      <div className={styles.toolbar}>
        <div className={styles.automatic}>
          <Switch
            checked={automatic}
            onChange={onToggleAutomatic}
            label="Automatic mode"
          />
          <Label text="Automatic" />
        </div>
        <Button
          size="sm"
          theme="secondary"
          outline
          onClick={() => setAllOpen((value) => !value)}
        >
          {allOpen ? 'Close all' : 'Open all'}
        </Button>
      </div>

      {goals.length === 0 && (
        <p className={styles.blankSlate}>
          No milestones yet. Add the first thing this event needs to land.
        </p>
      )}

      <div className={styles.list}>
        {goals.map((goal, index) => (
          <div
            key={goal.id}
            draggable={canEdit && handleArmed === goal.id}
            className={dragOverIndex === index ? styles.dropTarget : undefined}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(event) => {
              if (dragIndex == null) {
                return;
              }
              event.preventDefault();
              setDragOverIndex(index);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setDragOverIndex(null);
              setHandleArmed(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              onDrop(index);
            }}
          >
            <Collapse
              title={goal.name}
              open={isOpen(goal.id)}
              onToggleOpen={(next) => setOpenId(next ? goal.id : null)}
              leading={
                canEdit ? (
                  <span
                    className={styles.dragHandle}
                    aria-hidden="true"
                    title="Drag to reorder"
                    onMouseDown={() => setHandleArmed(goal.id)}
                    onMouseUp={() => setHandleArmed(null)}
                  >
                    ⠿
                  </span>
                ) : undefined
              }
              titleSlot={
                <div className={styles.titleRow}>
                  <InlineEdit
                    value={goal.name}
                    label="milestone name"
                    placeholder="Name this milestone"
                    readOnly={!canEdit}
                    onChange={(name) => name && onChangeGoal(goal.id, { name })}
                  />
                  <span className={styles.badges}>
                    {goal.finishedAt && (
                      <small className={styles.doneAt}>
                        done at {formatTime(goal.finishedAt)}
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
                    label={`Actions for ${goal.name}`}
                    items={menuItems(goal, index)}
                  />
                ) : undefined
              }
              checkbox={{
                label: 'Done',
                checked: !!goal.finishedAt,
                disabled,
                onChange: (checked) => onCheck(goal, checked),
              }}
            >
              <FormField label="Notes">
                <FormTextarea
                  name={`decisions-${goal.id}`}
                  value={goal.decisions}
                  onChange={(value) => onChangeGoal(goal.id, { decisions: value })}
                  readOnly={disabled && !canEdit}
                  minHeight={70}
                />
              </FormField>
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
              placeholder="Milestone name"
              aria-label="New milestone name"
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={onAddKeyDown}
            />
            <Button size="sm" onClick={submitNewGoal}>
              Add
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
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.addTrigger}
            onClick={() => setAdding(true)}
          >
            + Add milestone
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
