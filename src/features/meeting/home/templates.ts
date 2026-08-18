/** One-click starting points for the lightweight creation flow. */
export type MeetingTemplate = {
  id: string;
  label: string;
  hint: string;
  name: string;
  goals: string[];
};

export const meetingTemplates: MeetingTemplate[] = [
  {
    id: 'weekly-planning',
    label: 'Weekly planning',
    hint: '3 milestones · 1h',
    name: 'Weekly planning',
    goals: ['Review last week', 'Pick this week’s priorities', 'Assign owners'],
  },
  {
    id: 'retro',
    label: 'Retro',
    hint: '4 milestones · 1h',
    name: 'Retro',
    goals: ['What went well', 'What didn’t', 'What we’ll change', 'Action items'],
  },
  {
    id: 'one-on-one',
    label: '1:1',
    hint: '3 milestones · 30m',
    name: '1:1',
    goals: ['Their agenda', 'My agenda', 'Next steps'],
  },
];
