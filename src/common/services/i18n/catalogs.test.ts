import { describe, expect, it } from 'vitest';
import { en } from './messages/en';
import { ptBR } from './messages/ptBR';

/*
 * Every text that takes values is a function. Call each one, in both
 * languages, with the values it takes: counts of 0, 1 and more (plurals),
 * negatives, names, empty text and a missing optional value. None may throw or
 * hand back anything but text, and nothing may print "undefined" or "NaN".
 */

type Fn = (...args: unknown[]) => unknown;

function functionsOf(node: unknown, path = ''): Array<[string, Fn]> {
  if (typeof node === 'function') {
    return [[path, node as Fn]];
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) =>
      functionsOf(value, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

/** Parameters that are counts, by name (the source catalog names them consistently). */
const NUMERIC = new Set([
  'n',
  'pct',
  'goals',
  'milestones',
  'position',
  'total',
  'weight',
  'events',
  'shared',
  'year',
]);
/** The only functions whose last value may be left out. */
const OPTIONAL_LAST = new Set(['home.greeting', 'report.text.goal']);
/** `done` is a count here, a time elsewhere. */
const NUMERIC_BY_PATH: Record<string, string[]> = { 'landing.demo.progress': ['done'] };

function parameterNames(fn: Fn): string[] {
  const source = fn.toString();
  const head = source.slice(0, source.indexOf('=>')).replace(/[()\s]/g, '');
  return head ? head.split(',').map((param) => param.split('=')[0]) : [];
}

const englishParams = Object.fromEntries(
  functionsOf(en).map(([path, fn]) => [path, parameterNames(fn)]),
);

function argumentSets(path: string): unknown[][] {
  const params = englishParams[path];
  const isNumber = (param: string) =>
    NUMERIC.has(param) || (NUMERIC_BY_PATH[path] ?? []).includes(param);
  // 12 for English ordinals (12th, not 12nd).
  const numbers = [0, 1, 2, 12, 25, -3];
  const texts = ['Ana', '', 'Ana', 'Ana', 'Ana', 'Ana'];
  const sets = numbers.map((number, index) =>
    params.map((param) => (isNumber(param) ? number : texts[index])),
  );
  // Different counts side by side (e.g. events and shared).
  sets.push(params.map((param, index) => (isNumber(param) ? 3 - index : 'Ana')));
  if (OPTIONAL_LAST.has(path)) {
    sets.push(params.slice(0, -1).map((param) => (isNumber(param) ? 1 : 'Ana')));
  }
  return sets;
}

describe.each([
  ['en', en],
  ['pt-BR', ptBR],
])('the %s catalog', (_name, catalog) => {
  const functions = functionsOf(catalog);

  it('has the same functions as the English source', () => {
    expect(functions.map(([path]) => path)).toEqual(Object.keys(englishParams));
  });

  it.each(functions)('%s always returns clean text', (path, fn) => {
    for (const args of argumentSets(path)) {
      const result = fn(...args);
      expect(typeof result).toBe('string');
      // A missing optional value may be skipped, never printed.
      if (args.length === englishParams[path].length) {
        expect(result).not.toMatch(/undefined|NaN/);
      }
    }
  });
});
