import { toSideTopics } from './sideTopics';

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
  });
});
