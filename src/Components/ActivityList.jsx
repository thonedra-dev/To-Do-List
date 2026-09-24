import { useMemo, useState } from 'react';
import ListToolbar from './ListToolbar';
import TaskCard from './TaskCard';
import MeetingCard, { meetingBucket } from './MeetingCard';
import { taskDueBucket } from '../hooks/useDashboardData';

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

function EmptyState({ title, subtitle }) {
  return (
    <div className="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
      <p className="empty-title">{title}</p>
      <p>{subtitle}</p>
    </div>
  );
}

/**
 * "Your Tasks" / "Your Meetings" panel — one shell + toolbar, toggled by
 * the reload icon next to the heading (same interaction pattern as
 * InputForm's task/meeting toggle, so the two panels read as one system).
 *
 * Row rendering is the only mode-specific branch: TaskCard for tasks,
 * MeetingCard for meetings. Filtering/sorting/search concepts (all/today/
 * upcoming/completed) apply to both, just reading from different buckets.
 */
export default function ActivityList({
  tasks,
  loading,
  error,
  onComplete,
  meetings = [],
  meetingsLoading = false,
  meetingsError = null,
  onMeetingStatusChange,
}) {
  const [mode, setMode] = useState('task'); // 'task' | 'meeting'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filter, setFilter] = useState('all');

  function toggleMode() {
    setMode((prev) => (prev === 'task' ? 'meeting' : 'task'));
    setSearch('');
    setFilter('all');
  }

  const activeLoading = mode === 'task' ? loading : meetingsLoading;
  const activeError = mode === 'task' ? error : meetingsError;

  const counts = useMemo(() => {
    if (mode === 'task') {
      return {
        all: tasks.length,
        today: tasks.filter((t) => taskDueBucket(t) === 'today').length,
        upcoming: tasks.filter((t) => taskDueBucket(t) === 'upcoming').length,
        completed: tasks.filter((t) => t.completed).length,
      };
    }
    return {
      all: meetings.length,
      today: meetings.filter((m) => meetingBucket(m) === 'today').length,
      upcoming: meetings.filter((m) => meetingBucket(m) === 'upcoming').length,
      completed: meetings.filter((m) => m.status === 'completed').length,
    };
  }, [mode, tasks, meetings]);

  const filteredSortedTasks = useMemo(() => {
    let list = tasks.slice();

    if (filter === 'today') list = list.filter((t) => taskDueBucket(t) === 'today');
    else if (filter === 'upcoming') list = list.filter((t) => taskDueBucket(t) === 'upcoming');
    else if (filter === 'completed') list = list.filter((t) => t.completed);

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (t) =>
          (t.task || '').toLowerCase().includes(query) ||
          (t.description || '').toLowerCase().includes(query)
      );
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_RANK[a.importance] ?? 3) - (PRIORITY_RANK[b.importance] ?? 3));
    } else if (sortBy === 'due') {
      list.sort((a, b) => ((a.due_date || '9999') > (b.due_date || '9999') ? 1 : -1));
    }

    return list;
  }, [tasks, filter, search, sortBy]);

  const filteredSortedMeetings = useMemo(() => {
    let list = meetings.slice();

    if (filter === 'today') list = list.filter((m) => meetingBucket(m) === 'today');
    else if (filter === 'upcoming') list = list.filter((m) => meetingBucket(m) === 'upcoming');
    else if (filter === 'completed') list = list.filter((m) => m.status === 'completed');

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (m) =>
          (m.title || '').toLowerCase().includes(query) ||
          (m.description || '').toLowerCase().includes(query)
      );
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } else if (sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_RANK[a.importance] ?? 3) - (PRIORITY_RANK[b.importance] ?? 3));
    } else if (sortBy === 'due') {
      list.sort((a, b) => ((a.start_time || '9999') > (b.start_time || '9999') ? 1 : -1));
    }

    return list;
  }, [meetings, filter, search, sortBy]);

  const filteredSorted = mode === 'task' ? filteredSortedTasks : filteredSortedMeetings;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          {mode === 'task' ? 'Your Tasks' : 'Your Meetings'}
          <button
            type="button"
            className="nav-icon-btn mode-toggle-btn"
            title={mode === 'task' ? 'Switch to Meetings' : 'Switch to Tasks'}
            onClick={toggleMode}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </h2>
        <span className="panel-hint">
          {mode === 'task' ? 'Click to complete' : 'Click to mark done'}
        </span>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      <div className="task-list">
        {activeLoading ? (
          <EmptyState
            title={mode === 'task' ? 'Loading tasks...' : 'Loading meetings...'}
            subtitle="Please wait while we fetch your data."
          />
        ) : activeError ? (
          <EmptyState title={`Couldn't load ${mode === 'task' ? 'tasks' : 'meetings'}`} subtitle={activeError} />
        ) : filteredSorted.length === 0 ? (
          <EmptyState
            title="Nothing here"
            subtitle={`Try a different filter or add a new ${mode === 'task' ? 'task' : 'meeting'} above.`}
          />
        ) : mode === 'task' ? (
          filteredSortedTasks.map((t) => <TaskCard key={t.id} task={t} onComplete={onComplete} />)
        ) : (
          filteredSortedMeetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} onStatusChange={onMeetingStatusChange} />
          ))
        )}
      </div>
    </section>
  );
}