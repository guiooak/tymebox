import { Heading, Icon, type IconName } from '../../../common/components';
import { eventPath, useNavigation } from '../../../common/services/router';
import { useT } from '../../../common/services/i18n';
import { useEventActions } from '../components';
import type { Meeting } from '../domain/types';
import { useMeetingStore } from '../store';
import { MEETING_TEMPLATES, type MeetingTemplateId } from './templates';
import styles from './Home.module.css';

const TEMPLATE_ICONS: Record<MeetingTemplateId, IconName> = {
  weeklyPlanning: 'calendar',
  retro: 'cycle',
  oneOnOne: 'users',
};

/** Creates an event with these goals and opens its board. */
export function useCreateFromTemplate() {
  const navigation = useNavigation();
  const createFromTemplate = useMeetingStore((state) => state.createFromTemplate);
  return async (name: string, goals: string[]) => {
    const newId = await createFromTemplate(name, goals);
    if (newId) {
      navigation.go(eventPath(newId));
    }
  };
}

/** "Repeat <last event>": a copy of your most recently finished event. */
function RepeatLast({ meeting }: { meeting: Meeting }) {
  const t = useT().home;
  const { clone } = useEventActions(meeting);
  return (
    <button
      type="button"
      className={styles.template}
      title={t.repeatHint(meeting.goals.length)}
      onClick={() => void clone()}
    >
      <span className={styles.templateIcon}>
        <Icon name="repeat" size={16} />
      </span>
      <strong className={styles.templateName}>{t.repeat(meeting.name)}</strong>
      <span className={styles.templateMeta}>
        {t.milestoneCount(meeting.goals.length)}
      </span>
      <Icon name="arrowRight" size={16} className={styles.templateArrow} />
    </button>
  );
}

/** "Start something": repeat the last event, or start from a template. */
export function TemplateShortcuts({ lastFinished }: { lastFinished?: Meeting }) {
  const t = useT().home;
  const onTemplate = useCreateFromTemplate();

  return (
    <section className={styles.templatesSection}>
      <Heading size="sm" level={2}>
        {t.startSomething}
      </Heading>
      <div className={styles.templates}>
        {lastFinished && <RepeatLast meeting={lastFinished} />}
        {MEETING_TEMPLATES.map((id) => {
          const template = t.templates[id];
          return (
            <button
              key={id}
              type="button"
              className={styles.template}
              onClick={() => void onTemplate(template.label, template.goals)}
            >
              <span className={styles.templateIcon}>
                <Icon name={TEMPLATE_ICONS[id]} size={16} />
              </span>
              <strong className={styles.templateName}>{template.label}</strong>
              <span className={styles.templateMeta}>{template.hint}</span>
              <Icon name="arrowRight" size={16} className={styles.templateArrow} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
