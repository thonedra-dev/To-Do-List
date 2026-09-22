/**
 * Notification panel — compact dropdown from the bell icon in TopNav.
 * Click the bell again, or the × in the header, to close it. `isOpen`
 * is owned by the parent; `onClose` asks the parent to collapse it.
 *
 * Expects `notifications` already shaped by the caller (usually via
 * useNotifications() hitting GET /api/notifications):
 *   { id, type, title, message, related_id, is_read, created_at }
 *
 * `onMarkRead(id)`      -> POST /api/mark_notification_read/<id>
 * `onMarkAllRead()`     -> POST /api/mark_all_notifications_read
 */

const TYPE_ICONS = {
  task_due_soon: '⏰',
  project_invitation: '📁',
  invitation_accepted: '✅',
  invitation_rejected: '❌',
  default: '🔔',
};

function timeAgo(dateStr) {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPanel({
  isOpen,
  notifications = [],
  loading,
  error,
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="noti-panel" onClick={(e) => e.stopPropagation()}>
      <div className="noti-panel-head">
        <h4>Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}</h4>
        <div className="noti-panel-head-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="noti-panel-markall"
              onClick={onMarkAllRead}
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            className="noti-panel-close-btn"
            title="Close"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="noti-panel-body">
        {loading && <div className="noti-panel-empty">Loading…</div>}
        {!loading && error && <div className="noti-panel-empty noti-panel-error">Couldn't load notifications.</div>}
        {!loading && !error && notifications.length === 0 && (
          <div className="noti-panel-empty">You're all caught up 🎉</div>
        )}
        {!loading && !error && notifications.map((n) => (
          <div
            key={n.id}
            className={`noti-item${n.is_read ? '' : ' noti-item-unread'}`}
            onClick={() => !n.is_read && onMarkRead?.(n.id)}
          >
            <div className="noti-item-icon">{TYPE_ICONS[n.type] || TYPE_ICONS.default}</div>
            <div className="noti-item-body">
              <div className="noti-item-title">{n.title}</div>
              {n.message && <div className="noti-item-message">{n.message}</div>}
              <div className="noti-item-time">{timeAgo(n.created_at)}</div>
            </div>
            {!n.is_read && <span className="noti-item-dot" />}
          </div>
        ))}
      </div>
    </div>
  );
}