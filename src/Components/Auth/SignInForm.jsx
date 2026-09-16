import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPostForm } from "../../api";

export default function SignInForm({ signinBtnRef }) {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();                       // ⬅ stop the hard navigation
    setError("");

    const formData = new FormData(e.target);

    const result = await apiPostForm("/login", formData);

    if (result.success) {
      navigate("/");                          // ⬅ client-side redirect, no reload
    } else {
      setError(result.message || "Login failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form" name="sign-in-form">
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
      <p className="form-subtitle">Sign in to continue</p>

      <div className="input-group">
        <input
          type="text"
          name="username"
          id="signin-username"
          className="input-field"
          placeholder="Username"
          required
        />
      </div>
      <div className="input-group">
        <input
          type="password"
          name="password"
          id="signin-password"
          className="input-field"
          placeholder="Password"
          required
        />
      </div>
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="btn btn-primary">Sign In</button>

      <div className="divider">OR</div>
      <div ref={signinBtnRef} style={{ display: "flex", justifyContent: "center" }}></div>
    </form>
  );
}