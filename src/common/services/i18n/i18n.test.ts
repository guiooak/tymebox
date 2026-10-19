import { formatLong } from '../datetime';
import { detectLocale, LOCALE_STORAGE_KEY, messagesFor, useI18nStore } from './index';
import { en } from './messages/en';
import { ptBR } from './messages/ptBR';

type Node = string | ((...args: never[]) => unknown) | Node[] | { [key: string]: Node };

/** Every string (or sample output of a function) in a catalog, by its path. */
function leaves(node: Node, path = ''): Array<[string, unknown]> {
  if (typeof node === 'string') {
    return [[path, node]];
  }
  if (typeof node === 'function') {
    const fn = node as (...args: unknown[]) => unknown;
    let sample: unknown;
    try {
      sample = fn('X', 'Y', 'Z');
    } catch {
      sample = fn(2, 3, 4);
    }
    return [[path, sample]];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    leaves(value as Node, path ? `${path}.${key}` : key),
  );
}

// Same in both languages on purpose: brand, symbols, numbers and loanwords.
const SAME_IN_BOTH = new Set([
  'formats.longDate',
  'common.ok',
  'landing.parking.topics',
  'home.budget.none',
  'home.greeting',
  'landing.footerBefore',
  'shell.footerBefore',
  'home.templates.retro.label',
  'home.templates.oneOnOne.label',
  'share.link',
]);

describe('catalogs', () => {
  const english = new Map(leaves(en as unknown as Node));
  const portuguese = new Map(leaves(ptBR as unknown as Node));

  it('have the same keys', () => {
    expect([...portuguese.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('have no empty strings', () => {
    for (const [path, value] of [...english, ...portuguese]) {
      expect(value, path).not.toBe('');
    }
  });

  it('translate everything except the few shared terms', () => {
    const untranslated = [...english]
      .filter(([path, value]) => portuguese.get(path) === value)
      .map(([path]) => path)
      .filter((path) => ![...SAME_IN_BOTH].some((same) => path.startsWith(same)));
    expect(untranslated).toEqual([]);
  });
});

describe('detectLocale', () => {
  it('picks Portuguese for any pt-* browser language, English otherwise', () => {
    expect(detectLocale(['pt-BR', 'en'])).toBe('pt-BR');
    expect(detectLocale(['en-GB', 'pt-PT'])).toBe('pt-BR');
    expect(detectLocale(['es-ES', 'en-US'])).toBe('en-US');
    expect(detectLocale([])).toBe('en-US');
  });
});

describe('the language store', () => {
  afterEach(() => useI18nStore.getState().setLocale('en-US'));

  it('remembers the choice, marks <html lang> and switches strings and dates', () => {
    useI18nStore.getState().setLocale('pt-BR');
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(messagesFor('pt-BR').home.newEvent).toBe('+ Novo evento');
    expect(formatLong('2026-10-17T14:51:00')).toBe(
      'sábado, 17 de outubro de 2026, 14:51h',
    );

    useI18nStore.getState().setLocale('en-US');
    expect(formatLong('2026-10-17T14:51:00')).toBe('Saturday, October 17th 2026, 14:51h');
  });

  it('pluralises in each language', () => {
    expect(en.home.milestoneCount(1)).toBe('1 milestone');
    expect(ptBR.home.milestoneCount(3)).toBe('3 marcos');
    expect(ptBR.report.streak(3)).toContain('3º');
  });
});
