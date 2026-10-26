import { Box } from '../../../common/components';
import { cx } from '../../../common/components/cx';
import { formatDuration } from '../../../common/services/datetime';
import { useT, type Messages } from '../../../common/services/i18n';
import type { MeetingMetrics } from './useMeetingMetrics';
import styles from './Home.module.css';

function budgetLabel(
  ratio: number | null,
  t: Messages['home']['budget'],
): { value: string; note: string } {
  if (ratio == null) {
    return { value: t.none, note: t.noneNote };
  }
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) {
    return { value: t.onBudget, note: t.onBudgetNote };
  }
  return pct > 0
    ? { value: t.over(pct), note: t.overNote }
    : { value: t.under(Math.abs(pct)), note: t.underNote };
}

/** A metric box's colour, from how the number reads: good, borderline or bad
 * news, a neutral count, or the amber of an on-budget streak. */
type MetricTone = 'good' | 'warn' | 'bad' | 'info' | 'streak' | null;

/** Within 15% over the plan is borderline; beyond it, over budget. */
function budgetTone(ratio: number | null): MetricTone {
  if (ratio == null) {
    return null;
  }
  return ratio <= 1 ? 'good' : ratio <= 1.15 ? 'warn' : 'bad';
}

function goalsTone(completion: number | null): MetricTone {
  if (completion == null) {
    return null;
  }
  return completion >= 0.8 ? 'good' : completion >= 0.5 ? 'warn' : 'bad';
}

const metricTone = (tone: MetricTone) =>
  tone ? cx(styles.toned, styles[`tone-${tone}`]) : undefined;

/** Home's four numbers: time against budget, goals met, this month, streak. */
export function MetricsGrid({ metrics }: { metrics: MeetingMetrics }) {
  const t = useT().home;
  const budget = budgetLabel(metrics.budgetRatio, t.budget);

  return (
    <div className={styles.metrics}>
      <Box className={cx(styles.metric, metricTone(budgetTone(metrics.budgetRatio)))}>
        <span className={styles.metricValue}>{budget.value}</span>
        <span className={styles.metricLabel}>{t.timeVsBudget}</span>
        <span className={styles.metricNote}>{budget.note}</span>
      </Box>
      <Box className={cx(styles.metric, metricTone(goalsTone(metrics.goalCompletion)))}>
        <span className={styles.metricValue}>
          {metrics.goalCompletion == null
            ? '—'
            : `${Math.round(metrics.goalCompletion * 100)}%`}
        </span>
        <span className={styles.metricLabel}>{t.goalsCompleted}</span>
        <span className={styles.metricNote}>{t.goalsCompletedNote}</span>
      </Box>
      <Box
        className={cx(styles.metric, metricTone(metrics.thisMonth > 0 ? 'info' : null))}
      >
        <span className={styles.metricValue}>{metrics.thisMonth}</span>
        <span className={styles.metricLabel}>{t.thisMonth}</span>
        <span className={styles.metricNote}>{t.finishedAllTime(metrics.finished)}</span>
      </Box>
      <Box
        className={cx(
          styles.metric,
          metricTone(metrics.onBudgetStreak > 0 ? 'streak' : null),
        )}
      >
        <span className={styles.metricValue}>
          {metrics.onBudgetStreak > 0 ? `${metrics.onBudgetStreak} 🔥` : '—'}
        </span>
        <span className={styles.metricLabel}>{t.streak}</span>
        <span className={styles.metricNote}>
          {metrics.totalSpentMs > 0
            ? t.spentTotal(formatDuration(metrics.totalSpentMs))
            : t.streakEmpty}
        </span>
      </Box>
    </div>
  );
}
