import { useState } from 'react';
import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Col,
  Container,
  Footer,
  InlineEdit,
  Row,
  Switch,
  TimeCountdown,
  useDialog,
  type Shortcut,
} from '../../../common/components';
import { nowISO } from '../../../common/services/datetime';
import { useT } from '../../../common/services/i18n';
import {
  eventReportPath,
  Navigate,
  paths,
  useNavigation,
} from '../../../common/services/router';
import { BurndownChart, GoalFocusCard, GoalsDecisionCollector } from '../components';
import { alertThresholds, toBurndownItems } from '../domain/timeAlerts';
import { FIELD_LIMITS, hasSchedule, type Goal, type Meeting } from '../domain/types';
import { selectAlertsOn, useAlertsStore } from '../alerts';
import { can, type Role } from '../domain/access';
import { EventGate, ShareButton } from '../share';
import { useMeetingStore } from '../store';
import { DashboardSchedule } from './DashboardSchedule';
import { DashboardShortcuts } from './DashboardShortcuts';
import { DashboardSideTopics } from './DashboardSideTopics';
import { useCountdownSeconds } from './useCountdownSeconds';
import styles from './MeetingDashboard.module.css';

/** The live board of the event in the URL, for anyone allowed to open it. */
export function MeetingDashboard() {
  return (
    <EventGate>
      {(event, role) => <DashboardBoard meeting={event} role={role} />}
    </EventGate>
  );
}

