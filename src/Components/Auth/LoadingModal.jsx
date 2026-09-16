export default function LoadingModal({ visible }) {
  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="glass-modal">
        <div className="spinner"></div>
        <h2 style={{ marginTop: 20 }}>Sending OTP...</h2>
        <p>Please wait while we send a code to your Gmail.</p>
      </div>
    </div>
  );
}