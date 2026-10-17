/**
 * One-click starting points for the lightweight creation flow. Their names,
 * hints and starter milestones live in the i18n catalog (home.templates), so
 * an event created from one comes out in the user's language.
 */
export const MEETING_TEMPLATES = ['weeklyPlanning', 'retro', 'oneOnOne'] as const;

export type MeetingTemplateId = (typeof MEETING_TEMPLATES)[number];
