// ==============================================================================
// COMPLETE UPDATED user_profile.js with Google Sign-In
// Replace your ENTIRE user_profile.js file with this version
// ==============================================================================

// Theme toggle function
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

// Store original values for cancel functionality
let originalValues = {};
let selectedFile = null;
let originalImageSrc = null;

// Enable edit mode
function enableEditMode() {
    // Store original values
    originalValues = {
        username: document.getElementById('usernameInput').value,
        email: document.getElementById('emailInput').value,
        gender: document.getElementById('genderInput').value,
        position: document.getElementById('positionInput').value
    };
    
    // Store original image
    const imgElement = document.getElementById('profileImage');
    if (imgElement) {
        originalImageSrc = imgElement.src;
    }

    // Hide display elements, show input elements with blinking animation
    toggleField('username', true);
    toggleField('email', true);
    toggleField('gender', true);
    toggleField('position', true);

    // Show save and cancel buttons, hide edit button
    document.getElementById('editIconBtn').classList.add('hidden');
    document.getElementById('saveIconBtn').classList.remove('hidden');
    document.getElementById('cancelIconBtn').classList.remove('hidden');

    // Show profile picture upload section
    document.getElementById('profilePicSection').classList.add('active');
}

// Toggle field between display and input
function toggleField(fieldName, isEditMode) {
    const display = document.getElementById(fieldName + 'Display');
    const input = document.getElementById(fieldName + 'Input');
    
    if (isEditMode) {
        display.classList.add('hidden');
        input.classList.remove('hidden');
        input.classList.add('edit-active');
    } else {
        display.classList.remove('hidden');
        input.classList.add('hidden');
        input.classList.remove('edit-active');
    }
}

// Cancel edit mode
function cancelEdit() {
    // Restore original values
    document.getElementById('usernameInput').value = originalValues.username;
    document.getElementById('emailInput').value = originalValues.email;
    document.getElementById('genderInput').value = originalValues.gender;
    document.getElementById('positionInput').value = originalValues.position;
    
    // Restore original image
    const imgElement = document.getElementById('profileImage');
    const placeholder = document.getElementById('initialPlaceholder');
    
    if (selectedFile && originalImageSrc) {
        if (imgElement) {
            imgElement.src = originalImageSrc;
        } else if (placeholder) {
            // Was placeholder before, restore it
            const createdImg = document.getElementById('profileImage');
            if (createdImg) {
                createdImg.remove();
            }
            placeholder.style.display = 'flex';
        }
    }

    // Clear selected file
    selectedFile = null;
    document.getElementById('profilePicInput').value = '';
    document.getElementById('previewBadge').classList.remove('active');

    // Exit edit mode
    exitEditMode();
}

// Exit edit mode (helper function)
function exitEditMode() {
    // Hide input elements, show display elements
    toggleField('username', false);
    toggleField('email', false);
    toggleField('gender', false);
    toggleField('position', false);

    // Show edit button, hide save and cancel buttons
    document.getElementById('editIconBtn').classList.remove('hidden');
    document.getElementById('saveIconBtn').classList.add('hidden');
    document.getElementById('cancelIconBtn').classList.add('hidden');

    // Hide profile picture upload section
    document.getElementById('profilePicSection').classList.remove('active');
}

