import { useState, useEffect, useRef } from "react";
import { apiPostForm } from "../../api";

export function LoadingModal({ message }) {
  return (
    <div className="otp-modal-overlay show">
      <div className="otp-modal loading-modal">
        <div className="loading-spinner"></div>
        <p className="loading-text">{message}</p>
      </div>
    </div>
  );
}

export function SuccessModal({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="otp-modal-overlay show">
      <div className="otp-modal success-modal">
        <div className="success-icon">✓</div>
        <h2 className="success-title">Success!</h2>
        <p className="success-message">{message}</p>
      </div>
    </div>
  );
}

export function ErrorModal({ message, onClose }) {
  return (
    <div className="otp-modal-overlay show">
      <div className="otp-modal error-modal">
        <div className="error-icon">✕</div>
        <h2 className="error-title">Error</h2>
        <p className="error-message">{message}</p>
        <button className="error-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

// 6-digit OTP entry, resolves with the code (or null if cancelled) via onResolve
export function OtpDigitsModal({ title, message, onVerify, onResend, onCancel }) {
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [error, setError] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index, value) {
    const v = value.slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    setError("");
    if (v && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").slice(0, 6).split("");
    const next = [...digits];
    pasted.forEach((c, i) => (next[i] = c));
    setDigits(next);
    if (pasted.length < 6) inputRefs.current[pasted.length]?.focus();
  }

  function handleVerify() {
    const code = digits.join("");
    if (code.length === 6) {
      onVerify(code);
    } else {
      setError("Please enter all 6 digits");
    }
  }

  return (
    <div className="otp-modal-overlay show">
      <div className="otp-modal">
        <div className="otp-icon">🔒</div>
        <h2 className="otp-title">{title}</h2>
        <p className="otp-message">{message}</p>
        <div className="otp-input-container">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              maxLength={1}
              className="otp-digit"
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
            />
          ))}
        </div>
        <div className="otp-error" style={{ display: error ? "block" : "none" }}>{error}</div>
        <button className="otp-verify-btn" onClick={handleVerify}>VERIFY</button>
        <div className="otp-footer">
          <span className="otp-resend">
            Didn't receive it?{" "}
            <span className="otp-resend-link" onClick={onResend} style={{ cursor: "pointer" }}>
              Resend Code
            </span>
          </span>
          <button className="otp-cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const GOOGLE_CLIENT_ID = "856845548813-rrkv0s4j0rei56dt9j3orcptkr0d3c8d.apps.googleusercontent.com";

export function GoogleSignInModal({ currentEmail, onVerified, onFailed, onCancel }) {
  const btnRef = useRef(null);

  useEffect(() => {
    if (!window.google) return; // assumes gsi/client script already loaded elsewhere (e.g. Login page)

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        const payload = JSON.parse(atob(response.credential.split(".")[1]));
        const googleEmail = payload.email;

        try {
          const formData = new FormData();
          formData.append("email", googleEmail);

          const result = await apiPostForm("/verify_old_email_google", formData);

          if (result.success) {
            onVerified();
          } else {
            onFailed(result.message || "Email verification failed");
          }
        } catch (err) {
          onFailed("Verification error. Please try again.");
        }
      },
    });

    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "filled_blue",
        size: "large",
        width: 280,
        text: "signin_with",
      });
    }
  }, [onVerified, onFailed]);

  return (
    <div className="otp-modal-overlay show">
      <div className="otp-modal google-signin-modal">
        <div className="google-icon">
          <svg viewBox="0 0 48 48" width="48" height="48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
        </div>
        <h2 className="google-title">Verify Your Identity</h2>
        <p className="google-message">
          To change your email address, please sign in with Google to verify you own:
          <br />
          <strong>{currentEmail}</strong>
        </p>
        <div id="googleSignInButton" className="google-signin-btn" ref={btnRef}></div>
        <div className="google-footer">
          <button className="google-cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}