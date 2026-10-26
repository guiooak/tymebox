import { useState } from 'react';
import { Box, Button, Heading, Icon, type IconName } from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import styles from './Home.module.css';

const STORAGE_KEY = 'tw-onboarding-dismissed';

const STEP_ICONS: IconName[] = ['pencil', 'board', 'play', 'chart'];

export type OnboardingCardProps = {
  /** Seeds a small sample event so the flow can be tried without committing. */
  onTrySample: () => void;
};

/** First-run walkthrough: the draft → live → report model isn't obvious from a blank page. */
export function OnboardingCard({ onTrySample }: OnboardingCardProps) {
  const t = useT().home.onboarding;
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === '1',
  );

  if (dismissed) {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  };

  return (
    <Box className={styles.onboarding}>
      <div className={styles.onboardingHead}>
        <Heading size="sm" level={2}>
          {t.title}
        </Heading>
        <Button size="sm" theme="secondary" outline onClick={dismiss}>
          {t.gotIt}
        </Button>
      </div>
      <ol className={styles.steps}>
        {t.steps.map((step, index) => (
          <li key={index} className={styles.step}>
            <Icon name={STEP_ICONS[index]} size={22} className={styles.stepIcon} />
            <strong>{step.title}</strong>
            <span className={styles.meta}>{step.body}</span>
          </li>
        ))}
      </ol>
      <Button
        size="sm"
        theme="secondary"
        outline
        onClick={() => {
          dismiss();
          onTrySample();
        }}
      >
        {t.trySample}
      </Button>
    </Box>
  );
}