function DashboardBoard({ meeting, role }: { meeting: Meeting; role: Role }) {
  const navigation = useNavigation();
  const dialog = useDialog();
  const tt = useT();
  const t = tt.board;
  // Owners and contributors run the event; viewers follow along read-only.
  const canRun = can(role, 'run');
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

  const active = !!meeting.realStartTime;
  const scheduled = hasSchedule(meeting);

  const burndownItems = toBurndownItems(meeting);

  // Amber countdown once the current milestone runs over its share of the time
  // (the same threshold the "trending late" notification uses).
  const warnAfter = alertThresholds(meeting).warnAfterTs;

  const [showSeconds, setShowSeconds] = useCountdownSeconds();

  // The alerts themselves are sent by ThresholdAlertsWatcher, on any screen.
  const alerts = useAlertsStore();
  const alertsOn = useAlertsStore(selectAlertsOn);

  // Short labels keep both countdown toggles on one row; the tooltip explains.
  const alertsLabel =
    alerts.permission === 'unsupported'
      ? t.alertsUnavailable
      : alerts.permission === 'denied'
        ? t.alertsBlocked
        : t.timeAlerts;
  const alertsHint =
    alerts.permission === 'unsupported'
      ? t.alertsUnavailableHint
      : alerts.permission === 'denied'
        ? t.alertsBlockedHint
        : t.alertsHint;

  // A finished event lives on its report.
  if (meeting.realEndTime) {
    return <Navigate to={eventReportPath(meeting.id)} replace />;
  }

  const goals = meeting.goals;
  const currentGoal: Goal | null = goals.find((goal) => !goal.finishedAt) ?? null;
  const doneCount = goals.filter((goal) => goal.finishedAt).length;

  const onStart = async () => {
    if (goals.length === 0) {
      const anyway = await dialog.confirm({
        text: t.noMilestones,
        confirmButtonText: t.startAnyway,
        cancelButtonText: t.letMeAdd,
      });
      if (!anyway) {
        return;
      }
    }
    const ready = await dialog.confirm({
      text: scheduled ? t.ready : t.noSchedule,
      confirmButtonTheme: 'success',
      confirmButtonText: t.letsGo,
      cancelButtonText: t.notYet,
    });
    if (ready) {
      await startMeeting();
    }
  };

  const onCancel = async () => {
    const confirmed = await dialog.confirm({
      text: t.cancelConfirm,
      confirmButtonTheme: 'danger',
      confirmButtonText: tt.common.yesDoIt,
      cancelButtonText: tt.common.notAnymore,
    });
    if (confirmed) {
      await cancelMeeting();
      navigation.replace(paths.home);
    }
  };

  const onFinish = async () => {
    await finishMeeting();
    navigation.go(eventReportPath(meeting.id));
  };

  const onAllCompleted = async () => {
    const confirmed = await dialog.confirm({
      text: t.allDone,
      confirmButtonTheme: 'success',
      confirmButtonText: t.finishIt,
      cancelButtonText: t.notYet,
      closeOnOverlayClick: true,
    });
    if (confirmed) {
      await onFinish();
    }
  };

  const onConfirmRemoveGoal = (goal: Goal) =>
    dialog.confirm({
      text: t.removeGoal(goal.name),
      confirmButtonTheme: 'danger',
      confirmButtonText: tt.common.yesDoIt,
      cancelButtonText: tt.common.notAnymore,
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
      description: t.shortcuts.done,
      disabled: !canRun || !active || !currentGoal,
      onTrigger: completeCurrentGoal,
    },
    {
      key: 'p',
      description: t.shortcuts.park,
      disabled: !canRun,
      onTrigger: parkTopic,
    },
    {
      key: 's',
      description: t.shortcuts.start,
      disabled: !canRun || active,
      onTrigger: () => void onStart(),
    },
    {
      key: 'f',
      description: t.shortcuts.finish,
      disabled: !canRun || !active,
      onTrigger: () => void onFinish(),
    },
  ];

  return (
    <Container fullWidth className={styles.dashboard}>
      <header className={styles.head}>
        <div className={styles.headTop}>
          <InlineEdit
            value={meeting.name}
            label={t.eventName}
            placeholder={t.namePlaceholder}
            maxLength={FIELD_LIMITS.meetingName}
            size="lg"
            readOnly={!canRun}
            onChange={(name) => name && void updateMeeting({ name })}
          />
          <Badge theme={active ? 'success' : 'secondary'}>
            {active ? tt.status.active : tt.status.draft}
          </Badge>
          {!canRun && <Badge>{t.viewOnly}</Badge>}
          <ShareButton />
        </div>
        <InlineEdit
          value={meeting.description}
          label={t.eventDescription}
          placeholder={t.descriptionPlaceholder}
          maxLength={FIELD_LIMITS.meetingDescription}
          size="sm"
          multiline
          readOnly={!canRun}
          className={styles.description}
          onChange={(description) => void updateMeeting({ description })}
        />
        <DashboardSchedule
          expectedStartTime={meeting.expectedStartTime}
          expectedEndTime={meeting.expectedEndTime}
          onChange={(patch) => void updateMeeting(patch)}
          readOnly={!canRun}
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
              unscheduledHint={t.unscheduled}
              prominent
              showSeconds={showSeconds}
            />
            <div className={styles.toggles}>
              <div className={styles.toggle} title={alertsHint}>
                <Switch
                  checked={alertsOn}
                  onChange={() => void alerts.toggle()}
                  label={t.alertsSwitch}
                />
                <span className={styles.alertsLabel}>{alertsLabel}</span>
              </div>
              <div className={styles.toggle}>
                <Switch
                  checked={showSeconds}
                  onChange={setShowSeconds}
                  label={t.showSecondsSwitch}
                />
                <span className={styles.alertsLabel}>{t.showSeconds}</span>
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
                title={t.noBurndown}
                description={t.noBurndownText}
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
              disabled={!canRun}
            />
          )}
          <GoalsDecisionCollector
            goals={goals}
            disabled={!canRun || !active}
            editable={canRun}
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
            readOnly={!canRun}
          />
        </Col>
      </Row>

      <div className={styles.shortcutsRow}>
        <DashboardShortcuts shortcuts={shortcuts} />
      </div>

      <Footer justifyContent="space-between">
        {active && canRun ? (
          <Button theme="danger" outline onClick={() => void onCancel()}>
            {t.cancelEvent}
          </Button>
        ) : (
          <Button theme="secondary" outline onClick={() => navigation.go(paths.home)}>
            {t.goBack}
          </Button>
        )}
        {canRun &&
          (active ? (
            <Button theme="success" onClick={() => void onFinish()}>
              {t.finishEvent}
            </Button>
          ) : (
            <Button theme="success" onClick={() => void onStart()}>
              {t.startEvent}
            </Button>
          ))}
      </Footer>
    </Container>
  );
}
