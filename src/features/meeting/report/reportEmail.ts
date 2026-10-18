import type { Theme } from '../../../common/components';
import { formatLong, formatTime, isSameDay } from '../../../common/services/datetime';
import { getT } from '../../../common/services/i18n';
import type { Meeting } from '../domain/types';
import { timeCards } from './timeCards';

/*
 * The report as an e-mail: one self-contained HTML block with every style
 * inline, laid out with tables, which is what Gmail, Outlook and Apple Mail
 * keep when you paste. Always the light palette (mail is read on white); the
 * colours mirror the design tokens in src/common/tokens/colors.css.
 */

const C = {
  page: '#f8fafc', // slate-50
  surface: '#ffffff',
  sunken: '#f1f5f9', // slate-100
  border: '#e2e8f0', // slate-200
  text: '#0f172a', // slate-900
  muted: '#64748b', // slate-500
  primary: '#2563eb', // blue-600
  successText: '#047857', // emerald-700
  successTint: '#dcece7', // emerald-700 at 14% on white, like TimeDisplay
  warningTint: '#fdf0d8', // amber-500 at 16%
  dangerTint: '#fbe5e5', // red-600 at 12%
  infoTint: '#e4eafa', // blue-700 at 12%
};

const SANS =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO =
  "'JetBrains Mono', SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

const TINT: Record<Theme, string> = {
  primary: C.sunken,
  secondary: C.sunken,
  light: C.sunken,
  dark: C.sunken,
  success: C.successTint,
  warning: C.warningTint,
  danger: C.dangerTint,
  info: C.infoTint,
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escaped, with line breaks kept. */
const prose = (text: string) => escapeHtml(text).replace(/\r?\n/g, '<br>');

export type ReportEmailOptions = {
  /** PNG data URL of the burndown chart, in light colours. */
  chartImage: string | null;
  /** "3rd event in a row on budget", shown from 2 on. */
  streak: number;
  /** Absolute link back to the report. */
  reportUrl: string;
};

function dateLines(meeting: Meeting): string[] {
  const t = getT().report;
  return isSameDay(meeting.realStartTime, meeting.realEndTime)
    ? [t.happenedOn(formatLong(meeting.realStartTime), formatTime(meeting.realEndTime))]
    : [
        t.started(formatLong(meeting.realStartTime)),
        t.finished(formatLong(meeting.realEndTime)),
      ];
}

const sectionTitle = (text: string) =>
  `<h2 style="margin:28px 0 12px;font-family:${SANS};font-size:18px;line-height:1.3;font-weight:700;letter-spacing:-0.01em;color:${C.text};">${escapeHtml(text)}</h2>`;

/** The pasteable HTML block (no <html>/<body>), also used for the preview. */
export function reportEmailFragment(
  meeting: Meeting,
  options: ReportEmailOptions,
): string {
  const t = getT().report;
  const parts: string[] = [];

  parts.push(
    `<p style="margin:0 0 6px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.primary};">${escapeHtml(t.emailKicker)}</p>`,
    `<h1 style="margin:0 0 6px;font-family:${SANS};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:${C.text};">${escapeHtml(meeting.name)}</h1>`,
    ...dateLines(meeting).map(
      (line) =>
        `<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.muted};">${escapeHtml(line)}</p>`,
    ),
  );
  if (meeting.description.trim()) {
    parts.push(
      `<p style="margin:14px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};">${prose(meeting.description)}</p>`,
    );
  }
  if (options.streak >= 2) {
    parts.push(
      `<p style="margin:14px 0 0;"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${C.successTint};color:${C.successText};font-family:${SANS};font-size:13px;font-weight:600;">${escapeHtml(t.streak(options.streak))}</span></p>`,
    );
  }

  parts.push(sectionTitle(t.goals));
  for (const goal of meeting.goals) {
    const meta = `${goal.finishedAt ? t.doneAt(formatTime(goal.finishedAt)) : t.notDone} · ${t.weight(goal.weight)}`;
    const notes = goal.decisions.trim()
      ? `<tr><td colspan="2" style="padding:6px 0 0;font-family:${SANS};font-size:14px;line-height:1.55;color:${C.muted};">${prose(goal.decisions)}</td></tr>`
      : '';
    parts.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;border:1px solid ${C.border};border-radius:10px;border-collapse:separate;"><tr><td style="padding:12px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family:${SANS};font-size:15px;font-weight:700;color:${C.text};">${escapeHtml(goal.name)}</td><td align="right" style="font-family:${SANS};font-size:13px;color:${goal.finishedAt ? C.successText : C.muted};white-space:nowrap;padding-left:12px;">${escapeHtml(meta)}</td></tr>${notes}</table></td></tr></table>`,
    );
  }

  const topics = meeting.sideTopics.filter((topic) => topic.value.trim());
  if (topics.length) {
    parts.push(sectionTitle(t.sideTopics));
    parts.push(
      `<ul style="margin:0;padding:0 0 0 20px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};">${topics
        .map(
          (topic) =>
            `<li style="margin:0 0 4px;">${prose(topic.value)}${
              topic.goalName
                ? ` <span style="color:${C.muted};">${escapeHtml(t.during(topic.goalName))}</span>`
                : ''
            }</li>`,
        )
        .join('')}</ul>`,
    );
  }

  if (options.chartImage) {
    parts.push(sectionTitle(t.performance));
    parts.push(
      `<img src="${escapeHtml(options.chartImage)}" alt="${escapeHtml(t.chartAlt)}" width="584" style="display:block;width:100%;max-width:584px;height:auto;border:1px solid ${C.border};border-radius:10px;" />`,
    );
  }

  parts.push(sectionTitle(t.timing));
  // Gaps without negative margins (Outlook ignores those): the outer cells pad inward only.
  const gaps = ['0 6px 0 0', '0 3px', '0 0 0 6px'];
  const cells = timeCards(meeting)
    .map(
      (card, index) =>
        `<td width="33%" valign="top" style="padding:${gaps[index] ?? '0 3px'};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TINT[card.theme]};border-radius:10px;border-collapse:separate;"><tr><td align="center" style="padding:16px 10px;font-family:${SANS};color:${C.text};"><div style="font-size:12px;letter-spacing:0.04em;text-transform:uppercase;opacity:0.85;">${escapeHtml(card.label)}</div><div style="margin:10px 0;font-family:${MONO};font-size:24px;font-weight:700;">${escapeHtml(card.actual)}</div><div style="font-size:12px;color:${C.muted};">${escapeHtml(card.planned)}</div>${
          card.message
            ? `<div style="margin-top:4px;font-size:12px;">${escapeHtml(card.message)}</div>`
            : ''
        }</td></tr></table></td>`,
    )
    .join('');
  parts.push(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`,
  );

  parts.push(
    `<p style="margin:28px 0 0;"><a href="${escapeHtml(options.reportUrl)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:${C.primary};color:#ffffff;font-family:${SANS};font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(t.emailOpen)}</a></p>`,
    `<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid ${C.border};font-family:${SANS};font-size:12px;color:${C.muted};">${escapeHtml(t.emailFooter)}</p>`,
  );

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:${C.surface};border:1px solid ${C.border};border-radius:14px;border-collapse:separate;"><tr><td style="padding:28px;text-align:left;">${parts.join('')}</td></tr></table></td></tr></table>`;
}

