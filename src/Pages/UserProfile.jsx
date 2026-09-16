import { useState, useEffect, useRef } from "react";
import EditableField from "../Components/Profile/EditableField";
import {
  LoadingModal,
  SuccessModal,
  ErrorModal,
  OtpDigitsModal,
  GoogleSignInModal,
} from "../Components/Modals/ProfileFlowModals";
import { apiGet, apiPostJson, apiPostForm } from "../api";
import "../user_profile.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Flask serves the "static/" folder itself, and profile_pic is stored as a
// path relative to that folder (e.g. "uploads/profile_pics/x.jpg"). This is
// ONLY for building <img> src URLs — it's separate from the /api calls
// below, which go through api.js and its relative BASE_URL so they get
// proxied correctly in dev (Vite on :5173 -> Flask on :5000).
const STATIC_ORIGIN = "http://localhost:5000";
function staticUrl(relativePath) {
  if (!relativePath) return null;
  return `${STATIC_ORIGIN}/static/${relativePath}`;
}

export default function UserProfile() {
  const [user, setUser] = useState(null); // raw user row from GET /api/profile
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ username: "", email: "", gender: "", position: "" });
  const [originalFields, setOriginalFields] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null); // local data-URL preview while editing
  const [modal, setModal] = useState(null); // { type, ...props }
  const resolverRef = useRef(null);

  // --- Load current user from GET /api/profile ---
  useEffect(() => {
    apiGet("/profile")
      .then((data) => {
        if (!data.success) return;
        setUser(data.user);
        setFields({
          username: data.user.username || "",
          email: data.user.email || "",
          gender: data.user.gender || "",
          position: data.user.position || "",
        });
      })
      .catch((err) => console.error("Failed to load profile:", err));
  }, []);

  // --- Theme (persisted from login page too) ---
  useEffect(() => {
    if (localStorage.getItem("theme") === "light") {
      document.body.classList.add("light-mode");
    }
  }, []);

  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
  }

  function enableEditMode() {
    setOriginalFields(fields);
    setEditing(true);
  }

  function cancelEdit() {
    setFields(originalFields);
    setSelectedFile(null);
    setPreviewSrc(null);
    setEditing(false);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewSrc(ev.target.result);
    reader.readAsDataURL(file);
  }

  // --- Modal helpers (promise-based, mirroring the original JS flow) ---
  function showOTP(title, message, onResend) {
    return new Promise((resolve, reject) => {
      resolverRef.current = { resolve, reject };
      setModal({ type: "otp", title, message, onResend });
    });
  }

  function showGoogle(currentEmail) {
    return new Promise((resolve, reject) => {
      resolverRef.current = { resolve, reject };
      setModal({ type: "google", currentEmail });
    });
  }

  async function saveProfile() {
    const username = fields.username.trim();
    const email = fields.email.trim();
    const gender = fields.gender;
    const position = fields.position.trim();

    if (!username) {
      setModal({ type: "error", message: "Username cannot be empty" });
      return;
    }
    if (email && !emailRegex.test(email)) {
      setModal({ type: "error", message: "Please enter a valid email address" });
      return;
    }

    const originalEmail = originalFields?.email || "";
    let oldEmailVerified = false;
    let newEmailOTP = null;

    if (email !== originalEmail && email !== "") {
      try {
        if (originalEmail) {
          try {
            oldEmailVerified = await showGoogle(originalEmail);
            setModal(null);
          } catch (err) {
            setModal(null);
            if (err.message === "User cancelled") {
              setModal({ type: "error", message: "Email change cancelled" });
              return;
            }
            throw err;
          }
        } else {
          oldEmailVerified = true;
        }

        setModal({ type: "loading", message: "Sending verification code to new email..." });
        const result = await apiPostJson("/send_verification_otp", { email });
        setModal(null);

        if (!result.success) {
          setModal({ type: "error", message: result.message || "Failed to send verification code" });
          return;
        }

        try {
          newEmailOTP = await showOTP(
            "Verify New Email",
            `A 6-digit code has been sent to ${email}. Please enter it below.`,
            async () => {
              setModal({ type: "loading", message: "Resending code..." });
              await apiPostJson("/send_verification_otp", { email });
              setModal({ type: "otp", title: "Verify New Email", message: `A 6-digit code has been sent to ${email}. Please enter it below.` });
            }
          );
          setModal(null);
        } catch (err) {
          setModal(null);
          if (err.message === "User cancelled") {
            setModal({ type: "error", message: "Email change cancelled" });
            return;
          }
          throw err;
        }
      } catch (err) {
        setModal(null);
        console.error("Email verification error:", err);
        setModal({ type: "error", message: "Error during email verification" });
        return;
      }
    }

    setModal({ type: "loading", message: "Updating your profile..." });

    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("gender", gender);
    formData.append("position", position);
    formData.append("old_email_verified", oldEmailVerified ? "true" : "false");
    if (newEmailOTP) formData.append("new_email_otp", newEmailOTP);
    if (selectedFile) formData.append("profile_pic", selectedFile);

    try {
      const data = await apiPostForm("/update_profile", formData);
      setModal(null);

      if (data.success) {
        setUser((u) => ({
          ...u,
          username,
          email,
          gender,
          position,
          // backend returns a relative path (new_image_path), not a full URL
          profile_pic: data.new_image_path || u.profile_pic,
        }));
        setOriginalFields({ username, email, gender, position });
        setSelectedFile(null);
        setPreviewSrc(null);
        setEditing(false);
        setModal({ type: "success", message: data.message || "Profile updated successfully!" });
      } else {
        setModal({ type: "error", message: data.message || "Failed to update profile" });
      }
    } catch (err) {
      setModal(null);
      console.error("Error updating profile:", err);
      setModal({ type: "error", message: "An error occurred. Please try again." });
    }
  }

  if (!user) return null; // or a loading skeleton

  const resolvedImage = staticUrl(user.profile_pic);
  const displayImage = previewSrc || resolvedImage;
  const initial = (user.username || "?").charAt(0).toUpperCase();

  return (
    <>
      <div className="theme-toggle" onClick={toggleTheme}>
        <span>Theme</span>
      </div>

      <a href="/" className="back-nav">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Dashboard
      </a>

      <div className="profile-container">
        <div className="profile-card-header">
          {!editing && (
            <div className="edit-icon-btn" onClick={enableEditMode}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
          )}
          {editing && (
            <>
              <div className="save-icon-btn" onClick={saveProfile}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="cancel-icon-btn" onClick={cancelEdit}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </>
          )}

          <div className="profile-main-info">
            <div className="profile-image-large">
              {displayImage ? (
                <img src={displayImage} alt="Profile" />
              ) : (
                <div className="initial-placeholder-large">{initial}</div>
              )}
              <div className={`image-preview-badge${previewSrc ? " active" : ""}`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div className="profile-text-info">
              <h1>{user.username}</h1>
              <p className="user-email-sub">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="profile-details-grid">
          <div className="details-section">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              General Information
            </h3>

            <EditableField
              label="Username"
              value={fields.username}
              editing={editing}
              onChange={(v) => setFields((f) => ({ ...f, username: v }))}
            />
            <EditableField
              label="Email Address"
              value={fields.email}
              editing={editing}
              type="email"
              onChange={(v) => setFields((f) => ({ ...f, email: v }))}
            />
            <EditableField
              label="Gender"
              value={fields.gender}
              editing={editing}
              type="select"
              options={[
                { value: "", label: "Not Specified" },
                { value: "Male", label: "Male" },
                { value: "Female", label: "Female" },
                { value: "Other", label: "Other" },
                { value: "Prefer not to say", label: "Prefer not to say" },
              ]}
              onChange={(v) => setFields((f) => ({ ...f, gender: v }))}
            />
          </div>

          <div className="details-section">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Professional Info
            </h3>

            <EditableField
              label="Current Position"
              value={fields.position}
              editing={editing}
              onChange={(v) => setFields((f) => ({ ...f, position: v }))}
            />

            <div className="detail-item">
              <label>Account Status</label>
              <p><span className="status-indicator active"></span> Active User</p>
            </div>

            {editing && (
              <div className="profile-pic-upload-section active">
                <label className="upload-link" htmlFor="profilePicInput">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Choose Profile Picture</span>
                </label>
                <input
                  type="file"
                  id="profilePicInput"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>
        </div>

        <div className="profile-actions" style={{ display: "flex", marginTop: 30 }}>
          <a href="/logout" className="btn-logout">Logout</a>
        </div>
      </div>

      {modal?.type === "loading" && <LoadingModal message={modal.message} />}
      {modal?.type === "success" && (
        <SuccessModal message={modal.message} onDone={() => setModal(null)} />
      )}
      {modal?.type === "error" && (
        <ErrorModal message={modal.message} onClose={() => setModal(null)} />
      )}
      {modal?.type === "otp" && (
        <OtpDigitsModal
          title={modal.title}
          message={modal.message}
          onVerify={(code) => {
            resolverRef.current.resolve(code);
          }}
          onResend={modal.onResend}
          onCancel={() => {
            resolverRef.current.reject(new Error("User cancelled"));
          }}
        />
      )}
      {modal?.type === "google" && (
        <GoogleSignInModal
          currentEmail={modal.currentEmail}
          onVerified={() => resolverRef.current.resolve(true)}
          onFailed={(msg) => {
            setModal({ type: "error", message: msg });
            resolverRef.current.reject(new Error(msg));
          }}
          onCancel={() => resolverRef.current.reject(new Error("User cancelled"))}
        />
      )}
    </>
  );
}