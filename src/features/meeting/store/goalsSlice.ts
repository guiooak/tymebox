import * as repo from '../domain/meetingRepository';
import {
  createGoal,
  createSideTopic,
  duplicateGoal as cloneGoal,
  moveItem,
} from '../domain/types';
import type { Slice } from './context';

/** Goals (milestones) on the open event, and its side topics (parking lot). */
export const goalsSlice: Slice<
  | 'updateGoal'
  | 'addGoal'
  | 'removeGoal'
  | 'duplicateGoal'
  | 'moveGoal'
  | 'reorderGoals'
  | 'addSideTopic'
  | 'updateSideTopic'
  | 'removeSideTopic'
> = (_store, { editable }) => ({
  updateGoal: async (goalId, patch) => {
    const event = editable();
    if (!event) {
      return;
    }
    const { id: _id, ...fields } = patch;
    await repo.patchGoal(event.id, goalId, fields);
  },

  addGoal: async (name, weight = 1) => {
    const event = editable();
    if (event) {
      await repo.putGoal(event.id, createGoal(name, weight), event.goals.length);
    }
  },

  removeGoal: async (goalId) => {
    const event = editable();
    if (event) {
      await repo.deleteGoal(event.id, goalId);
    }
  },

  duplicateGoal: async (goalId) => {
    const event = editable();
    if (!event) {
      return;
    }
    const index = event.goals.findIndex((goal) => goal.id === goalId);
    if (index < 0) {
      return;
    }
    const copy = cloneGoal(event.goals[index]);
    const goals = [
      ...event.goals.slice(0, index + 1),
      copy,
      ...event.goals.slice(index + 1),
    ];
    await repo.putGoal(event.id, copy, index + 1);
    await repo.setGoalOrder(event.id, goals);
  },

  moveGoal: async (goalId, offset) => {
    const event = editable();
    if (!event) {
      return;
    }
    const from = event.goals.findIndex((goal) => goal.id === goalId);
    if (from >= 0) {
      await repo.setGoalOrder(event.id, moveItem(event.goals, from, from + offset));
    }
  },

  reorderGoals: async (from, to) => {
    const event = editable();
    if (event) {
      await repo.setGoalOrder(event.id, moveItem(event.goals, from, to));
    }
  },

  // One topic per write, at its own path, so an add can never be undone by an
  // older copy of the list landing later.
  addSideTopic: (goalName) => {
    const event = editable();
    if (!event) {
      return null;
    }
    const key = repo.newSideTopicKey(event.id);
    // Fire and forget: a rejected write surfaces through SaveErrorToast.
    void repo.putSideTopic(event.id, key, createSideTopic(goalName));
    return key;
  },

  updateSideTopic: async (key, value) => {
    const event = editable();
    if (event) {
      await repo.setSideTopicValue(event.id, key, value);
    }
  },

  removeSideTopic: async (key) => {
    const event = editable();
    if (event) {
      await repo.deleteSideTopic(event.id, key);
    }
  },
});
