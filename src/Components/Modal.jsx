/**
 * Shared modal shell for the two setup popups (Email Verify, Profile Setup).
 * Replaces the old showOverlay()/hideOverlay()/closeAllSetupPopups() trio —
 * one <div class="setup-overlay"> that closes whichever popup is open when
 * clicked, same as the original's single shared overlay element.
 *
 * `isOpen` controls mount/unmount; the popup markup itself (step bar,
 * steps, buttons) is passed in as children so this component only owns
 * the overlay + outer .setup-popup shell.
 */
export default function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="setup-popup" style={{ display: 'block' }}>
        {children}
      </div>
      <div className="setup-overlay" style={{ display: 'block' }} onClick={onClose}></div>
    </>
  );
}