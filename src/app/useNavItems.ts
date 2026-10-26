import type { IconName } from '../common/components';
import { useT } from '../common/services/i18n';
import { eventPath, paths } from '../common/services/router';
import { useMeetingStore } from '../features/meeting/store';

export type NavItem = {
  to: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  short: string;
  icon: IconName;
  /** Match the path exactly (Home and History would otherwise match deeper routes). */
  end?: boolean;
};

/**
 * The app's destinations, shared by the sidebar and the phone tab bar so the
 * two can't drift: Home, New event, History, and the live event while one runs.
 */
export function useNavItems(): NavItem[] {
  const t = useT().shell;
  const current = useMeetingStore((state) => state.currentMeeting);
  const live = current?.realStartTime && !current.realEndTime ? current : null;

  const items: NavItem[] = [
    { to: paths.home, label: t.home, short: t.home, icon: 'home', end: true },
    { to: paths.newMeeting, label: t.newEvent, short: t.tabNew, icon: 'plus' },
    {
      to: paths.meetings,
      label: t.history,
      short: t.history,
      icon: 'history',
      end: true,
    },
  ];
  if (live) {
    items.push({
      to: eventPath(live.id),
      label: t.liveEvent,
      short: t.tabLive,
      icon: 'timer',
    });
  }
  return items;
}
