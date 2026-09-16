import { useEffect, useRef } from "react";

/**
 * Loads the Google Identity Services script and wires up
 * the sign-in / sign-up buttons, exactly like the old
 * login_register.js window.onload block did.
 *
 * onCredential receives the decoded JWT payload (name, email, picture).
 */
const GOOGLE_CLIENT_ID =
  "856845548813-rrkv0s4j0rei56dt9j3orcptkr0d3c8d.apps.googleusercontent.com";

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

export default function useGoogleAuth(onCredential) {
  const signupBtnRef = useRef(null);
  const signinBtnRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function handleCredentialResponse(response) {
      const data = parseJwt(response.credential);
      onCredential(data);
    }

    function initGoogle() {
      if (cancelled || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      });

      if (signupBtnRef.current) {
        window.google.accounts.id.renderButton(signupBtnRef.current, {
          theme: "outline",
          size: "large",
          text: "signup_with",
          width: "250",
        });
      }
      if (signinBtnRef.current) {
        window.google.accounts.id.renderButton(signinBtnRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: "250",
        });
      }
    }

    // Inject the Google script once, then init the buttons
    const existing = document.getElementById("google-identity-script");
    if (existing) {
      if (window.google) initGoogle();
      else existing.addEventListener("load", initGoogle);
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-identity-script";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { signupBtnRef, signinBtnRef };
}