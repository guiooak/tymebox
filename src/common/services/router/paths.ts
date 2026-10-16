/** Centralized route paths. Change a URL here, not at every call site. */
export const paths = {
  home: '/',
  login: '/login',
  meetings: '/events',
  newMeeting: '/events/new',
  liveMeeting: '/events/live',
  report: '/events/report',
} as const;

/** URLs from before the routes were named after events, kept working for
 * bookmarks and open tabs: old path → current path. */
export const legacyRedirects: ReadonlyArray<readonly [string, string]> = [
  ['/meetings', paths.meetings],
  ['/meetings/new', paths.newMeeting],
  ['/meetings/live', paths.liveMeeting],
  ['/meetings/report', paths.report],
];
