import {
  bumpFor,
  nextVersion,
  releaseNotes,
  type Commit,
} from '../../scripts/release-version';

const commit = (subject: string, body = '', sha = 'abcdef1234567'): Commit => ({
  sha,
  subject,
  body,
});

describe('bumpFor', () => {
  it('bumps the patch for fixes and everything that is not a feature', () => {
    expect(
      bumpFor([commit('fix(report): x'), commit('docs: y'), commit('Merge z')]),
    ).toBe('patch');
    expect(bumpFor([])).toBe('patch');
  });

  it('bumps the minor for any feature', () => {
    expect(bumpFor([commit('fix: x'), commit('feat(share): y')])).toBe('minor');
    expect(bumpFor([commit('Feat: y')])).toBe('minor');
  });

  it('bumps the major for a breaking change, by marker or footer', () => {
    expect(bumpFor([commit('feat!: x')])).toBe('major');
    expect(bumpFor([commit('refactor(db)!: x')])).toBe('major');
    expect(bumpFor([commit('fix: x', 'Text.\n\nBREAKING CHANGE: paths moved')])).toBe(
      'major',
    );
    expect(bumpFor([commit('fix: x', 'BREAKING-CHANGE: y')])).toBe('major');
  });
});

describe('nextVersion', () => {
  it('starts at the base version when there is no release yet', () => {
    expect(nextVersion(null, '1.0.0', [commit('feat: x')])).toBe('1.0.0');
    expect(nextVersion('not-a-tag', 'v2.1.0', [])).toBe('2.1.0');
    expect(() => nextVersion(null, 'next', [])).toThrow('Not a version: next');
  });

  it('bumps from the last tag', () => {
    expect(nextVersion('v1.2.3', '1.0.0', [commit('chore: x')])).toBe('1.2.4');
    expect(nextVersion('v1.2.3', '1.0.0', [commit('feat: x')])).toBe('1.3.0');
    expect(nextVersion('v1.2.3', '1.0.0', [commit('feat!: x')])).toBe('2.0.0');
  });
});

describe('releaseNotes', () => {
  it('introduces the first release', () => {
    expect(releaseNotes(null, [commit('feat: x')])).toBe(
      'The first versioned release of Tymebox.\n',
    );
  });

  it('says when nothing changed', () => {
    expect(releaseNotes('v1.0.0', [])).toBe('No changes since v1.0.0.\n');
  });

  it('groups the commits by kind, each once', () => {
    const notes = releaseNotes('v1.0.0', [
      commit('feat!: drop old links', '', '1111111aaaa'),
      commit('feat(share): links', '', '2222222bbbb'),
      commit('fix: report', '', '3333333cccc'),
      commit('docs: readme', '', '4444444dddd'),
    ]);
    expect(notes).toBe(
      [
        '## Breaking changes\n\n- feat!: drop old links (1111111)\n',
        '## Features\n\n- feat(share): links (2222222)\n',
        '## Fixes\n\n- fix: report (3333333)\n',
        '## Other changes\n\n- docs: readme (4444444)\n',
      ].join('\n'),
    );
  });

  it('leaves out empty sections', () => {
    expect(releaseNotes('v1.0.0', [commit('fix: a', '', '5555555eeee')])).toBe(
      '## Fixes\n\n- fix: a (5555555)\n',
    );
  });
});
