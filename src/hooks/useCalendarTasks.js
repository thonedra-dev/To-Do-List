import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet } from '../api';

/**
 * Fetches every task with a due_date for the logged-in user, groups them
 * by day (YYYY-MM-DD -> [tasks]), and owns the "which day / which task is
 * selected" state that the Calendar page renders off of.
 *
 * Kept separate from the steps fetch (useTaskSteps) on purpose: the
 * calendar grid only ever needs the lightweight task list, and steps are
 * fetched lazily, one task at a time, only once a task is actually opened
 * in the details panel.
 */
export default function useCalendarTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD'
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/calendar_tasks');
      if (res.success) {
        setTasks(res.tasks);
      } else {
        setError(res.message || 'Failed to load tasks');
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Group tasks by their due_date so the grid can do O(1) lookups per cell.
  const tasksByDate = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    }
    return map;
  }, [tasks]);

  const selectedDayTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  function selectDate(dateStr) {
    setSelectedDate(dateStr);
    const dayTasks = tasksByDate[dateStr] || [];
    // Auto-select the first task on that day so the panel isn't empty
    // the moment you click a day that only has one task on it.
    setSelectedTaskId(dayTasks.length > 0 ? dayTasks[0].id : null);
  }

  function selectTask(taskId) {
    setSelectedTaskId(taskId);
  }

  function clearSelection() {
    setSelectedDate(null);
    setSelectedTaskId(null);
  }

  // Lets the details panel patch a task's steps count / completed state
  // locally after a mutation, without a full refetch.
  function patchTask(taskId, patch) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }

  return {
    tasks,
    tasksByDate,
    loading,
    error,
    selectedDate,
    selectedDayTasks,
    selectedTaskId,
    selectedTask,
    selectDate,
    selectTask,
    clearSelection,
    refetch: loadTasks,
    patchTask,
  };
}