// Handle file selection and preview
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('profilePicInput');
    if(fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                selectedFile = file;
                
                // Show preview
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imgElement = document.getElementById('profileImage');
                    const placeholder = document.getElementById('initialPlaceholder');
                    
                    if (imgElement) {
                        imgElement.src = event.target.result;
                    } else if (placeholder) {
                        // Replace placeholder with image
                        placeholder.style.display = 'none';
                        
                        const newImg = document.createElement('img');
                        newImg.id = 'profileImage';
                        newImg.src = event.target.result;
                        newImg.alt = 'Profile';
                        newImg.style.width = '100%';
                        newImg.style.height = '100%';
                        newImg.style.objectFit = 'cover';
                        
                        const container = document.getElementById('profileImageContainer');
                        container.insertBefore(newImg, container.firstChild);
                    }
                    
                    // Show preview badge
                    document.getElementById('previewBadge').classList.add('active');
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// ==============================================================================
// MODAL FUNCTIONS
// ==============================================================================

function showLoadingModal(message) {
    const modal = document.createElement('div');
    modal.className = 'otp-modal-overlay';
    modal.id = 'loadingModal';
    
    modal.innerHTML = `
        <div class="otp-modal loading-modal">
            <div class="loading-spinner"></div>
            <p class="loading-text">${message}</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

function hideLoadingModal() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function showOTPModal(title, message, onResend) {
    return new Promise((resolve, reject) => {
        const modal = document.createElement('div');
        modal.className = 'otp-modal-overlay';
        modal.id = 'otpModal';
        
        modal.innerHTML = `
            <div class="otp-modal">
                <div class="otp-icon">🔒</div>
                <h2 class="otp-title">${title}</h2>
                <p class="otp-message">${message}</p>
                <div class="otp-input-container">
                    <input type="text" class="otp-digit" maxlength="1" data-index="0">
                    <input type="text" class="otp-digit" maxlength="1" data-index="1">
                    <input type="text" class="otp-digit" maxlength="1" data-index="2">
                    <input type="text" class="otp-digit" maxlength="1" data-index="3">
                    <input type="text" class="otp-digit" maxlength="1" data-index="4">
                    <input type="text" class="otp-digit" maxlength="1" data-index="5">
                </div>
                <div class="otp-error" id="otpError"></div>
                <button class="otp-verify-btn" id="otpVerifyBtn">VERIFY</button>
                <div class="otp-footer">
                    <span class="otp-resend">Didn't receive it? <span class="otp-resend-link">Resend Code</span></span>
                    <button class="otp-cancel-btn" id="otpCancelBtn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Focus first input
        const inputs = modal.querySelectorAll('.otp-digit');
        inputs[0].focus();
        
        // Handle input navigation
        inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
                
                // Clear error when user types
                const errorDiv = document.getElementById('otpError');
                if (errorDiv) errorDiv.textContent = '';
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    inputs[index - 1].focus();
                }
            });
            
            // Allow paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text').slice(0, 6);
                pastedData.split('').forEach((char, i) => {
                    if (inputs[i]) {
                        inputs[i].value = char;
                    }
                });
                if (pastedData.length < 6) {
                    inputs[pastedData.length]?.focus();
                }
            });
        });
        
        // Verify button handler
        document.getElementById('otpVerifyBtn').addEventListener('click', () => {
            const code = Array.from(inputs).map(input => input.value).join('');
            if (code.length === 6) {
                resolve(code);
                closeOTPModal();
            } else {
                showOTPError('Please enter all 6 digits');
            }
        });
        
        // Cancel button handler
        document.getElementById('otpCancelBtn').addEventListener('click', () => {
            reject(new Error('User cancelled'));
            closeOTPModal();
        });
        
        // Resend link handler
        modal.querySelector('.otp-resend-link').addEventListener('click', () => {
            if (onResend) {
                onResend();
            }
        });
    });
}

