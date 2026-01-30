/* ========================================
   TASK MANAGER - SMOOTH ANIMATIONS
   Clean JavaScript for Login/Register
   ======================================== */

// ========================================
// DOM ELEMENTS
// ========================================
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const authContainer = document.getElementById('authContainer');

// ========================================
// SMOOTH SLIDING PANEL ANIMATION
// ======================================== 

// Switch to Sign Up Form
signUpButton.addEventListener('click', () => {
    authContainer.classList.add('right-panel-active');
    
    // Scroll register form to top when opened
    setTimeout(() => {
        const scrollWrapper = document.querySelector('.sign-up-container .form-scroll-wrapper');
        if (scrollWrapper) {
            scrollWrapper.scrollTop = 0;
        }
    }, 100);
});

// Switch to Sign In Form
signInButton.addEventListener('click', () => {
    authContainer.classList.remove('right-panel-active');
});

// ========================================
// THEME TOGGLE FUNCTIONALITY
// ========================================

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    
    // Save theme preference to localStorage
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

// Load saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
});

// ========================================
// FORM VALIDATION
// ========================================

// Sign Up Form Validation
function signUpValidateForm() {
    const username = document.forms["sign-up-form"]["username"].value;
    const position = document.forms["sign-up-form"]["position"].value;
    const age = document.forms["sign-up-form"]["age"].value;
    const gender = document.forms["sign-up-form"]["gender"].value;
    const password = document.forms["sign-up-form"]["password"].value;

    // Validate Username
    if (username === "" || username.trim().length === 0) {
        asAlertMsg({
            type: "error",
            title: "Empty Field",
            message: "'Username' cannot be empty!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // Validate Position
    if (position === "" || position.trim().length === 0) {
        asAlertMsg({
            type: "error",
            title: "Empty Field",
            message: "'Position' cannot be empty!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // Validate Age
    if (age === "" || age < 1 || age > 150) {
        asAlertMsg({
            type: "error",
            title: "Invalid Age",
            message: "Please enter a valid age (1-150)!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // Validate Gender
    if (gender === "") {
        asAlertMsg({
            type: "error",
            title: "Empty Field",
            message: "Please select your gender!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // Validate Password
    if (password === "" || password.length < 6) {
        asAlertMsg({
            type: "error",
            title: "Invalid Password",
            message: "Password must be at least 6 characters long!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // All validations passed
    return true;
}

// Sign In Form Validation
function signInValidateForm() {
    const username = document.forms["sign-in-form"]["username"].value;
    const password = document.forms["sign-in-form"]["password"].value;

    // Validate Username
    if (username === "" || username.trim().length === 0) {
        asAlertMsg({
            type: "error",
            title: "Empty Field",
            message: "'Username' cannot be empty!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // Validate Password
    if (password === "" || password.trim().length === 0) {
        asAlertMsg({
            type: "error",
            title: "Empty Field",
            message: "'Password' cannot be empty!",
            button: {
                text: "OK",
                bg: "error"
            }
        });
        return false;
    }

    // All validations passed
    return true;
}

// ========================================
// PREVENT DOUBLE FORM SUBMISSION
// ========================================

document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        const submitButton = this.querySelector('button[type="submit"]');
        if (submitButton.disabled) {
            e.preventDefault();
            return false;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = '⏳ Processing...';
        
        // Re-enable after 3 seconds (in case validation fails)
        setTimeout(() => {
            submitButton.disabled = false;
            const formName = this.getAttribute('name');
            submitButton.textContent = formName === 'sign-in-form' ? '🚀 Sign In' : '🚀 Sign Up';
        }, 3000);
    });
});

// ========================================
// ENHANCED INPUT FOCUS EFFECTS
// ========================================

document.querySelectorAll('.input-field, .select-field').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.classList.add('input-focused');
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.classList.remove('input-focused');
    });
});

// ========================================
// FORGOT PASSWORD PLACEHOLDER
// ========================================

const forgotPasswordLink = document.querySelector('.forgot-password');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        asAlertMsg({
            type: "default",
            title: "Password Reset",
            message: "Password reset functionality will be available soon. Please contact your administrator.",
            button: {
                text: "OK",
                bg: "default"
            }
        });
    });
}

// ========================================
// KEYBOARD NAVIGATION
// ========================================

document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT') {
            const form = activeElement.closest('form');
            if (form) {
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton && !submitButton.disabled) {
                    e.preventDefault();
                    submitButton.click();
                }
            }
        }
    }
});

// ========================================
// SMOOTH SCROLL FOR REGISTER FORM
// ========================================

// Add smooth scrolling behavior to register form
const signUpContainer = document.querySelector('.sign-up-container');
if (signUpContainer) {
    const scrollWrapper = signUpContainer.querySelector('.form-scroll-wrapper');
    if (scrollWrapper) {
        scrollWrapper.style.scrollBehavior = 'smooth';
    }
}

// ========================================
// CONSOLE WELCOME MESSAGE
// ========================================

console.log('%c✨ Task Manager Authentication', 'color: #667eea; font-size: 18px; font-weight: bold;');
console.log('%c🎨 Clean Black & White Theme', 'color: #764ba2; font-size: 14px;');
console.log('%c🚀 Smooth Sliding Panels • Scrollable Forms • Image Backgrounds', 'color: #999; font-size: 12px;');