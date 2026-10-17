import { useMemo, useState } from 'react';
import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Container,
  Heading,
  Loader,
  Menu,
  type MenuItem,
  Page,
  Select,
  type SelectOption,
  ItemLink,
  itemLinkAbove,
  itemLinkContainer,
} from '../../../common/components';
import { formatLong } from '../../../common/services/datetime';
import {
  paths,
  useNavigation,
  eventPath,
  eventReportPath,
} from '../../../common/services/router';
import { useDeleteEvent } from '../components';
import { useT } from '../../../common/services/i18n';
import { summarizeMeeting } from '../domain/metrics';
import type { Meeting, MeetingStatus } from '../domain/types';
import { useMeetingStore } from '../store';
import styles from './MeetingsHistory.module.css';

type Filter = 'all' | MeetingStatus;
type SortKey = 'newest' | 'oldest' | 'name';

const FILTERS: Filter[] = ['all', 'draft', 'active', 'finished', 'cancelled'];

const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'name'];

/** Whichever date best describes when the event happened. */
function whenLabel(meeting: Meeting, notScheduled: string): string {
  const stamp =
    meeting.realEndTime ||
    meeting.realStartTime ||
    meeting.expectedStartTime ||
    meeting.createdAt;
  return stamp ? formatLong(stamp) : notScheduled;
}

export function MeetingsHistory() {
  const navigation = useNavigation();
  const tt = useT();
  const t = tt.history;
  const sortOptions: SelectOption<SortKey>[] = SORT_KEYS.map((key) => ({
    value: key,
    label: t.sort[key],
  }));
  const meetings = useMeetingStore((state) => state.meetings);
  const loading = useMeetingStore((state) => state.loading);
  const reopen = useMeetingStore((state) => state.reopen);
  const reopenInDashboard = useMeetingStore((state) => state.reopenInDashboard);
  const clone = useMeetingStore((state) => state.clone);
  const onDelete = useDeleteEvent();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: meetings.length,
      draft: 0,
      active: 0,
      cancelled: 0,
      finished: 0,
    };
    for (const meeting of meetings) {
      result[meeting.status] = (result[meeting.status] ?? 0) + 1;
    }
    return result;
  }, [meetings]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return meetings
      .filter((meeting) => filter === 'all' || meeting.status === filter)
      .filter(
        (meeting) =>
          !needle ||
          meeting.name.toLowerCase().includes(needle) ||
          meeting.description.toLowerCase().includes(needle),
      )
      .sort((a, b) => {
        if (sort === 'name') {
          return a.name.localeCompare(b.name);
        }
        const diff = summarizeMeeting(a).sortTs - summarizeMeeting(b).sortTs;
        return sort === 'oldest' ? diff : -diff;
      });
  }, [meetings, filter, query, sort]);

  const onOpenReport = async (id: string) => {
    await reopen(id);
    navigation.go(eventReportPath(id));
  };

  const onOpenDashboard = async (id: string) => {
    await reopenInDashboard(id);
    navigation.go(eventPath(id));
  };

  // A click on the item: finished events open their report, the rest their
  // board, without reopening anything.
  const onOpen = async (meeting: Meeting) => {
    await reopen(meeting.id);
    navigation.go(
      meeting.realEndTime ? eventReportPath(meeting.id) : eventPath(meeting.id),
    );
  };

  const onClone = async (id: string) => {
    const newId = await clone(id);
    if (newId) {
      navigation.go(eventPath(newId));
    }
  };

  // The board action does what reopenInDashboard does to each kind of event.
  const actionsFor = (meeting: Meeting): MenuItem[] => {
    const board = meeting.realEndTime
      ? t.reopen
      : meeting.status === 'cancelled'
        ? t.runAgain
        : tt.home.openBoard;
    return [
      ...(meeting.realEndTime
        ? [{ label: tt.home.viewReport, onSelect: () => void onOpenReport(meeting.id) }]
        : []),
      { label: board, onSelect: () => void onOpenDashboard(meeting.id) },
      { label: tt.home.clone, onSelect: () => void onClone(meeting.id) },
      {
        label: tt.home.deleteEvent,
        danger: true,
        onSelect: () => void onDelete(meeting),
      },
    ];
  };

  return (
    <Container className={styles.history}>
      <Page>
        <header className={styles.head}>
          <Heading size="md" level={1}>
            {t.title}
          </Heading>
          <Button onClick={() => navigation.go(paths.newMeeting)}>
            {tt.home.newEvent}
          </Button>
        </header>

        {loading ? (
          <Loader className={styles.loading} label={tt.home.loadingEvents} />
        ) : (
          <>
            <div className={styles.toolbar}>
              <div className={styles.filters} role="tablist" aria-label={t.filterAria}>
                {FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    className={filter === key ? styles.filterActive : styles.filter}
                    onClick={() => setFilter(key)}
                  >
                    {t.filters[key]}
                    <span className={styles.count}>{counts[key] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className={styles.controls}>
                <input
                  className={styles.search}
                  type="search"
                  value={query}
                  placeholder={t.search}
                  aria-label={t.searchAria}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Select<SortKey>
                  value={sort}
                  options={sortOptions}
                  onChange={setSort}
                  label={t.sortAria}
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <BlankSlate
                art={meetings.length === 0 ? 'events' : 'search'}
                title={meetings.length === 0 ? t.noEvents : t.noMatch}
                description={meetings.length === 0 ? t.noEventsText : t.noMatchText}
              />
            ) : (
              <div className={styles.list}>
                {visible.map((meeting) => {
                  const summary = summarizeMeeting(meeting);
                  return (
                    <Box
                      key={meeting.id}
                      className={`${styles.item} ${itemLinkContainer}`}
                    >
                      <div className={styles.info}>
                        <div className={styles.titleRow}>
                          <ItemLink onClick={() => void onOpen(meeting)}>
                            <strong>{meeting.name || tt.common.untitledEvent}</strong>
                          </ItemLink>
                          <Badge theme={summary.status.theme}>
                            {summary.status.label}
                          </Badge>
                          {summary.outcome && (
                            <Badge theme={summary.outcome.theme}>
                              {summary.outcome.label}
                            </Badge>
                          )}
                        </div>
                        <div className={styles.meta}>
                          {t.meta(
                            whenLabel(meeting, t.notScheduled),
                            meeting.goals.length,
                          )}
                          {summary.durationLabel ? ` · ${summary.durationLabel}` : ''}
                        </div>
                      </div>
                      <div className={`${styles.actions} ${itemLinkAbove}`}>
                        <Menu
                          label={tt.common.actionsFor(
                            meeting.name || tt.common.thisEvent,
                          )}
                          items={actionsFor(meeting)}
                        />
                      </div>
                    </Box>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Page>
    </Container>
  );
}
