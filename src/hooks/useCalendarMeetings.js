import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiGet } from '../api';

/**
 * Fetches every meeting for the logged-in user, groups them by their
 * start date (YYYY-MM-DD -> [meetings]), and owns "which meeting is
 * selected" state — sibling to useCalendarTasks, kept separate because
 * meetings and tasks are different shapes (start_time/end_time + agenda
 * vs due_date + steps) and are rendered by different detail views.
 */
export default function useCalendarMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/calendar_meetings');
      if (res.success) {
        setMeetings(res.meetings);
      } else {
        setError(res.message || 'Failed to load meetings');
      }
    } catch (err) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const meetingsByDate = useMemo(() => {
    const map = {};
    for (const m of meetings) {
      if (!m.date_key) continue;
      if (!map[m.date_key]) map[m.date_key] = [];
      map[m.date_key].push(m);
    }
    return map;
  }, [meetings]);

  const selectedMeeting = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  function selectMeeting(meetingId) {
    setSelectedMeetingId(meetingId);
  }

  function clearMeetingSelection() {
    setSelectedMeetingId(null);
  }

  function patchMeeting(meetingId, patch) {
    setMeetings((prev) => prev.map((m) => (m.id === meetingId ? { ...m, ...patch } : m)));
  }

  return {
    meetings,
    meetingsByDate,
    loading,
    error,
    selectedMeetingId,
    selectedMeeting,
    selectMeeting,
    clearMeetingSelection,
    refetch: loadMeetings,
    patchMeeting,
  };
}