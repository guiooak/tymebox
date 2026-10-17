import type { SideTopic } from './types';

function normalizeSideTopic(topic: Partial<SideTopic>, key: string): SideTopic {
  return {
    id: topic.id ?? '',
    value: topic.value ?? '',
    goalName: topic.goalName ?? '',
    key,
  };
}

/**
 * Side topics keyed by their database key, in database order. Older topics were
 * written as an array (keys 0, 1, …); new ones get push keys, which sort after
 * the numeric ones and chronologically among themselves.
 */
export function toSideTopics(
  value:
    | Record<string, Partial<SideTopic>>
    | Array<Partial<SideTopic> | null>
    | undefined
    | null,
): SideTopic[] {
  if (!value) {
    return [];
  }
  const entries: Array<[string, Partial<SideTopic> | null]> = Array.isArray(value)
    ? value.map((topic, index) => [String(index), topic])
    : Object.entries(value);
  return entries
    .filter((entry): entry is [string, Partial<SideTopic>] => entry[1] != null)
    .sort(([a], [b]) => compareKeys(a, b))
    .map(([key, topic]) => normalizeSideTopic(topic, key));
}

/** The database's key order: integer keys first, numerically; then the rest as strings. */
function compareKeys(a: string, b: string): number {
  const intA = /^\d+$/.test(a);
  const intB = /^\d+$/.test(b);
  if (intA && intB) {
    return Number(a) - Number(b);
  }
  if (intA !== intB) {
    return intA ? -1 : 1;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}
