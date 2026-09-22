import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPostEmpty } from '../api';

/**
 * Fetches GET /notifications and exposes:
 *   - the bell's preview tooltip text + pending dot (unread_count > 0)
 *   - the full notification list + unread count for <NotificationsPanel>
 *   - markAsRead(id) / markAllRead() actions, both optimistic then
 *     reconciled against the server response
 *
 * Matches the actual /api/notifications route (backend.py), which
 * returns rows shaped like:
 *   { id, type, title, message, related_id, is_read, created_at }
 * plus a top-level `unread_count`.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiGet('/notifications');
      if (!data.success) {
        setError(true);
        return;
      }
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiPostEmpty(`/mark_notification_read/${id}`);
    } catch {
      load();
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await apiPostEmpty('/mark_all_notifications_read');
    } catch {
      load();
    }
  }, [load]);

  const hasPendingDot = unreadCount > 0;

  const previewText = loading
    ? 'Loading…'
    : error
    ? 'Could not load notifications.'
    : notifications.length === 0
    ? 'No notifications yet.'
    : (() => {
        const newest = notifications[0];
        const snippet =
          newest.title && newest.title.length > 55
            ? newest.title.slice(0, 52) + '…'
            : newest.title || '';
        return `🔔 ${notifications.length} notification${notifications.length > 1 ? 's' : ''} — ${snippet}`;
      })();

  return {
    notifications,
    unreadCount,
    loading,
    error,
    previewText,
    hasPendingDot,
    markAsRead,
    markAllRead,
    refresh: load,
  };
}