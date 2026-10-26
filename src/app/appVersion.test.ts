import { appVersion } from './appVersion';

describe('appVersion', () => {
  it('links a release to its GitHub Release', () => {
    expect(appVersion('1.4.0')).toEqual({
      label: 'v1.4.0',
      href: 'https://github.com/guiooak/tymebox/releases/tag/v1.4.0',
    });
  });

  it('shows a PR preview without a link', () => {
    expect(appVersion('1.4.0-pr.12')).toEqual({ label: 'v1.4.0-pr.12', href: null });
  });

  it('says dev when the build has no version', () => {
    expect(appVersion(undefined)).toEqual({ label: 'dev', href: null });
    expect(appVersion('  ')).toEqual({ label: 'dev', href: null });
  });
});
