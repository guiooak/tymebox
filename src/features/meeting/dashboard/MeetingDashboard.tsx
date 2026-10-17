import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Col,
  Container,
  Footer,
  InlineEdit,
  Loader,
  Row,
  Switch,
  TimeCountdown,
  useDialog,
  type Shortcut,
} from '../../../common/components';
import { nowISO } from '../../../common/services/datetime';
import { paths, useNavigation } from '../../../common/services/router';
import { BurndownChart, GoalFocusCard, GoalsDecisionCollector } from '../components';
import { alertThresholds, toBurndownItems } from '../domain/timeAlerts';
import { FIELD_LIMITS, hasSchedule, type Goal } from '../domain/types';
import { selectAlertsOn, useAlertsStore } from '../alerts';
import { useMeetingStore } from '../store';
import { DashboardSchedule } from './DashboardSchedule';
import { DashboardShortcuts } from './DashboardShortcuts';
import { DashboardSideTopics } from './DashboardSideTopics';
import { useCountdownSeconds } from './useCountdownSeconds';
import styles from './MeetingDashboard.module.css';

export function MeetingDashboard() {
  const navigation = useNavigation();
  const dialog = useDialog();
  const loading = useMeetingStore((state) => state.loading);
  const meeting = useMeetingStore((state) => state.currentMeeting);
  const automatic = useMeetingStore((state) => state.decisionsAutomaticBehavior);
  const startMeeting = useMeetingStore((state) => state.startMeeting);
  const cancelMeeting = useMeetingStore((state) => state.cancelMeeting);
  const finishMeeting = useMeetingStore((state) => state.finishMeeting);
  const updateMeeting = useMeetingStore((state) => state.updateMeeting);
  const updateGoal = useMeetingStore((state) => state.updateGoal);
  const addGoal = useMeetingStore((state) => state.addGoal);
  const removeGoal = useMeetingStore((state) => state.removeGoal);
  const duplicateGoal = useMeetingStore((state) => state.duplicateGoal);
  const reorderGoals = useMeetingStore((state) => state.reorderGoals);
  const addSideTopic = useMeetingStore((state) => state.addSideTopic);
  const updateSideTopic = useMeetingStore((state) => state.updateSideTopic);
  const removeSideTopic = useMeetingStore((state) => state.removeSideTopic);
  const [focusTopicKey, setFocusTopicKey] = useState<string | null>(null);
  const setAutomatic = useMeetingStore((state) => state.setAutomatic);

  const guarded = useRef(false);

  const active = !!meeting?.realStartTime;
  const scheduled = !!meeting && hasSchedule(meeting);

  const burndownItems = meeting ? toBurndownItems(meeting) : [];

  // Amber countdown once the current milestone runs over its share of the time
  // (the same threshold the "trending late" notification uses).
  const warnAfter = meeting ? alertThresholds(meeting).warnAfterTs : null;

  const [showSeconds, setShowSeconds] = useCountdownSeconds();

  // The alerts themselves are sent by ThresholdAlertsWatcher, on any screen.
  const alerts = useAlertsStore();
  const alertsOn = useAlertsStore(selectAlertsOn);

  // Short labels keep both countdown toggles on one row; the tooltip explains.
  const alertsLabel =
    alerts.permission === 'unsupported'
      ? 'Alerts unavailable'
      : alerts.permission === 'denied'
        ? 'Alerts blocked'
        : 'Time alerts';
  const alertsHint =
    alerts.permission === 'unsupported'
      ? 'Notifications are not available in this browser'
      : alerts.permission === 'denied'
        ? 'Notifications are blocked: allow them in your browser settings'
        : 'Notify me when the event trends late and when time runs out';

  useEffect(() => {
    if (loading || guarded.current) {
      return;
    }
    guarded.current = true;
    void (async () => {
      if (!meeting?.name) {
        await dialog.alert('Set up your event before opening the dashboard.');
        navigation.replace(paths.newMeeting);
      } else if (meeting.realEndTime) {
        await dialog.alert('This event is already completed.');
        navigation.replace(paths.report);
      }
    })();
  }, [loading, meeting, dialog, navigation]);

  if (loading || !meeting) {
    return (
      <div className={styles.loading}>
        <Loader />
      </div>
    );
  }

  const goals = meeting.goals;
  const currentGoal: Goal | null = goals.find((goal) => !goal.finishedAt) ?? null;
  const doneCount = goals.filter((goal) => goal.finishedAt).length;

  const onStart = async () => {
    if (goals.length === 0) {
      const anyway = await dialog.confirm({
        text: 'This event has no milestones yet. Start it anyway?',
        confirmButtonText: 'Start anyway',
        cancelButtonText: 'Let me add some',
      });
      if (!anyway) {
        return;
      }
    }
    const ready = await dialog.confirm({
      text: scheduled
        ? 'Are you ready to start?'
        : 'No schedule yet — we’ll box this to one hour starting now. You can change the end time from the board at any moment.',
      confirmButtonTheme: 'success',
      confirmButtonText: "Yes, let's go!",
      cancelButtonText: 'Not yet',
    });
    if (ready) {
      await startMeeting();
    }
  };

  const onCancel = async () => {
    const confirmed = await dialog.confirm({
      text: 'Are you sure you want to cancel it? It stays in your history as cancelled, and you can run it again from there.',
      confirmButtonTheme: 'danger',
      confirmButtonText: 'Yes, do it',
      cancelButtonText: 'Not anymore',
    });
    if (confirmed) {
      await cancelMeeting();
      navigation.replace(paths.home);
    }
  };

  const onFinish = async () => {
    await finishMeeting();
    navigation.go(paths.report);
  };

  const onAllCompleted = async () => {
    const confirmed = await dialog.confirm({
      text: 'All done! ✅ Do you want to finish this event?',
      confirmButtonTheme: 'success',
      confirmButtonText: 'Yes, finish it!',
      cancelButtonText: 'Not yet',
      closeOnOverlayClick: true,
    });
    if (confirmed) {
      await onFinish();
    }
  };

  const onConfirmRemoveGoal = (goal: Goal) =>
    dialog.confirm({
      text: `Remove “${goal.name}” and its notes?`,
      confirmButtonTheme: 'danger',
      confirmButtonText: 'Yes, do it',
      cancelButtonText: 'Not anymore',
    });

  const completeCurrentGoal = () => {
    if (!currentGoal) {
      return;
    }
    void updateGoal(currentGoal.id, { finishedAt: nowISO() });
    if (goals.every((goal) => goal.finishedAt || goal.id === currentGoal.id)) {
      void onAllCompleted();
    }
  };

  // Parks a topic under the milestone in progress and focuses its card, from
  // the button or the P shortcut alike.
  const parkTopic = () => {
    const key = addSideTopic(currentGoal?.name ?? '');
    if (key) {
      setFocusTopicKey(key);
    }
  };

  const shortcuts: Shortcut[] = [
    {
      key: 'd',
      description: 'Mark the current milestone as done',
      disabled: !active || !currentGoal,
      onTrigger: completeCurrentGoal,
    },
    {
      key: 'p',
      description: 'Park a side topic',
      onTrigger: parkTopic,
    },
    {
      key: 's',
      description: 'Start the event',
      disabled: active,
      onTrigger: () => void onStart(),
    },
    {
      key: 'f',
      description: 'Finish the event',
      disabled: !active,
      onTrigger: () => void onFinish(),
    },
  ];

  return (
    <Container fullWidth className={styles.dashboard}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <InlineEdit
            value={meeting.name}
            label="event name"
            placeholder="Name this event"
            maxLength={FIELD_LIMITS.meetingName}
            size="lg"
            onChange={(name) => name && void updateMeeting({ name })}
          />
          <Badge theme={active ? 'success' : 'secondary'}>
            {active ? 'Live' : 'Setting up'}
          </Badge>
        </div>
        <InlineEdit
          value={meeting.description}
          label="event description"
          placeholder="Add a description"
          maxLength={FIELD_LIMITS.meetingDescription}
          size="sm"
          multiline
          className={styles.description}
          onChange={(description) => void updateMeeting({ description })}
        />
        <DashboardSchedule
          expectedStartTime={meeting.expectedStartTime}
          expectedEndTime={meeting.expectedEndTime}
          onChange={(patch) => void updateMeeting(patch)}
        />
      </header>

      <Row>
        <Col grow={1}>
          <div className={styles.countdownBlock}>
            <TimeCountdown
              timeFrom={meeting.expectedStartTime || null}
              timeTarget={meeting.expectedEndTime || null}
              disabled={!active}
              warnAfter={warnAfter}
              unscheduledHint="set an end time to start the clock"
              prominent
              showSeconds={showSeconds}
            />
            <div className={styles.toggles}>
              <div className={styles.toggle} title={alertsHint}>
                <Switch
                  checked={alertsOn}
                  onChange={() => void alerts.toggle()}
                  label="Notify me when time runs out"
                />
                <span className={styles.alertsLabel}>{alertsLabel}</span>
              </div>
              <div className={styles.toggle}>
                <Switch
                  checked={showSeconds}
                  onChange={setShowSeconds}
                  label="Show seconds in the countdown"
                />
                <span className={styles.alertsLabel}>Show seconds</span>
              </div>
            </div>
          </div>
          <Box className={styles.block}>
            {scheduled ? (
              <BurndownChart
                startTime={meeting.expectedStartTime}
                endTime={meeting.expectedEndTime}
                items={burndownItems}
                showProjection={active}
              />
            ) : (
              <BlankSlate
                art="chart"
                compact
                title="No burndown yet"
                description="Set a start and end time and the chart starts tracking."
              />
            )}
          </Box>
        </Col>
        <Col grow={1}>
          {active && (
            <GoalFocusCard
              goal={currentGoal}
              position={doneCount + 1}
              total={goals.length}
              onComplete={completeCurrentGoal}
            />
          )}
          <GoalsDecisionCollector
            goals={goals}
            disabled={!active}
            editable
            automatic={automatic}
            onToggleAutomatic={(value) => void setAutomatic(value)}
            onChangeGoal={(goalId, patch) => void updateGoal(goalId, patch)}
            onAllCompleted={() => void onAllCompleted()}
            onAddGoal={(name) => void addGoal(name)}
            onRemoveGoal={(goalId) => void removeGoal(goalId)}
            onDuplicateGoal={(goalId) => void duplicateGoal(goalId)}
            onReorderGoals={(from, to) => void reorderGoals(from, to)}
            onConfirmRemove={onConfirmRemoveGoal}
          />
          <DashboardSideTopics
            items={meeting.sideTopics}
            onAdd={parkTopic}
            onUpdate={(key, value) => void updateSideTopic(key, value)}
            onRemove={(key) => void removeSideTopic(key)}
            focusKey={focusTopicKey}
          />
        </Col>
      </Row>

      <div className={styles.shortcutsRow}>
        <DashboardShortcuts shortcuts={shortcuts} />
      </div>

      <Footer justifyContent="space-between">
        {active ? (
          <Button theme="danger" outline onClick={() => void onCancel()}>
            Cancel event
          </Button>
        ) : (
          <Button theme="secondary" outline onClick={() => navigation.go(paths.home)}>
            Go back
          </Button>
        )}
        {active ? (
          <Button theme="success" onClick={() => void onFinish()}>
            Finish event
          </Button>
        ) : (
          <Button theme="success" onClick={() => void onStart()}>
            Start event
          </Button>
        )}
      </Footer>
    </Container>
  );
}
