import type { ReactNode } from 'react';
import { Badge, Icon, TimeDisplay, type IconName } from '../../common/components';
import { useT } from '../../common/services/i18n';
import { Link, paths, useReturnPath } from '../../common/services/router';
import { LanguageSelect } from '../../app/LanguageSelect';
import { ThemeToggle } from '../../app/ThemeToggle';
import { Logo, TymeboxSymbol } from '../brand';
import { LandingDemo } from './LandingDemo';
import { SignInButton, TestSignIn } from './SignInPanel';
import styles from './Landing.module.css';

const STEP_ICONS: IconName[] = ['pencil', 'play', 'chart'];

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
  const t = useT().landing.countdown;
  return (
    <div className={styles.states}>
      <TimeDisplay theme="secondary" header={t.onTrack} footer={t.onTrackNote}>
        <span className={styles.mono}>14:20</span>
      </TimeDisplay>
      <TimeDisplay theme="warning" header={t.late} footer={t.lateNote}>
        <span className={styles.mono}>06:45</span>
      </TimeDisplay>
      <TimeDisplay theme="danger" header={t.overdue} footer={t.overdueNote}>
        <span className={styles.mono}>+03:10</span>
      </TimeDisplay>
    </div>
  );
}

function ParkingLot() {
  const t = useT().landing.parking;
  return (
    <div className={styles.parking}>
      {t.topics.map(([goal, topic]) => (
        <div key={topic} className={styles.topic}>
          <span className={styles.topicGoal}>{goal}</span>
          {topic}
        </div>
      ))}
    </div>
  );
}

function SharePeople() {
  const t = useT().landing.sharing;
  const people = [
    { initial: 'A', name: 'Ana Souza', role: t.owner },
    { initial: 'B', name: 'bruno@team.com', role: t.contributor },
    { initial: 'C', name: 'carla@team.com', role: t.viewer },
  ];
  return (
    <div className={styles.share}>
      <div className={styles.shareHead}>
        <strong>{t.shareTitle}</strong>
        <Badge theme="warning">{t.requests}</Badge>
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
        {t.privateNote}
      </div>
    </div>
  );
}

function ReportCards() {
  const t = useT().landing.report;
  return (
    <div className={styles.report}>
      <div className={styles.reportCards}>
        <TimeDisplay theme="success" header={t.totalDuration} footer={t.saved}>
          <span className={styles.mono}>28m 00s</span>
        </TimeDisplay>
        <TimeDisplay theme="success" header={t.end} footer={t.planned}>
          <span className={styles.mono}>10:28</span>
        </TimeDisplay>
      </div>
      <div className={styles.streak}>
        <Badge theme="success">{t.onBudget}</Badge>
        {t.streak}
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
  const tt = useT();
  const t = tt.landing;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <Link to={paths.home} className={styles.brand} aria-label={tt.shell.homeAria}>
            <Logo size={30} />
          </Link>
          <div className={styles.topBarControls}>
            <LanguageSelect />
            <ThemeToggle
              className={styles.themeToggle}
              labelClassName={styles.srOnly}
              iconClassName={styles.themeIcon}
            />
          </div>
        </div>
      </header>

      <div>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              {fromEvent ? (
                <span className={styles.notice}>
                  <Icon name="flag" size={16} />
                  {t.fromEvent}
                </span>
              ) : (
                <span className={styles.kicker}>{t.kicker}</span>
              )}
              <h1 className={styles.headline}>
                {t.headline} <span className={styles.accent}>{t.headlineAccent}</span>
              </h1>
              <p className={styles.heroLead}>{t.lead}</p>
              <div className={styles.ctaRow}>
                <SignInButton />
                <a className={styles.secondaryLink} href="#how-it-works">
                  {t.howItWorksLink}
                  <Icon name="chevronDown" size={16} />
                </a>
              </div>
              <p className={styles.reassure}>{t.reassure}</p>
              <TestSignIn />
            </div>
            <div className={styles.heroDemo}>
              <LandingDemo />
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.section}>
          <div className={styles.inner}>
            <span className={styles.eyebrow}>{t.howItWorks}</span>
            <h2 className={styles.sectionTitle}>{t.stepsTitle}</h2>
            <ol className={styles.steps}>
              {t.steps.map((step, index) => (
                <li key={index} className={styles.step}>
                  <span className={styles.stepIcon}>
                    <Icon name={STEP_ICONS[index]} size={22} />
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
              eyebrow={t.countdown.eyebrow}
              title={t.countdown.title}
              text={t.countdown.text}
              visual={<CountdownStates />}
            />
            <Feature
              flip
              eyebrow={t.parking.eyebrow}
              title={t.parking.title}
              text={t.parking.text}
              visual={<ParkingLot />}
            />
            <Feature
              eyebrow={t.sharing.eyebrow}
              title={t.sharing.title}
              text={t.sharing.text}
              visual={<SharePeople />}
            />
            <Feature
              flip
              eyebrow={t.report.eyebrow}
              title={t.report.title}
              text={t.report.text}
              visual={<ReportCards />}
            />
          </div>
        </section>

        <section className={styles.closing}>
          <div className={styles.closingInner}>
            <TymeboxSymbol size={88} variant="full" />
            <div className={styles.closingText}>
              <h2 className={styles.sectionTitle}>{t.closingTitle}</h2>
              <p className={styles.lead}>{t.closingText}</p>
            </div>
            <SignInButton />
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <TymeboxSymbol size={20} />
          <span>{t.footer(new Date().getFullYear())}</span>
        </div>
      </footer>
    </div>
  );
}
