import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPostEmpty } from '../api';

/** 'YYYY-MM-DD' for today, in local time — matches the old todayISO(). */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Classifies a task's due date relative to today.
 * Mirrors taskDueBucket() from homepage.js exactly (including the
 * "overdue only if not completed" rule).
 */
export function taskDueBucket(task) {
  if (!task.due_date) return 'none';
  const due = task.due_date.slice(0, 10);
  const today = todayISO();
  if (due < today && !task.completed) return 'overdue';
  if (due === today) return 'today';
  if (due > today) return 'upcoming';
  return 'none';
}

/**
 * Loads /dashboard_data and exposes tasks + derived stats.
 * Also owns "complete task" since completing invalidates the whole list
 * (old code just re-fetched the dashboard after POST /complete/<id>).
 */
export function useDashboardData() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/dashboard_data');
      if (!data.success) throw new Error(data.message || 'Failed to load tasks');
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message || 'Please refresh the page.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const completeTask = useCallback(
    async (taskId) => {
      try {
        await apiPostEmpty(`/complete/${taskId}`);
        // Old code re-fetched the whole dashboard after completing rather
        // than patching local state — keep that behavior for parity.
        await loadDashboard();
        return true;
      } catch {
        window.alert('Could not mark task as complete. Please try again.');
        return false;
      }
    },
    [loadDashboard]
  );

  const addTaskLocal = useCallback((task) => {
    // add_task returns the created task; append it so the list updates
    // instantly without a full refetch (same as the old inline behavior).
    setTasks((prev) => [task, ...prev]);
  }, []);

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => !t.completed);
    const completed = tasks.filter((t) => t.completed);
    const dueToday = pending.filter((t) => taskDueBucket(t) === 'today');
    const overdue = pending.filter((t) => taskDueBucket(t) === 'overdue');

    return {
      pendingCount: pending.length,
      dueTodayCount: dueToday.length,
      completedCount: completed.length,
      overdueCount: overdue.length,
      countAll: tasks.length,
      countToday: tasks.filter((t) => taskDueBucket(t) === 'today').length,
      countUpcoming: tasks.filter((t) => taskDueBucket(t) === 'upcoming').length,
      countCompleted: completed.length,
    };
  }, [tasks]);

  return { tasks, loading, error, stats, loadDashboard, completeTask, addTaskLocal };
}