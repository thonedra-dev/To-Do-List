import { useNavigate } from "react-router-dom";
import { apiPostForm } from "../../api";

export default function GoogleFinalizeForm({ googleData, onUsernameChange }) {
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();                        // ⬅ stop the hard navigation

    const formData = new FormData();
    formData.append("google_username", googleData.name || "");
    formData.append("google_email", googleData.email || "");
    formData.append("google_profile_pic", googleData.picture || "");

    const result = await apiPostForm("/google_register", formData);

    if (result.success) {
      navigate("/");
    } else {
      alert(result.message || "Could not finalize account");
    }
  }

  return (
    <div id="google-finalize-wrapper">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1 className="form-title">Finalize account</h1>
        <p className="form-subtitle">Please confirm your details</p>

        {googleData.picture && (
          <div style={{ textAlign: "center" }}>
            <img
              src={googleData.picture}
              alt="Google Profile"
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid var(--card-border)",
              }}
            />
          </div>
        )}

        <div className="input-group">
          <input
            type="text"
            name="google_username"
            id="final-google-username"
            className="input-field"
            placeholder="Username"
            value={googleData.name || ""}
            onChange={(e) => onUsernameChange(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <input
            type="email"
            name="google_email"
            id="final-google-email"
            className="input-field"
            value={googleData.email || ""}
            readOnly
          />
        </div>

        <input
          type="hidden"
          name="google_profile_pic"
          id="final-google-profile-pic"
          value={googleData.picture || ""}
          readOnly
        />

        <button type="submit" className="btn btn-primary">Complete Sign Up</button>
      </form>
    </div>
  );
}