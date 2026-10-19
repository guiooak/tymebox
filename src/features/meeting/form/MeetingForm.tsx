import { useEffect, useRef, useState } from 'react';
import {
  Container,
  Footer,
  Form,
  FormField,
  FormInput,
  FormResetButton,
  FormSubmitButton,
  FormTextarea,
  Heading,
  Page,
  Paragraph,
} from '../../../common/components';
import { useT } from '../../../common/services/i18n';
import { eventPath, useNavigation } from '../../../common/services/router';
import { FIELD_LIMITS } from '../domain/types';
import { useMeetingStore } from '../store';
import styles from './MeetingForm.module.css';

export function MeetingForm() {
  const t = useT().form;
  const navigation = useNavigation();
  const currentMeeting = useMeetingStore((state) => state.currentMeeting);
  const saveDraft = useMeetingStore((state) => state.saveDraft);
  const discardCurrent = useMeetingStore((state) => state.discardCurrent);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const prefilled = useRef(false);

  // A finished meeting is over: clear the pointer so the form starts fresh.
  // A still-running meeting takes over the live view instead.
  useEffect(() => {
    if (currentMeeting?.realEndTime) {
      void discardCurrent();
    } else if (currentMeeting?.realStartTime) {
      navigation.replace(eventPath(currentMeeting.id));
    }
  }, [currentMeeting, navigation, discardCurrent]);

  // Rehydrate the form from a saved draft once it loads.
  useEffect(() => {
    // Only an unstarted draft should rehydrate the form (not a finished meeting
    // that's about to be cleared).
    if (prefilled.current || currentMeeting?.status !== 'draft') {
      return;
    }
    prefilled.current = true;
    setName(currentMeeting.name);
    setDescription(currentMeeting.description);
  }, [currentMeeting]);

  const nameError = submitted && !name.trim() ? t.nameRequired : null;

  const onSubmit = async () => {
    setSubmitted(true);
    if (!name.trim()) {
      return;
    }
    const id = await saveDraft({ name: name.trim(), description });
    if (id) {
      navigation.go(eventPath(id));
    }
  };

  const onReset = async () => {
    await discardCurrent();
    setName('');
    setDescription('');
    setSubmitted(false);
  };

  return (
    <Container>
      <Page>
        <Form onSubmit={() => void onSubmit()} onReset={() => void onReset()}>
          <Heading size="md" level={1}>
            {t.title}
          </Heading>
          <Paragraph className={styles.lede}>{t.lede}</Paragraph>

          <FormField label={t.name}>
            <FormInput
              name="name"
              value={name}
              onChange={setName}
              maxLength={FIELD_LIMITS.meetingName}
            />
            {nameError && <span className={styles.error}>{nameError}</span>}
          </FormField>

          <FormField label={t.description}>
            <FormTextarea
              name="description"
              value={description}
              onChange={setDescription}
              maxLength={FIELD_LIMITS.meetingDescription}
            />
          </FormField>

          <Footer justifyContent="flex-end">
            <div className={styles.actions}>
              <FormResetButton>{t.clean}</FormResetButton>
              <FormSubmitButton>{t.create}</FormSubmitButton>
            </div>
          </Footer>
        </Form>
      </Page>
    </Container>
  );
}
