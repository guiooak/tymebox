/** Centralized route paths. Change a URL here, not at every call site. */
export const paths = {
  home: '/',
  login: '/login',
  meetings: '/events',
  newMeeting: '/events/new',
  /** An event's live board: the link people share. */
  event: '/events/:id',
  eventReport: '/events/:id/report',
  /** Before events had ids in their URL; these now redirect to your current event. */
  liveMeeting: '/events/live',
  report: '/events/report',
} as const;

/** The live board of one event. */
export const eventPath = (id: string) => `/events/${id}`;

/** The report of one event. */
export const eventReportPath = (id: string) => `/events/${id}/report`;

/** URLs from before the routes were named after events, kept working for
 * bookmarks and open tabs: old path → current path. */
export const legacyRedirects: ReadonlyArray<readonly [string, string]> = [
  ['/meetings', paths.meetings],
  ['/meetings/new', paths.newMeeting],
  ['/meetings/live', paths.liveMeeting],
  ['/meetings/report', paths.report],
];
