import { compareKeys, toSideTopics } from './sideTopics';

const topic = (id: string) => ({ id, value: id, goalName: '' });

describe('toSideTopics', () => {
  it('reads the old array shape, keyed by index', () => {
    expect(
      toSideTopics([topic('a'), null, topic('c')]).map((t) => [t.key, t.id]),
    ).toEqual([
      ['0', 'a'],
      ['2', 'c'],
    ]);
  });

  it('keeps old array topics ahead of newer push-key topics, in order', () => {
    const topics = toSideTopics({
      '-OAbcNewer': topic('newer'),
      '10': topic('ten'),
      '-OAbcFirst': topic('first-push'),
      '2': topic('two'),
    });
    expect(topics.map((t) => t.id)).toEqual(['two', 'ten', 'first-push', 'newer']);
  });

  it('fills missing fields and handles an empty node', () => {
    expect(toSideTopics({ k: { id: 'x' } })).toEqual([
      { id: 'x', value: '', goalName: '', key: 'k' },
    ]);
    expect(toSideTopics(null)).toEqual([]);
    expect(toSideTopics({ k: {} })).toEqual([
      { id: '', value: '', goalName: '', key: 'k' },
    ]);
  });
});

describe('toSideTopics key order', () => {
  it('sorts push keys as text, after the numeric ones, whatever the input order', () => {
    const topics = toSideTopics({
      '-Nb': topic('b'),
      '-Na': topic('a'),
      '10': topic('ten'),
      '2': topic('two'),
      '-Nc': topic('c'),
    });
    expect(topics.map((item) => item.key)).toEqual(['2', '10', '-Na', '-Nb', '-Nc']);
  });
});

describe('compareKeys', () => {
  it('puts integer keys first, in number order, then the rest as text', () => {
    expect(compareKeys('2', '10')).toBeLessThan(0);
    expect(compareKeys('1', '-Na')).toBe(-1);
    expect(compareKeys('-Na', '1')).toBe(1);
    expect(compareKeys('-Na', '-Nb')).toBe(-1);
    expect(compareKeys('-Nb', '-Na')).toBe(1);
  });
});
