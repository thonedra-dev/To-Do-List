import { useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Link, useNavigate } from 'react-router-dom';

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
export default function TopNav({ username, profilePic, prompts, onPromptClick }) {
  const [lightMode, setLightMode] = useState(() => localStorage.getItem('theme') === 'light');
  const { previewText, hasPendingDot } = useNotifications();
  const navigate = useNavigate();

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

      <button
        type="button"
        className="topnav-newproject"
        onClick={() => navigate('/project/new')}
      >
        <span className="topnav-newproject-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </span>
        <span className="topnav-newproject-label">New Project</span>
      </button>

      <div className="nav-actions">
        <button className="nav-icon-btn" onClick={toggleTheme} title="Toggle Theme">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        <button className="nav-icon-btn" title="Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className={`noti-dot-nav${hasPendingDot ? ' active' : ''}`} id="noti-dot"></span>
          <div className="noti-tooltip" id="noti-preview-tip">{previewText}</div>
        </button>

        <div className="profile-avatar-wrap">
          <Link to="/profile" className="profile-avatar" id="profile-avatar-link">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" />
            ) : (
              <span className="initial">{initial}</span>
            )}
            <span className="status-dot"></span>
          </Link>
          {prompts && prompts.length > 0 && (
            <div id="speech-bubble" className="speech-bubble">
              <div id="prompt-buttons-container">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    className="prompt-action-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPromptClick?.(prompt);
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}