/** The plain-text version, for clients that only take text. */
export function reportText(meeting: Meeting, reportUrl?: string): string {
  const t = getT().report.text;
  const lines: string[] = [meeting.name, ''];
  if (meeting.description) {
    lines.push(meeting.description, '');
  }
  lines.push(t.goals);
  for (const goal of meeting.goals) {
    const done = goal.finishedAt ? t.doneAt(formatTime(goal.finishedAt)) : t.notDone;
    lines.push(t.goal(goal.name, goal.weight, done));
    if (goal.decisions) {
      lines.push(`    ${goal.decisions}`);
    }
  }
  const topics = meeting.sideTopics.filter((topic) => topic.value.trim());
  if (topics.length) {
    lines.push('', t.sideTopics);
    topics.forEach((topic) =>
      lines.push(
        topic.goalName ? t.topicDuring(topic.value, topic.goalName) : `• ${topic.value}`,
      ),
    );
  }
  lines.push('', t.happened(formatLong(meeting.realStartTime)));
  if (reportUrl) {
    lines.push(reportUrl);
  }
  return lines.join('\n');
}

/** The full document put on the clipboard as text/html. */
export function reportEmailHtml(meeting: Meeting, options: ReportEmailOptions): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;">${reportEmailFragment(meeting, options)}</body></html>`;
}
