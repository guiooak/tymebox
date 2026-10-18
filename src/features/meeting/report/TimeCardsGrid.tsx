import { Heading, TimeDisplay } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import { timeCards } from './timeCards';
import styles from './MeetingReport.module.css';

export type TimeCardsGridProps = {
  expectedStartTime: string;
  expectedEndTime: string;
  realStartTime: string;
  realEndTime: string;
};

export function TimeCardsGrid(props: TimeCardsGridProps) {
  const t = useT().report;
  return (
    <section>
      <Heading size="sm" level={2} className={styles.sectionTitle}>
        {t.timing}
      </Heading>
      <div className={styles.timeGrid}>
        {timeCards(props).map((card) => (
          <TimeDisplay
            key={card.label}
            theme={card.theme}
            header={card.label}
            footer={
              <span className={styles.timeCardFooter}>
                <span className={styles.planned}>{card.planned}</span>
                {card.message && <span>{card.message}</span>}
              </span>
            }
          >
            <span className={styles.timeCardValue}>{card.actual}</span>
          </TimeDisplay>
        ))}
      </div>
    </section>
  );
}
