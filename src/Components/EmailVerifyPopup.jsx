import { useState } from 'react';
import Modal from './Modal';
import { apiPostForm } from '../api';

const STEP = { EMAIL: 'email', OTP: 'otp', DONE: 'done' };

/**
 * Verify Email popup — enter email -> receive OTP -> verify + save.
 * Ported from the emailVerifyPopup markup + sendEmailOtp()/verifyEmailOtp()
 * in homepage.js. `onVerified()` is called once the email is saved, so the
 * parent can dismiss the "Verify Email ⚡" prompt bubble (replaces
 * removePromptButton('Verify Email')).
 */
export default function EmailVerifyPopup({ isOpen, onClose, onVerified }) {
  const [step, setStep] = useState(STEP.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  function handleClose() {
    setStep(STEP.EMAIL);
    setEmail('');
    setOtp('');
    setError('');
    onClose();
  }

  async function sendEmailOtp() {
    const emailVal = email.trim();
    if (!emailVal || !emailVal.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('email', emailVal);

      const data = await apiPostForm('/send_verification_otp', formData);
      if (data.success) {
        setStep(STEP.OTP);
      } else {
        setError(data.message || 'Failed to send code. Try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  async function verifyEmailOtp() {
    const otpVal = otp.trim();
    if (!otpVal || otpVal.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError('');

    try {
      const verifyFd = new FormData();
      verifyFd.append('email', email);
      verifyFd.append('otp', otpVal);

      const verifyData = await apiPostForm('/verify_otp', verifyFd);
      if (!verifyData.success) {
        setError(verifyData.message || 'Invalid code. Try again.');
        return;
      }

      const saveFd = new FormData();
      saveFd.append('email', email);

      const saveData = await apiPostForm('/homepage_save_email', saveFd);
      if (saveData.success) {
        setStep(STEP.DONE);
        onVerified?.();
      } else {
        setError(saveData.message || 'Could not save email. Try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {step === STEP.EMAIL && (
        <div id="emailStep1">
          <div className="popup-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <h3>Verify Your Email</h3>
          </div>
          <p className="setup-description">Enter your email address and we'll send a 6-digit verification code.</p>
          <input
            type="email"
            id="email-input"
            className="setup-input"
            placeholder="Enter your email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <div id="email-step1-error" className="setup-error" style={{ display: 'block' }}>{error}</div>}
          <div className="popup-buttons">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn-primary" onClick={sendEmailOtp} disabled={sending}>
              {sending ? 'Sending...' : 'Send Code'}
            </button>
          </div>
        </div>
      )}

      {step === STEP.OTP && (
        <div id="emailStep2">
          <div className="popup-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <h3>Enter OTP Code</h3>
          </div>
          <p className="setup-description">
            A 6-digit code was sent to <strong id="otp-target-email">{email}</strong>. Check your inbox.
          </p>
          <input
            type="text"
            id="otp-input"
            className="setup-input"
            placeholder="Enter 6-digit code..."
            maxLength={6}
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          {error && <div id="email-step2-error" className="setup-error" style={{ display: 'block' }}>{error}</div>}
          <div className="popup-buttons">
            <button type="button" className="btn-secondary" onClick={() => { setStep(STEP.EMAIL); setError(''); }}>Back</button>
            <button type="button" className="btn-primary" onClick={verifyEmailOtp}>Verify & Save</button>
          </div>
        </div>
      )}

      {step === STEP.DONE && (
        <div id="emailStepDone">
          <div className="setup-success-icon">✅</div>
          <h3 className="setup-success-title">Email Verified!</h3>
          <p className="setup-description">Your email has been linked to your account successfully.</p>
          <div className="popup-buttons">
            <button type="button" className="btn-primary" onClick={handleClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}