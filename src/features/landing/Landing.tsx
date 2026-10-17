import type { ReactNode } from 'react';
import { Badge, Icon, TimeDisplay, type IconName } from '../../common/components';
import { useReturnPath } from '../../common/services/router';
import { ThemeToggle } from '../../app/ThemeToggle';
import { Logo, TymeboxSymbol } from '../brand';
import { LandingDemo } from './LandingDemo';
import { SignInButton, TestSignIn } from './SignInPanel';
import styles from './Landing.module.css';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'pencil',
    title: 'Plan',
    text: 'Name it, set the time box and list the milestones, or start from a Weekly planning, Retro or 1:1 template.',
  },
  {
    icon: 'play',
    title: 'Run',
    text: 'The countdown keeps everyone honest. Check milestones off as you go and park side topics for later.',
  },
  {
    icon: 'chart',
    title: 'Review',
    text: 'A report with the burndown, the timing against plan and the parking lot. Print it or paste it in chat.',
  },
];

function Feature({
  eyebrow,
  title,
  text,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  text: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className={flip ? `${styles.feature} ${styles.flip}` : styles.feature}>
      <div className={styles.featureText}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h3 className={styles.featureTitle}>{title}</h3>
        <p className={styles.lead}>{text}</p>
      </div>
      <div className={styles.featureVisual} aria-hidden="true">
        {visual}
      </div>
    </div>
  );
}

function CountdownStates() {
  return (
    <div className={styles.states}>
      <TimeDisplay theme="secondary" header="On track" footer="2 of 4 milestones">
        <span className={styles.mono}>14:20</span>
      </TimeDisplay>
      <TimeDisplay theme="warning" header="Trending late" footer="1 milestone behind">
        <span className={styles.mono}>06:45</span>
      </TimeDisplay>
      <TimeDisplay theme="danger" header="Overdue" footer="over the box by">
        <span className={styles.mono}>+03:10</span>
      </TimeDisplay>
    </div>
  );
}

function ParkingLot() {
  return (
    <div className={styles.parking}>
      {[
        ['Pick the sprint goal', 'Should the API work wait for the redesign?'],
        ['Size the top stories', 'Who owns the flaky deploy job?'],
        ['Agree on owners', 'Revisit the on-call rota next week'],
      ].map(([goal, topic]) => (
        <div key={topic} className={styles.topic}>
          <span className={styles.topicGoal}>{goal}</span>
          {topic}
        </div>
      ))}
    </div>
  );
}

function SharePeople() {
  const people = [
    { initial: 'A', name: 'Ana Souza', role: 'Owner' },
    { initial: 'B', name: 'bruno@team.com', role: 'Contributor' },
    { initial: 'C', name: 'carla@team.com', role: 'Viewer' },
  ];
  return (
    <div className={styles.share}>
      <div className={styles.shareHead}>
        <strong>Share “Sprint planning”</strong>
        <Badge theme="warning">1 request</Badge>
      </div>
      <ul className={styles.people}>
        {people.map((person) => (
          <li key={person.name}>
            <span className={styles.avatar}>{person.initial}</span>
            <span className={styles.personName}>{person.name}</span>
            <span className={styles.role}>{person.role}</span>
          </li>
        ))}
      </ul>
      <div className={styles.shareLink}>
        <Icon name="flag" size={16} />
        Private: people with the link can ask for access
      </div>
    </div>
  );
}

function ReportCards() {
  return (
    <div className={styles.report}>
      <div className={styles.reportCards}>
        <TimeDisplay theme="success" header="Total duration" footer="saved 02m 00s">
          <span className={styles.mono}>28m 00s</span>
        </TimeDisplay>
        <TimeDisplay theme="success" header="End" footer="planned 10:30">
          <span className={styles.mono}>10:28</span>
        </TimeDisplay>
      </div>
      <div className={styles.streak}>
        <Badge theme="success">On budget</Badge>
        3rd event in a row under budget 🔥
      </div>
    </div>
  );
}

/**
 * What a signed-out visitor sees: what Tymebox is, a live mini board, and the
 * way in. Also shown on /login, where a guarded link (e.g. a shared event)
 * sends people, so they go back there after signing in.
 */
export function Landing() {
  const returnPath = useReturnPath('');
  const fromEvent = returnPath.startsWith('/events/');

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Logo size={30} />
          <ThemeToggle
            className={styles.themeToggle}
            labelClassName={styles.srOnly}
            iconClassName={styles.themeIcon}
          />
        </div>
      </header>

      <div>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              {fromEvent ? (
                <span className={styles.notice}>
                  <Icon name="flag" size={16} />
                  Sign in to open the event you were sent.
                </span>
              ) : (
                <span className={styles.kicker}>Timeboxing for meetings and events</span>
              )}
              <h1 className={styles.headline}>
                Every event, <span className={styles.accent}>inside its box.</span>
              </h1>
              <p className={styles.heroLead}>
                Plan milestones, run the clock and finish on time. Then see exactly how it
                went.
              </p>
              <div className={styles.ctaRow}>
                <SignInButton />
                <a className={styles.secondaryLink} href="#how-it-works">
                  See how it works
                  <Icon name="chevronDown" size={16} />
                </a>
              </div>
              <p className={styles.reassure}>
                Free · No setup · Private until you share it
              </p>
              <TestSignIn />
            </div>
            <div className={styles.heroDemo}>
              <LandingDemo />
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.section}>
          <div className={styles.inner}>
            <span className={styles.eyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>Three steps, one box.</h2>
            <ol className={styles.steps}>
              {STEPS.map((step, index) => (
                <li key={step.title} className={styles.step}>
                  <span className={styles.stepIcon}>
                    <Icon name={step.icon} size={22} />
                  </span>
                  <span className={styles.stepNumber}>0{index + 1}</span>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${styles.section} ${styles.features}`}>
          <div className={styles.inner}>
            <Feature
              eyebrow="Countdown"
              title="Know you’re late before you are."
              text="The clock compares your pace with the plan. It stays calm while you’re on track, turns amber when you fall a milestone behind and red once you’re over the box."
              visual={<CountdownStates />}
            />
            <Feature
              flip
              eyebrow="Parking lot"
              title="Park it, don’t lose it."
              text="Good tangents get a card on the side, tagged with the milestone they came up in. The meeting keeps moving and nothing is forgotten."
              visual={<ParkingLot />}
            />
            <Feature
              eyebrow="Sharing"
              title="Run it together."
              text="Share by email as viewer or contributor, or open it to anyone with the link. People without access can ask for it, and you approve from the event."
              visual={<SharePeople />}
            />
            <Feature
              flip
              eyebrow="Report"
              title="See how it really went."
              text="When you finish, the report shows the burndown, start, end and duration against plan, and your on-budget streak. Copy it, print it or save a PDF."
              visual={<ReportCards />}
            />
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.closingInner}>
            <TymeboxSymbol size={88} variant="full" />
            <div className={styles.closingText}>
              <h2 className={styles.sectionTitle}>
                Your next meeting has a box. Use it.
              </h2>
              <p className={styles.lead}>
                Sign in with Google and plan your first event in under a minute.
              </p>
            </div>
            <SignInButton />
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <TymeboxSymbol size={20} />
          <span>© {new Date().getFullYear()} Tymebox · Focus only on what matters</span>
        </div>
      </footer>
    </div>
  );
}