function closeOTPModal() {
    const modal = document.getElementById('otpModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function showOTPError(message) {
    const errorDiv = document.getElementById('otpError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showSuccessModal(message) {
    const modal = document.createElement('div');
    modal.className = 'otp-modal-overlay';
    modal.id = 'successModal';
    
    modal.innerHTML = `
        <div class="otp-modal success-modal">
            <div class="success-icon">✓</div>
            <h2 class="success-title">Success!</h2>
            <p class="success-message">${message}</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    setTimeout(() => {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }, 2500);
}

function showErrorModal(message) {
    const modal = document.createElement('div');
    modal.className = 'otp-modal-overlay';
    modal.id = 'errorModal';
    
    modal.innerHTML = `
        <div class="otp-modal error-modal">
            <div class="error-icon">✕</div>
            <h2 class="error-title">Error</h2>
            <p class="error-message">${message}</p>
            <button class="error-close-btn" onclick="this.closest('.otp-modal-overlay').remove()">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

// ==============================================================================
// GOOGLE SIGN-IN MODAL
// ==============================================================================

function showGoogleSignInModal(currentEmail) {
    return new Promise((resolve, reject) => {
        const modal = document.createElement('div');
        modal.className = 'otp-modal-overlay';
        modal.id = 'googleSignInModal';
        
        modal.innerHTML = `
            <div class="otp-modal google-signin-modal">
                <div class="google-icon">
                    <svg viewBox="0 0 48 48" width="48" height="48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                </div>
                <h2 class="google-title">Verify Your Identity</h2>
                <p class="google-message">To change your email address, please sign in with Google to verify you own:<br><strong>${currentEmail}</strong></p>
                <div id="googleSignInButton" class="google-signin-btn">
                    <svg viewBox="0 0 48 48" width="20" height="20">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Sign in with Google</span>
                </div>
                <div class="google-footer">
                    <button class="google-cancel-btn" id="googleCancelBtn">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Initialize Google Sign-In button
        google.accounts.id.initialize({
            client_id: '856845548813-rrkv0s4j0rei56dt9j3orcptkr0d3c8d.apps.googleusercontent.com', // TODO: Add your Google Client ID
            callback: async (response) => {
                // Decode JWT token to get email
                const payload = JSON.parse(atob(response.credential.split('.')[1]));
                const googleEmail = payload.email;
                
                // Verify with backend
                try {
                    const verifyResponse = await fetch('/verify_old_email_google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: googleEmail })
                    });
                    
                    const result = await verifyResponse.json();
                    
                    if (result.success) {
                        closeGoogleSignInModal();
                        resolve(true);
                    } else {
                        showErrorModal(result.message || 'Email verification failed');
                        reject(new Error(result.message));
                    }
                } catch (error) {
                    showErrorModal('Verification error. Please try again.');
                    reject(error);
                }
            }
        });
        
        google.accounts.id.renderButton(
            document.getElementById('googleSignInButton'),
            { 
                theme: 'filled_blue',
                size: 'large',
                width: 280,
                text: 'signin_with'
            }
        );
        
        // Cancel button
        document.getElementById('googleCancelBtn').addEventListener('click', () => {
            reject(new Error('User cancelled'));
            closeGoogleSignInModal();
        });
    });
}

function closeGoogleSignInModal() {
    const modal = document.getElementById('googleSignInModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// ==============================================================================
// SAVE PROFILE WITH GOOGLE SIGN-IN FOR OLD EMAIL
// ==============================================================================

async function saveProfile() {
    const username = document.getElementById('usernameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const gender = document.getElementById('genderInput').value;
    const position = document.getElementById('positionInput').value.trim();

    // Basic validation
    if (!username) {
        showErrorModal('Username cannot be empty');
        return;
    }

    if (email && !isValidEmail(email)) {
        showErrorModal('Please enter a valid email address');
        return;
    }

    const originalEmail = originalValues.email || "";
    let oldEmailVerified = false;
    let newEmailOTP = null;
    
    // Check if email is being changed
    if (email !== originalEmail && email !== "") {
        try {
            // STEP 1: Verify OLD email using Google Sign-In (if exists)
            if (originalEmail && originalEmail !== "") {
                try {
                    oldEmailVerified = await showGoogleSignInModal(originalEmail);
                } catch (error) {
                    if (error.message === 'User cancelled') {
                        showErrorModal('Email change cancelled');
                        return;
                    }
                    throw error;
                }
            } else {
                // No old email, skip verification
                oldEmailVerified = true;
            }
            
            // STEP 2: Send OTP to NEW email
            showLoadingModal('Sending verification code to new email...');
            
            const newEmailResponse = await fetch('/send_verification_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            
            const newEmailResult = await newEmailResponse.json();
            hideLoadingModal();
            
            if (!newEmailResult.success) {
                showErrorModal(newEmailResult.message || 'Failed to send verification code');
                return;
            }
            
            // STEP 3: Show OTP modal for NEW email
            try {
                newEmailOTP = await showOTPModal(
                    'Verify New Email',
                    `A 6-digit code has been sent to ${email}. Please enter it below.`,
                    async () => {
                        // Resend OTP
                        showLoadingModal('Resending code...');
                        await fetch('/send_verification_otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: email })
                        });
                        hideLoadingModal();
                    }
                );
            } catch (error) {
                if (error.message === 'User cancelled') {
                    showErrorModal('Email change cancelled');
                    return;
                }
                throw error;
            }
            
        } catch (error) {
            hideLoadingModal();
            console.error('Email verification error:', error);
            showErrorModal('Error during email verification');
            return;
        }
    }

    // Proceed with profile update
    showLoadingModal('Updating your profile...');
    
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('gender', gender);
    formData.append('position', position);
    formData.append('old_email_verified', oldEmailVerified ? 'true' : 'false');
    
    if (newEmailOTP) {
        formData.append('new_email_otp', newEmailOTP);
    }

    if (selectedFile) {
        formData.append('profile_pic', selectedFile);
    }

    try {
        const response = await fetch('/update_profile', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        hideLoadingModal();

        if (data.success) {
            // Update UI
            document.getElementById('headerUsername').textContent = username;
            document.getElementById('headerEmail').textContent = email || 'No Email Provided';
            document.getElementById('usernameDisplay').textContent = username;
            document.getElementById('emailDisplay').textContent = email || 'No Email Provided';
            document.getElementById('genderDisplay').textContent = gender || 'Not Specified';
            document.getElementById('positionDisplay').textContent = position || 'No Position Set';

            if (data.new_image_url) {
                const imgElement = document.getElementById('profileImage');
                if (imgElement) {
                    imgElement.src = data.new_image_url;
                    originalImageSrc = data.new_image_url;
                }
            }

            selectedFile = null;
            document.getElementById('previewBadge').classList.remove('active');

            originalValues = { username, email, gender, position };
            exitEditMode();
            showSuccessModal(data.message || 'Profile updated successfully!');
        } else {
            showErrorModal(data.message || 'Failed to update profile');
        }
    } catch (error) {
        hideLoadingModal();
        console.error('Error updating profile:', error);
        showErrorModal('An error occurred. Please try again.');
    }
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Toast notification function (kept for backward compatibility)
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 4000);
}