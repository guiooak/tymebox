import { eventPath, eventReportPath, legacyRedirects, paths } from './paths';

describe('paths', () => {
  it('names the event routes after events', () => {
    for (const path of Object.values(paths)) {
      expect(path).not.toMatch(/^\/meetings/);
    }
  });

  it('redirects every old /meetings URL to a current route', () => {
    const current = new Set<string>(Object.values(paths));
    expect(legacyRedirects.map(([from]) => from)).toEqual([
      '/meetings',
      '/meetings/new',
      '/meetings/live',
      '/meetings/report',
    ]);
    for (const [from, to] of legacyRedirects) {
      expect(current.has(to)).toBe(true);
      expect(to).toBe(from.replace(/^\/meetings/, '/events'));
    }
  });
});

describe('event paths', () => {
  it('puts the event id in the URL', () => {
    expect(eventPath('-OAbc123')).toBe('/events/-OAbc123');
    expect(eventReportPath('-OAbc123')).toBe('/events/-OAbc123/report');
  });
});
