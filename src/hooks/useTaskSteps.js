import { useState, useEffect } from 'react';
import { apiGet } from '../api';

/**
 * Fetches the steps for a single task id via /api/setup_step_data/<fid>.
 * Re-fetches whenever taskId changes; clears itself out when taskId is
 * null (nothing selected) so the panel doesn't show stale steps.
 */
export default function useTaskSteps(taskId) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (taskId == null) {
      setSteps([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGet(`/setup_step_data/${taskId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.success) {
          setSteps(res.steps || []);
        } else {
          setError(res.message || 'Failed to load steps');
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load steps');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  return { steps, loading, error };
}