/* ========================================
   TASK MANAGER - AUTH & GOOGLE LOGIC
   ======================================== */

const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const authContainer = document.getElementById('authContainer');

// Temporary storage for Google Data
let tempGoogleData = {};

// --- SLIDING PANEL ANIMATION ---
signUpButton.addEventListener('click', () => {
    authContainer.classList.add('right-panel-active');
    setTimeout(() => {
        const scrollWrapper = document.querySelector('.sign-up-container .form-scroll-wrapper');
        if (scrollWrapper) scrollWrapper.scrollTop = 0;
    }, 100);
});

signInButton.addEventListener('click', () => {
    authContainer.classList.remove('right-panel-active');
});

// --- THEME TOGGLE ---
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

// --- GOOGLE IDENTITY LOGIC ---

// 1. Handle the Google Response
function handleCredentialResponse(response) {
    const data = parseJwt(response.credential);
    
    // STEP 1: Check if user exists (already implemented in previous turn)
    fetch('/check_google_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
    })
    .then(res => res.json())
    .then(status => {
        if (status.exists) {
            window.location.href = "/"; // Existing user -> Home
        } else {
            // STEP 2: NEW USER -> Show Loading Modal and Send OTP
            tempGoogleData = { name: data.name, email: data.email };
            
            document.getElementById('loadingModal').style.display = 'flex'; // SHOW LOADING

            fetch('/send_verification_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: data.email })
            })
            .then(res => res.json())
            .then(result => {
                document.getElementById('loadingModal').style.display = 'none'; // HIDE LOADING
                
                if (result.success) {
                    document.getElementById('otpModal').style.display = 'flex'; // SHOW OTP POPUP
                } else {
                    alert("Error: " + result.message);
                }
            });
        }
    });
}

// UPDATE: Modify the verifyOtp function to trigger the UI shift
function verifyOtp() {
    const otpInput = document.getElementById('otpInput').value;

    fetch('/verify_otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempGoogleData.email, otp: otpInput })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            closeOtpModal();
            
            // --- THE MAGIC SHIFT ---
            // 1. Force the container to slide to the "Sign Up" side
            authContainer.classList.add('right-panel-active'); 
            
            // 2. Switch the internal form to "Finalize" mode
            switchToFinalizeForm(); 
        } else {
            alert("Incorrect OTP.");
        }
    });
}

// 5. Switch UI to "Finalize Form"
function switchToFinalizeForm() {
    // Hide Standard Form
    document.getElementById('standard-signup-wrapper').style.display = 'none';
    
    // Show Google Finalize Form
    document.getElementById('google-finalize-wrapper').style.display = 'block';

    // Populate Fields
    document.getElementById('final-google-username').value = tempGoogleData.name;
    document.getElementById('final-google-email').value = tempGoogleData.email;
}

// Helper: Decode JWT
function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Helper: Close Modal
function closeOtpModal() {
    document.getElementById('otpModal').style.display = 'none';
    document.getElementById('otpInput').value = ''; // Clear input
}

// --- INITIALIZE GOOGLE BUTTON ---
window.onload = function () {
    google.accounts.id.initialize({
        client_id: "856845548813-rrkv0s4j0rei56dt9j3orcptkr0d3c8d.apps.googleusercontent.com",
        callback: handleCredentialResponse
    });

    // Render button on the Sign-Up panel
    google.accounts.id.renderButton(
        document.getElementById("google_signup_button"),
        { theme: "outline", size: "large", text: "signup_with", width: "250" }
    );

    // Render button on the Sign-In panel
    google.accounts.id.renderButton(
        document.getElementById("google_signin_button"),
        { theme: "outline", size: "large", text: "signin_with", width: "250" }
    );
};
// --- STANDARD FORM VALIDATION ---
function signUpValidateForm() { return true; }
function signInValidateForm() { return true; }