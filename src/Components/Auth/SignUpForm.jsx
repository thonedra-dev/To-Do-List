import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPostForm } from "../../api";

// Shorten a filename for display so a long name never stretches the
// layout, e.g. "vacation-photo-final-edit.png" -> "vacation-ph….png"
function shortenFileName(name, maxBase = 10) {
  const dotIndex = name.lastIndexOf(".");
  const hasExt = dotIndex > 0 && dotIndex < name.length - 1;
  const base = hasExt ? name.slice(0, dotIndex) : name;
  const ext = hasExt ? name.slice(dotIndex) : "";
  if (base.length <= maxBase) return base + ext;
  return `${base.slice(0, maxBase)}…${ext}`;
}

export default function SignUpForm({ signupBtnRef, onSignUpSuccess }) {
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(shortenFileName(file.name));
  }

  async function handleSubmit(e) {
    e.preventDefault();                        // ⬅ stop the hard navigation
    setError("");

    const form = e.target;
    const formData = new FormData(form);        // ⬅ grabs username/password/file automatically

    // Read fields needed for the post-signup welcome popup before the
    // form data is sent off.
    const username = formData.get("username") || "";
    const fileInput = form.querySelector("#signup-profile-pic");
    const pickedFile = fileInput?.files?.[0] || null;

    const result = await apiPostForm("/register", formData);

    if (result.success) {
      if (onSignUpSuccess) {
        // Build a local preview only now, for the welcome popup —
        // never rendered inside the form itself.
        let profilePicUrl = "";
        if (pickedFile) {
          profilePicUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(pickedFile);
          });
        }
        onSignUpSuccess({
          username,
          email: result.email || "",
          profilePicUrl,
        });
      } else {
        navigate("/");
      }
    } else {
      setError(result.message || "Sign up failed");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="auth-form"
      name="sign-up-form"
    >
      <div className="auth-left-brand">
        <div className="auth-brand-mark">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11.5l2 2 4.5-4.5" />
            <rect x="3" y="3" width="18" height="18" rx="5" />
          </svg>
        </div>
        <span className="auth-brand-name">
          Task<span>Flow</span>
        </span>
      </div>
      <p className="form-subtitle">Start your journey with us</p>

      <div className="input-group">
        <input
          type="text"
          name="username"
          id="signup-username"
          className="input-field"
          placeholder="Username"
          required
        />
      </div>

      <div className="input-group">
        <input
          type="password"
          name="password"
          id="signup-password"
          className="input-field"
          placeholder="Password"
          required
        />
      </div>

      <div className="input-group">
        <div className="file-input-wrapper">
          <input
            type="file"
            name="profile_pic"
            id="signup-profile-pic"
            accept="image/*"
            onChange={handleFileChange}
          />
          <label htmlFor="signup-profile-pic" className="file-input-label">
            {fileName ? fileName : "Profile picture (optional)"}
          </label>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-primary">Sign Up</button>

      <div className="divider">OR</div>
      <div ref={signupBtnRef} style={{ display: "flex", justifyContent: "center" }}></div>
    </form>
  );
}