import { useEffect, useState } from 'react';
import { apiGet } from '../api';

/**
 * Fetches /notifications and derives the bell's preview tooltip text +
 * whether the "has pending invitation" dot should be active.
 * Mirrors loadNotiPreview() from homepage.js line-for-line in logic.
 */
export function useNotifications() {
  const [previewText, setPreviewText] = useState('Loading…');
  const [hasPendingDot, setHasPendingDot] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadNotiPreview() {
      try {
        const data = await apiGet('/notifications');

        if (cancelled) return;

        if (!data.success || !data.notifications || data.notifications.length === 0) {
          setPreviewText('No notifications yet.');
          return;
        }

        const notifications = data.notifications;
        const hasPending = notifications.some((n) => n.acceptance_status === 0);
        setHasPendingDot(hasPending);

        const newest = notifications[0].message || '';
        const lines = newest.split('\n').map((l) => l.trim()).filter(Boolean);
        const projectLine = lines.find((l) => l.includes('📌')) || lines[1] || lines[0] || '';
        const preview = projectLine.replace('📌', '').replace('Project :', '').trim();
        const snippet = preview.length > 55 ? preview.slice(0, 52) + '…' : preview;

        setPreviewText(
          `🔔 ${notifications.length} notification${notifications.length > 1 ? 's' : ''} — ${snippet}`
        );
      } catch {
        if (!cancelled) setPreviewText('Could not load notifications.');
      }
    }

    loadNotiPreview();
    return () => {
      cancelled = true;
    };
  }, []);

  return { previewText, hasPendingDot };
}