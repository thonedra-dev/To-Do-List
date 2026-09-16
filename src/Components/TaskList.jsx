import { useMemo, useState } from 'react';
import TaskToolbar from './TaskToolbar';
import TaskCard from './TaskCard';
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
 * "Your Tasks" panel — toolbar + list. Owns search/sort/filter UI state;
 * the actual filtering/sorting logic mirrors getFilteredSortedTasks()
 * from the original, just recomputed via useMemo instead of on demand.
 */
export default function TaskList({ tasks, loading, error, onComplete }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filter, setFilter] = useState('all');

  const counts = useMemo(
    () => ({
      all: tasks.length,
      today: tasks.filter((t) => taskDueBucket(t) === 'today').length,
      upcoming: tasks.filter((t) => taskDueBucket(t) === 'upcoming').length,
      completed: tasks.filter((t) => t.completed).length,
    }),
    [tasks]
  );

  const filteredSorted = useMemo(() => {
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

    // ✅ AFTER
if (sortBy === 'newest') {
  list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
} else if (sortBy === 'oldest') {
  list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
}
    else if (sortBy === 'priority')
      list.sort((a, b) => (PRIORITY_RANK[a.importance] ?? 3) - (PRIORITY_RANK[b.importance] ?? 3));
    else if (sortBy === 'due')
      list.sort((a, b) => ((a.due_date || '9999') > (b.due_date || '9999') ? 1 : -1));

    return list;
  }, [tasks, filter, search, sortBy]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Your Tasks</h2>
        <span className="panel-hint">Click to complete</span>
      </div>

      <TaskToolbar
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      <div className="task-list" id="task-list">
        {loading ? (
          <EmptyState title="Loading tasks..." subtitle="Please wait while we fetch your tasks." />
        ) : error ? (
          <EmptyState title="Couldn't load tasks" subtitle={error} />
        ) : filteredSorted.length === 0 ? (
          <EmptyState title="Nothing here" subtitle="Try a different filter or add a new task above." />
        ) : (
          filteredSorted.map((t) => <TaskCard key={t.id} task={t} onComplete={onComplete} />)
        )}
      </div>
    </section>
  );
}