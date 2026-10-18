import type { Goal } from '../domain/types';

/**
 * Weights only mean something when they differ: with every milestone at the
 * same weight, the reports leave them out.
 */
export function weightsVary(goals: Pick<Goal, 'weight'>[]): boolean {
  return new Set(goals.map((goal) => goal.weight)).size > 1;
}
