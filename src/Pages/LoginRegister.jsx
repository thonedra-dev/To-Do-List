import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGoogleAuth from "../hooks/useGoogleAuth";
import SignInForm from "../Components/Auth/SignInForm";
import SignUpForm from "../Components/Auth/SignUpForm";
import GoogleFinalizeForm from "../Components/Auth/GoogleFinalizeForm";
import LoadingModal from "../Components/Auth/LoadingModal";
import OtpModal from "../Components/Auth/OtpModal";
import WelcomePopup from "../Components/Auth/WelcomePopup";
import Model3D from "../Components/Auth/Model3D";
import { apiPostJson } from "../api";
import "../login_register.css";

export default function LoginRegister() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [loading, setLoading] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [finalizeVisible, setFinalizeVisible] = useState(false);
  const [googleData, setGoogleData] = useState({});
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeData, setWelcomeData] = useState(null);

  // --- THEME TOGGLE ---
  function toggleTheme() {
    document.body.classList.toggle("light-mode");
    const theme = document.body.classList.contains("light-mode") ? "light" : "dark";
    localStorage.setItem("theme", theme);
  }

  // --- GOOGLE CREDENTIAL FLOW (same 2 backend calls as before) ---
  async function handleGoogleCredential(data) {
    const status = await apiPostJson("/check_google_user", { email: data.email });

    if (status.exists) {
      window.location.href = "/"; // Existing user -> Home
      return;
    }

    // New user -> stash data, show loading, send OTP
    setGoogleData({ name: data.name, email: data.email, picture: data.picture || "" });
    setLoading(true);

    const result = await apiPostJson("/send_verification_otp", { email: data.email });
    setLoading(false);

    if (result.success) {
      setOtpVisible(true);
    } else {
      alert("Error: " + result.message);
    }
  }

  // NOTE: SignInForm/SignUpForm now stay mounted permanently (see JSX below),
  // so the ref containers this hook renders Google's buttons into never get
  // destroyed when the user switches between sign-in/sign-up.
  const { signupBtnRef, signinBtnRef } = useGoogleAuth(handleGoogleCredential);

  async function verifyOtp() {
    const result = await apiPostJson("/verify_otp", { email: googleData.email, otp });

    if (result.success) {
      setOtpVisible(false);
      setOtp("");
      setMode("signup");        // land on the sign-up side
      setFinalizeVisible(true); // switch to finalize form
    } else {
      alert("Incorrect OTP.");
    }
  }

  async function resendOtp() {
    setOtpVisible(false);
    setLoading(true);

    const result = await apiPostJson("/send_verification_otp", { email: googleData.email });
    setLoading(false);
    setOtpVisible(true);
    if (result.success) alert("A new code has been sent!");
  }

  function closeOtpModal() {
    setOtpVisible(false);
    setOtp("");
  }

  function handleSignUpSuccess(data) {
    setWelcomeData(data);
    setWelcomeVisible(true);
  }

  function closeWelcomePopup() {
    setWelcomeVisible(false);
    navigate("/");
  }

  function selectMode(next) {
    if (next === mode && !finalizeVisible) return;
    setFinalizeVisible(false); // leaving finalize view resets to the plain sign-up form
    setMode(next);
  }

  const showSignIn = mode === "signin" && !finalizeVisible;
  const showSignUp = mode === "signup" && !finalizeVisible;
  const showFinalize = mode === "signup" && finalizeVisible;

  return (
    <div className="auth-page">
      <div className="auth-bg-layer dark" />
      <div className="auth-bg-layer light" />
      <div className="theme-toggle" onClick={toggleTheme} role="button" aria-label="Toggle theme">
        <svg className="theme-icon-svg" viewBox="0 0 24 24" fill="none">
          <mask id="moon-mask">
            <rect x="0" y="0" width="24" height="24" fill="white" />
            <circle className="moon-cutout" cy="7" r="9" fill="black" />
          </mask>
          <circle cx="12" cy="12" r="6" fill="currentColor" mask="url(#moon-mask)" />
          <g className="sun-rays" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="1.5" x2="12" y2="3.5" />
            <line x1="12" y1="20.5" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="3.5" y2="12" />
            <line x1="20.5" y1="12" x2="22.5" y2="12" />
            <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" />
            <line x1="18.4" y1="18.4" x2="19.8" y2="19.8" />
            <line x1="4.2" y1="19.8" x2="5.6" y2="18.4" />
            <line x1="18.4" y1="5.6" x2="19.8" y2="4.2" />
          </g>
        </svg>
      </div>

      <LoadingModal visible={loading} />
      <WelcomePopup
        visible={welcomeVisible}
        data={welcomeData}
        onClose={closeWelcomePopup}
      />
      <OtpModal
        visible={otpVisible}
        otp={otp}
        onOtpChange={setOtp}
        onVerify={verifyOtp}
        onResend={resendOtp}
        onClose={closeOtpModal}
      />

      <div className="auth-container-shadow-wrap">
        <div className="auth-container" id="authContainer">
          <nav className="auth-nav">
            <button
              type="button"
              className={`auth-nav-btn${mode === "signin" ? " active" : ""}`}
              onClick={() => selectMode("signin")}
            >
              Log In
            </button>
            <button
              type="button"
              className={`auth-nav-btn${mode === "signup" ? " active" : ""}`}
              onClick={() => selectMode("signup")}
            >
              Sign Up
            </button>
          </nav>

          <div className="auth-left">
            <div className="auth-left-inner">
              <div className="form-scroll-wrapper">
                {/* All three slots stay mounted. Only visibility toggles via CSS,
                    so the Google button refs inside SignInForm/SignUpForm are
                    never destroyed and re-created. */}
                <div className={`auth-form-slot${showSignIn ? " active" : ""}`}>
                  <SignInForm signinBtnRef={signinBtnRef} />
                </div>
                <div className={`auth-form-slot${showSignUp ? " active" : ""}`}>
                  <SignUpForm signupBtnRef={signupBtnRef} onSignUpSuccess={handleSignUpSuccess} />
                </div>
                <div className={`auth-form-slot${showFinalize ? " active" : ""}`}>
                  <GoogleFinalizeForm
                    googleData={googleData}
                    onUsernameChange={(name) => setGoogleData((d) => ({ ...d, name }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="auth-right">
            <div className="auth-right-visual-slot">
              <Model3D baseScale={1.1} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}