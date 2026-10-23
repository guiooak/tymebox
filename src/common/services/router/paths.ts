import type { Locale } from '../i18n';

/** Centralized route paths. Change a URL here, not at every call site. */
export const paths = {
  home: '/',
  login: '/login',
  /** The public landing, one URL per language (see landingPath). */
  landingPt: '/pt',
  landingEn: '/en',
  /** Privacy Policy and Terms of Use, one URL per language (see legal/). */
  privacyPt: '/privacidade',
  privacyEn: '/privacy',
  termsPt: '/termos',
  termsEn: '/terms',
  meetings: '/events',
  newMeeting: '/events/new',
  /** An event's live board: the link people share. */
  event: '/events/:id',
  eventReport: '/events/:id/report',
  /** Before events had ids in their URL; these now redirect to your current event. */
  liveMeeting: '/events/live',
  report: '/events/report',
} as const;

/** The landing page in a given language: /pt or /en. */
export const landingPath = (locale: Locale) =>
  locale === 'pt-BR' ? paths.landingPt : paths.landingEn;

/** The Privacy Policy in a given language. */
export const privacyPath = (locale: Locale) =>
  locale === 'pt-BR' ? paths.privacyPt : paths.privacyEn;

/** The Terms of Use in a given language. */
export const termsPath = (locale: Locale) =>
  locale === 'pt-BR' ? paths.termsPt : paths.termsEn;

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
