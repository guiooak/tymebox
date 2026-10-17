import { useEffect, useRef, useState } from 'react';
import { Badge, Icon, TimeDisplay } from '../../common/components';
import { usePrefersReducedMotion } from '../../common/services/motion';
import styles from './LandingDemo.module.css';

/** A 30-minute box, played back at 100x: one demo minute every 0.6s. */
const BOX_SECONDS = 30 * 60;
const STEP_SECONDS = 10;
const TICK_MS = 100;
/** Hold the finished board for a moment before starting over. */
const HOLD_SECONDS = 360;
/** Shown when motion is reduced: mid-event, two milestones in. */
const STILL_FRAME = 16 * 60;

const MILESTONES = [
  { name: 'Review last sprint', doneAt: 5 * 60 },
  { name: 'Pick the sprint goal', doneAt: 12 * 60 },
  { name: 'Size the top stories', doneAt: 26 * 60 },
  { name: 'Agree on owners', doneAt: 28 * 60 },
];
const FINISHED_AT = MILESTONES[MILESTONES.length - 1].doneAt;

const pad = (value: number) => String(value).padStart(2, '0');
const clock = (seconds: number) =>
  `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

/** Where the board is at a given second of the script. */
function frameAt(elapsed: number) {
  const now = Math.min(elapsed, FINISHED_AT);
  const done = MILESTONES.filter((milestone) => milestone.doneAt <= now).length;
  const finished = elapsed >= FINISHED_AT;
  // The tendency expects one milestone every 7.5 minutes; a full milestone
  // behind it reads as trending late, the way the real board does.
  const expected = (now / BOX_SECONDS) * MILESTONES.length;
  const late = !finished && expected - done >= 1;
  return { now, done, finished, late, left: BOX_SECONDS - now };
}

const W = 240;
const H = 96;
const PAD = 8;
const x = (seconds: number) => PAD + (seconds / BOX_SECONDS) * (W - PAD * 2);
const y = (done: number) => PAD + (done / MILESTONES.length) * (H - PAD * 2);

/** The burndown, drawn small: tendency dashed, your progress stepping down. */
function MiniBurndown({ now }: { now: number }) {
  let path = `M${x(0)} ${y(0)}`;
  let done = 0;
  for (const milestone of MILESTONES) {
    if (milestone.doneAt > now) {
      break;
    }
    done += 1;
    path += ` H${x(milestone.doneAt)} V${y(done)}`;
  }
  path += ` H${x(now)}`;
  return (
    <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} role="presentation">
      {[0, 1, 2, 3, 4].map((step) => (
        <line
          key={step}
          className={styles.grid}
          x1={PAD}
          x2={W - PAD}
          y1={y(step)}
          y2={y(step)}
        />
      ))}
      <line
        className={styles.tendency}
        x1={x(0)}
        y1={y(0)}
        x2={x(BOX_SECONDS)}
        y2={y(MILESTONES.length)}
      />
      <path className={styles.progress} d={path} />
      <circle className={styles.dot} cx={x(now)} cy={y(done)} r="3.5" />
    </svg>
  );
}

/**
 * The hero's mini board: a scripted 30-minute "Sprint planning" plays back
 * with the app's own countdown, badges and burndown colours. No store, no
 * Firebase. It pauses off-screen and in a hidden tab, and stands still when
 * the visitor prefers reduced motion.
 */
export function LandingDemo() {
  const reduceMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || !visible) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      setElapsed((value) =>
        value >= FINISHED_AT + HOLD_SECONDS ? 0 : value + STEP_SECONDS,
      );
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion, visible]);

  const frame = frameAt(reduceMotion ? STILL_FRAME : elapsed);
  const theme = frame.finished ? 'success' : frame.late ? 'warning' : 'secondary';
  const status = frame.finished
    ? { theme: 'info' as const, label: 'Finished' }
    : frame.late
      ? { theme: 'warning' as const, label: 'Trending late' }
      : { theme: 'success' as const, label: 'Live' };

  return (
    <div ref={rootRef} className={styles.board}>
      <p className={styles.srOnly}>
        A sample 30-minute sprint planning running on Tymebox: the countdown runs, four
        milestones are checked off one by one, the burndown follows them, and the event
        finishes two minutes early.
      </p>
      <div className={styles.frame} aria-hidden="true">
        <div className={styles.head}>
          <div>
            <span className={styles.eyebrow}>Event</span>
            <strong className={styles.title}>Sprint planning</strong>
          </div>
          <Badge theme={status.theme}>{status.label}</Badge>
        </div>

        <TimeDisplay
          prominent
          theme={theme}
          header={frame.finished ? 'Finished' : 'Time left'}
          footer={
            frame.finished
              ? `${clock(frame.left)} saved`
              : `${frame.done} of ${MILESTONES.length} milestones`
          }
        >
          <span className={styles.countdown}>{clock(frame.left)}</span>
        </TimeDisplay>

        <ol className={styles.milestones}>
          {MILESTONES.map((milestone, index) => {
            const done = index < frame.done;
            const current = index === frame.done && !frame.finished;
            return (
              <li
                key={milestone.name}
                className={[
                  styles.milestone,
                  done && styles.done,
                  current && styles.current,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.check}>
                  {done && <Icon name="check" size={14} />}
                </span>
                <span className={styles.name}>{milestone.name}</span>
                {done ? (
                  <span className={styles.time}>{clock(milestone.doneAt)}</span>
                ) : (
                  current && <span className={styles.now}>Now</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className={styles.chartBox}>
          <div className={styles.chartLegend}>
            <span>
              <i className={styles.legendTendency} /> Tendency
            </span>
            <span>
              <i className={styles.legendProgress} /> Your progress
            </span>
          </div>
          <MiniBurndown now={frame.now} />
        </div>
      </div>
    </div>
  );
}
