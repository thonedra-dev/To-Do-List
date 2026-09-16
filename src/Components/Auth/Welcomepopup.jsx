export default function WelcomePopup({ visible, data, onClose }) {
  if (!visible) return null;

  const { username, email, profilePicUrl } = data || {};

  return (
    <div className="modal-backdrop">
      <div className="glass-modal welcome-modal">
        <div className="success-check success-fade">
          <svg viewBox="0 0 52 52">
            <circle className="success-check-circle" cx="26" cy="26" r="24" fill="none" />
            <path className="success-check-mark" fill="none" d="M14 27l7 7 16-16" />
          </svg>
        </div>

        <div className="success-brand success-fade delay-1">
          <div className="auth-brand-mark small">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11.5l2 2 4.5-4.5" />
              <rect x="3" y="3" width="18" height="18" rx="5" />
            </svg>
          </div>
          <span className="auth-brand-name">
            Task<span>Flow</span>
          </span>
        </div>

        <div className="success-fade delay-2">
          <p className="success-title">Welcome aboard!</p>
          <p className="success-subtitle">Your account is ready to go</p>
        </div>

        {profilePicUrl && (
          <img
            className="success-avatar success-fade delay-3"
            src={profilePicUrl}
            alt="Profile"
          />
        )}

        <div className="success-meta success-fade delay-3">
          <p className="success-name">{username}</p>
          {email && <p className="success-email">{email}</p>}
        </div>

        <button
          type="button"
          className="btn btn-primary success-fade delay-4"
          onClick={onClose}
        >
          Get Started
        </button>
      </div>
    </div>
  );
}