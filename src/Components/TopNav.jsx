import { useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Link } from 'react-router-dom';
import NavControls from './NavControls';

/**
 * Top nav bar. Theme is read/written to localStorage exactly like the
 * original inline <script> + toggleTheme(), moved into React state
 * so the `.light-mode` class stays in sync declaratively.
 *
 * `onPromptClick(promptText)` replaces handlePromptClick() — Dashboard.jsx
 * will wire it to open the Email Verify / Profile Setup popups.
 *
 * The old search bar is replaced with a "+ New Project" bar that routes
 * to the standalone /project/new page (ProjectCreator.jsx).
 */
export default function TopNav({ username, profilePic, prompts, onPromptClick, onPromptDismiss }) {
  const [lightMode, setLightMode] = useState(() => localStorage.getItem('theme') === 'light');
  const [controlsOpen, setControlsOpen] = useState(false);
  const {
  previewText, hasPendingDot, notifications,
  loading: notiLoading, error: notiError,
  unreadCount, markAsRead, markAllRead,
} = useNotifications();


  useEffect(() => {
    document.body.classList.toggle('light-mode', lightMode);
  }, [lightMode]);

  function toggleTheme() {
    setLightMode((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'light' : 'dark');
      return next;
    });
  }

  const initial = username ? username[0].toUpperCase() : '';

  // Safely format avatar URL to prevent duplicate /static/ prefixes
  const avatarSrc = profilePic
    ? profilePic.startsWith('http') || profilePic.startsWith('/')
      ? profilePic
      : `/static/${profilePic}`
    : null;

  return (
    <nav className="topnav">
      <Link to="/" className="brand">
        <div className="brand-mark">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
        <div className="brand-name">Task<span>Flow</span></div>
      </Link>

      <div className="profile-avatar-wrap">
        <NavControls
          onToggleTheme={toggleTheme}
          avatarSrc={avatarSrc}
          initial={initial}
          notifications={notifications}
          notiLoading={notiLoading}
          notiError={notiError}
          unreadCount={unreadCount}
          hasPendingDot={hasPendingDot}
          previewText={previewText}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllRead}
          onOpenChange={setControlsOpen}
        />
        {controlsOpen && prompts && prompts.length > 0 && (
          <div id="speech-bubble" className="speech-bubble">
            <div id="prompt-buttons-container">
              {prompts.map((prompt) => (
                <div key={prompt} className="prompt-action-row">
                  <button
                    className="prompt-action-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPromptClick?.(prompt);
                    }}
                  >
                    {prompt}
                  </button>
                  <button
                    type="button"
                    className="prompt-dismiss-btn"
                    title="Dismiss"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPromptDismiss?.(prompt);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
