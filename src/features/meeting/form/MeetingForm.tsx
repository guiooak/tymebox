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
import { paths, useNavigation } from '../../../common/services/router';
import { useMeetingStore } from '../store';
import styles from './MeetingForm.module.css';

export function MeetingForm() {
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
      navigation.replace(paths.liveMeeting);
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

  const nameError = submitted && !name.trim() ? 'Event name is required' : null;

  const onSubmit = async () => {
    setSubmitted(true);
    if (!name.trim()) {
      return;
    }
    await saveDraft({ name: name.trim(), description });
    navigation.go(paths.liveMeeting);
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
            New event
          </Heading>
          <Paragraph className={styles.lede}>
            Name it and go — milestones, timings and everything else are added on the
            board.
          </Paragraph>

          <FormField label="Event name">
            <FormInput
              name="name"
              value={name}
              onChange={setName}
              placeholder="Weekly planning"
            />
            {nameError && <span className={styles.error}>{nameError}</span>}
          </FormField>

          <FormField label="Description">
            <FormTextarea
              name="description"
              value={description}
              onChange={setDescription}
              placeholder="Optional context for this event"
            />
          </FormField>

          <Footer justifyContent="flex-end">
            <div className={styles.actions}>
              <FormResetButton>Clean form</FormResetButton>
              <FormSubmitButton>Create event</FormSubmitButton>
            </div>
          </Footer>
        </Form>
      </Page>
    </Container>
  );
}
