export default function OtpModal({
  visible,
  otp,
  onOtpChange,
  onVerify,
  onResend,
  onClose,
}) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="glass-modal">
        <h2>Enter OTP</h2>
        <p>We sent a 6-digit code to your email.</p>
        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          className="otp-input"
          value={otp}
          onChange={(e) => onOtpChange(e.target.value)}
        />

        <button
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={onVerify}
        >
          Verify
        </button>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          <span style={{ color: "var(--text-secondary)" }}>Didn't receive it? </span>
          <button type="button" className="btn-link" onClick={onResend}>
            Resend Code
          </button>
        </p>

        <button
          type="button"
          className="btn-link"
          style={{ color: "var(--text-secondary)", marginTop: 8, fontWeight: 500 }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}