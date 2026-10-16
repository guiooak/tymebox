import { useState } from 'react';
import { Box, Button, Heading, Icon, type IconName } from '../../../common/components';
import styles from './Home.module.css';

const STORAGE_KEY = 'tw-onboarding-dismissed';

const STEPS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: 'pencil',
    title: 'Name it',
    body: 'An event starts with a title. Nothing else is required up front.',
  },
  {
    icon: 'board',
    title: 'Fill the board',
    body: 'Add milestones, set a start and end time, edit anything at any moment.',
  },
  {
    icon: 'play',
    title: 'Run it',
    body: 'Hit Start. The countdown and burndown chart track how you are doing.',
  },
  {
    icon: 'chart',
    title: 'Read the report',
    body: 'Finishing produces a report you can print, export or copy.',
  },
];

export type OnboardingCardProps = {
  /** Seeds a small sample event so the flow can be tried without committing. */
  onTrySample: () => void;
};

/** First-run walkthrough: the draft → live → report model isn't obvious from a blank page. */
export function OnboardingCard({ onTrySample }: OnboardingCardProps) {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1',
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
          How Tymebox works
        </Heading>
        <Button size="sm" theme="secondary" outline onClick={dismiss}>
          Got it
        </Button>
      </div>
      <ol className={styles.steps}>
        {STEPS.map((step) => (
          <li key={step.title} className={styles.step}>
            <Icon name={step.icon} size={22} className={styles.stepIcon} />
            <strong>{step.title}</strong>
            <span className={styles.meta}>{step.body}</span>
          </li>
        ))}
      </ol>
      <Button
        size="sm"
        onClick={() => {
          dismiss();
          onTrySample();
        }}
      >
        Try a sample event
      </Button>
    </Box>
  );
}
