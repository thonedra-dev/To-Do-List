import { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPostJson } from '../api'; // adjust to whatever helpers api.js exports

export function useMeetingsData() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/meetings_data')
      .then((data) => {
        if (data.success) setMeetings(data.meetings);
        else setError(data.message || 'Failed to load meetings');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  const updateMeetingStatus = useCallback(async (id, status) => {
    const data = await apiPostJson(`/meetings/${id}/status`, { status });
    if (data.success) {
      setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    }
  }, []);

  return { meetings, loading, error, updateMeetingStatus };
}