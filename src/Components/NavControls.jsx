import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationsPanel from './NotificationsPanel';
import { apiPostEmpty } from '../api';

/**
 * Unified nav-actions cluster. Collapsed = single gear/settings icon,
 * pinned to the right edge (via `.nav-controls { flex-direction:
 * row-reverse }` in CSS — the gear stays first in DOM/JSX order but
 * renders visually rightmost). Click it -> six tabs slide out to its
 * LEFT (theme, notifications, calendar (static), + New Project, profile
 * avatar, logout). Click the gear again (it rotates 90deg while open)
 * to collapse them back in.
 *
 * IMPORTANT: <NotificationsPanel> is rendered as a direct child of the
 * outer `.nav-controls` div, OUTSIDE `.nav-controls-tabs`. That tabs
 * wrapper has `overflow: hidden` (needed for the slide animation), and
 * an absolutely-positioned dropdown living inside it gets clipped/
 * mispositioned even though `position: absolute` normally escapes
 * normal flow — it does NOT escape an ancestor's overflow clipping.
 * Keeping the panel a sibling of the tabs wrapper, anchored off
 * `.nav-controls` instead, avoids that entirely.
 *
 * Logout: POST /api/logout via apiPostEmpty, then navigate to /Auth
 * regardless of result.
 */
export default function NavControls({
  onToggleTheme,
  avatarSrc,
  initial,
  notifications = [],
  notiLoading,
  notiError,
  unreadCount = 0,
  hasPendingDot,
  previewText,
  onMarkRead,
  onMarkAllRead,
  onOpenChange,  
}) {
  const [open, setOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const navigate = useNavigate();

 function toggleOpen() {
  const next = !open;
  setOpen(next);
  onOpenChange?.(next);
  if (!next) setNotiOpen(false); // collapsing closes any open sub-panel too
}
  async function handleLogout(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiPostEmpty('/logout');
    } catch {
      // Navigate to /Auth regardless — a failed logout call shouldn't
      // strand the user on a page they were trying to leave.
    } finally {
      navigate('/Auth');
    }
  }

  return (
    <div className={`nav-controls${open ? ' nav-controls-open' : ''}`}>
      <button
        type="button"
        className="nav-controls-gear"
        onClick={toggleOpen}
        title={open ? 'Close' : 'Settings'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-controls-gear-icon">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <div className="nav-controls-tabs">
        <button
          type="button"
          className="nav-icon-btn nav-controls-tab"
          onClick={() => navigate('/project/new')}
          title="New Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-controls-tab"
          title="Calendar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-controls-tab"
          onClick={onToggleTheme}
          title="Toggle Theme"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-controls-tab noti-bell-btn"
          title="Notifications"
          onClick={(e) => {
            e.stopPropagation();
            setNotiOpen((v) => !v);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className={`noti-dot-nav${hasPendingDot ? ' active' : ''}`}></span>
          {!notiOpen && <div className="noti-tooltip">{previewText}</div>}
        </button>

        <button
          type="button"
          className="nav-icon-btn nav-controls-tab"
          onClick={handleLogout}
          title="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>

        <Link to="/profile" className="profile-avatar nav-controls-tab">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Profile" />
          ) : (
            <span className="initial">{initial}</span>
          )}
          <span className="status-dot"></span>
        </Link>
      </div>

      <NotificationsPanel
        isOpen={notiOpen}
        notifications={notifications}
        loading={notiLoading}
        error={notiError}
        unreadCount={unreadCount}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onClose={() => setNotiOpen(false)}
      />
    </div>
  );
}