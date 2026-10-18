import type { Meeting } from '../domain/types';
import {
  escapeHtml,
  reportEmailFragment,
  reportEmailHtml,
  reportText,
} from './reportEmail';

const meeting: Meeting = {
  id: 'm1',
  owner: 'u1',
  ownerName: 'Ana',
  name: 'Retro <script>alert(1)</script>',
  description: 'First line\nSecond & last',
  expectedStartTime: '2026-10-17T10:00:00',
  expectedEndTime: '2026-10-17T11:00:00',
  realStartTime: '2026-10-17T10:00:00',
  realEndTime: '2026-10-17T10:50:00',
  goals: [
    {
      id: 'g1',
      name: 'Wins',
      weight: 1,
      finishedAt: '2026-10-17T10:20:00',
      decisions: 'Ship it',
    },
    { id: 'g2', name: 'Pains', weight: 2, finishedAt: '', decisions: '' },
  ],
  sideTopics: [{ id: 't1', key: 't1', value: 'Hiring "plan"', goalName: 'Wins' }],
  status: 'finished',
  createdAt: '',
  updatedAt: '',
};

const options = {
  chartImage: 'data:image/png;base64,AAAA',
  streak: 3,
  reportUrl: 'https://tymebox.web.app/events/m1/report',
};

describe('reportEmail', () => {
  it('escapes everything that comes from the event', () => {
    const html = reportEmailFragment(meeting, options);
    expect(html).not.toContain('<script>');
    expect(html).toContain('Retro &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('First line<br>Second &amp; last');
    expect(html).toContain('Hiring &quot;plan&quot;');
    expect(escapeHtml(`'"<>&`)).toBe('&#39;&quot;&lt;&gt;&amp;');
  });

  it('carries the chart, the streak, the tinted timing cards and a link back', () => {
    const html = reportEmailFragment(meeting, options);
    expect(html).toContain('src="data:image/png;base64,AAAA"');
    expect(html).toContain('3rd event in a row finishing on budget');
    // Ended 10 minutes early: the end and duration cards are tinted green.
    expect(html).toContain('background:#dcece7');
    expect(html).toContain('href="https://tymebox.web.app/events/m1/report"');
    expect(html).toContain('done at 10:20h · weight 1');
    expect(html).toContain('not done · weight 2');
    // A small coloured logo, centred in the footer, in place of the "·".
    expect(html).toMatch(
      /Sent with Tymebox<\/td><td[^>]*><img src="data:image\/png;base64,[^"]+" alt="Tymebox" width="20"[^>]*><\/td><td[^>]*>focus only on what matters/,
    );
  });

  it('styles everything inline, with no stylesheet or class to lose on paste', () => {
    const html = reportEmailHtml(meeting, options);
    expect(html).not.toMatch(/<style|class=/);
    expect(html.startsWith('<!doctype html>')).toBe(true);
  });

  it('leaves out what is not there', () => {
    const html = reportEmailFragment(
      { ...meeting, description: '', sideTopics: [] },
      { ...options, chartImage: null, streak: 0 },
    );
    expect(html).not.toContain('alt="Burndown chart"');
    expect(html).not.toContain('in a row');
    expect(html).not.toContain('Side topics');
  });

  it('keeps a plain-text version with the link', () => {
    const text = reportText(meeting, options.reportUrl);
    expect(text).toContain('• Wins (weight 1) — done at 10:20h');
    expect(text).toContain('• Hiring "plan" (during Wins)');
    expect(text.endsWith(options.reportUrl)).toBe(true);
  });

  it('leaves weights out when every milestone has the same one', () => {
    const even = {
      ...meeting,
      goals: meeting.goals.map((goal) => ({ ...goal, weight: 1 })),
    };
    const html = reportEmailFragment(even, options);
    expect(html).not.toMatch(/weight \d/);
    expect(html).toContain('done at 10:20h<');
    expect(reportText(even)).toContain('• Wins — done at 10:20h');
    expect(reportText(even)).not.toMatch(/weight \d/);
  });
});
