import { useMemo, useState } from 'react';
import {
  Badge,
  BlankSlate,
  Box,
  Button,
  Container,
  Heading,
  Page,
} from '../../../common/components';
import { formatLong } from '../../../common/services/datetime';
import { paths, useNavigation } from '../../../common/services/router';
import { summarizeMeeting } from '../domain/metrics';
import type { Meeting, MeetingStatus } from '../domain/types';
import { useMeetingStore } from '../store';
import styles from './MeetingsHistory.module.css';

type Filter = 'all' | MeetingStatus;
type SortKey = 'newest' | 'oldest' | 'name';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'active', label: 'Live' },
  { key: 'finished', label: 'Finished' },
  { key: 'cancelled', label: 'Cancelled' },
];

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name (A–Z)' },
];

/** Whichever date best describes when the event happened. */
function whenLabel(meeting: Meeting): string {
  const stamp =
    meeting.realEndTime ||
    meeting.realStartTime ||
    meeting.expectedStartTime ||
    meeting.createdAt;
  return stamp ? formatLong(stamp) : 'Not scheduled';
}

export function MeetingsHistory() {
  const navigation = useNavigation();
  const meetings = useMeetingStore((state) => state.meetings);
  const reopen = useMeetingStore((state) => state.reopen);
  const reopenInDashboard = useMeetingStore((state) => state.reopenInDashboard);
  const clone = useMeetingStore((state) => state.clone);

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
    navigation.go(paths.report);
  };

  const onOpenDashboard = async (id: string) => {
    await reopenInDashboard(id);
    navigation.go(paths.liveMeeting);
  };

  const onClone = async (id: string) => {
    const newId = await clone(id);
    if (newId) {
      navigation.go(paths.liveMeeting);
    }
  };

  return (
    <Container className={styles.history}>
      <Page>
        <header className={styles.head}>
          <Heading size="md" level={1}>
            My events
          </Heading>
          <Button onClick={() => navigation.go(paths.newMeeting)}>+ New event</Button>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.filters} role="tablist" aria-label="Filter by status">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={filter === item.key}
                className={filter === item.key ? styles.filterActive : styles.filter}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
                <span className={styles.count}>{counts[item.key] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className={styles.controls}>
            <input
              className={styles.search}
              type="search"
              value={query}
              placeholder="Search events…"
              aria-label="Search events"
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className={styles.sort}
              value={sort}
              aria-label="Sort events"
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {SORTS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <BlankSlate
            art={meetings.length === 0 ? 'events' : 'search'}
            title={
              meetings.length === 0 ? 'No events yet' : 'Nothing matches those filters'
            }
            description={
              meetings.length === 0
                ? 'Create one and it will show up here.'
                : 'Try a different status, or clear the search.'
            }
          />
        ) : (
          <div className={styles.list}>
            {visible.map((meeting) => {
              const summary = summarizeMeeting(meeting);
              return (
                <Box key={meeting.id} className={styles.item}>
                  <div className={styles.info}>
                    <div className={styles.titleRow}>
                      <strong>{meeting.name || 'Untitled event'}</strong>
                      <Badge theme={summary.status.theme}>{summary.status.label}</Badge>
                      {summary.outcome && (
                        <Badge theme={summary.outcome.theme}>
                          {summary.outcome.label}
                        </Badge>
                      )}
                    </div>
                    <div className={styles.meta}>
                      {whenLabel(meeting)} · {meeting.goals.length} milestones
                      {summary.durationLabel ? ` · ${summary.durationLabel}` : ''}
                    </div>
                  </div>
                  <div className={styles.actions}>
                    <Button
                      theme="secondary"
                      outline
                      size="sm"
                      onClick={() => void onOpenDashboard(meeting.id)}
                    >
                      Open dashboard
                    </Button>
                    <Button
                      theme="secondary"
                      outline
                      size="sm"
                      disabled={!meeting.realEndTime}
                      title={
                        meeting.realEndTime
                          ? undefined
                          : 'Only finished events have a report'
                      }
                      onClick={() => void onOpenReport(meeting.id)}
                    >
                      View report
                    </Button>
                    <Button size="sm" onClick={() => void onClone(meeting.id)}>
                      Clone
                    </Button>
                  </div>
                </Box>
              );
            })}
          </div>
        )}
      </Page>
    </Container>
  );
}
