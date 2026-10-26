/**
 * What other features may use from meeting. Import from here, not from
 * meeting's internal folders.
 */
export { emailKey } from './domain/access';
export { deleteMeetingEverywhere } from './domain/meetingRepository';
export { normalizeMeeting, type RawMeeting } from './domain/meetingShape';

// The screens, for the app shell's routes.
export { Home } from './home/Home';
export { MeetingForm } from './form/MeetingForm';
export { MeetingDashboard } from './dashboard/MeetingDashboard';
export { MeetingReport } from './report/MeetingReport';
export { MeetingsHistory } from './history/MeetingsHistory';
