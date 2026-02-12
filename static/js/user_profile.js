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
    
    // Clear hidden OTP
    const otpHidden = document.getElementById('otpCodeHidden');
    if(otpHidden) otpHidden.value = "";

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

// --- NEW SAVE PROFILE LOGIC WITH OTP ---
async function saveProfile() {
    const username = document.getElementById('usernameInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const gender = document.getElementById('genderInput').value;
    const position = document.getElementById('positionInput').value.trim();
    const otpHidden = document.getElementById('otpCodeHidden'); // Hidden input for OTP

    // Basic validation
    if (!username) {
        showToast('Username cannot be empty', 'error');
        return;
    }

    if (email && !isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // --- SECURITY CHECK: Did the email change? ---
    const originalEmail = originalValues.email || "";
    
    if (email !== originalEmail && email !== "") {
        // 1. Alert user about verification
        if(!confirm(`You are changing your email to ${email}. We need to verify this address. Click OK to send a code.`)) {
            return; // Stop if user cancels
        }

        // 2. Send OTP
        showToast('Sending Verification Code...', 'success');
        
        try {
            const otpResponse = await fetch('/send_verification_otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            const otpResult = await otpResponse.json();

            if (!otpResult.success) {
                showToast(otpResult.message || "Failed to send OTP", 'error');
                return;
            }

            // 3. Prompt for OTP
            let userCode = prompt(`A code has been sent to ${email}.\nPlease enter the 6-digit code:`);
            
            if (!userCode) {
                showToast("Verification cancelled.", 'error');
                return;
            }

            // Store code in hidden input to send with FormData
            if(otpHidden) otpHidden.value = userCode;

        } catch (error) {
            console.error('OTP Error:', error);
            showToast('Error sending verification code.', 'error');
            return;
        }
    } else {
        // Clear OTP if email didn't change
        if(otpHidden) otpHidden.value = "";
    }

    // --- PROCEED WITH UPDATE ---
    
    // Prepare FormData
    const formData = new FormData();
    formData.append('username', username);
    formData.append('email', email);
    formData.append('gender', gender);
    formData.append('position', position);
    
    // Append OTP if it exists
    if(otpHidden && otpHidden.value) {
        formData.append('otp_code', otpHidden.value);
    }

    // Add profile picture if selected
    if (selectedFile) {
        formData.append('profile_pic', selectedFile);
    }

    // Show loading state
    const saveBtn = document.getElementById('saveIconBtn');
    saveBtn.style.opacity = '0.5';
    saveBtn.style.pointerEvents = 'none';

    try {
        const response = await fetch('/update_profile', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Update UI with new values
            document.getElementById('headerUsername').textContent = username;
            document.getElementById('headerEmail').textContent = email || 'No Email Provided';
            
            document.getElementById('usernameDisplay').textContent = username;
            document.getElementById('emailDisplay').textContent = email || 'No Email Provided';
            document.getElementById('genderDisplay').textContent = gender || 'Not Specified';
            document.getElementById('positionDisplay').textContent = position || 'No Position Set';

            // Update profile image if new one was uploaded
            if (data.new_image_url) {
                const imgElement = document.getElementById('profileImage');
                if (imgElement) {
                    imgElement.src = data.new_image_url;
                    originalImageSrc = data.new_image_url;
                }
            }

            // Clear selected file and preview badge and OTP
            selectedFile = null;
            if(otpHidden) otpHidden.value = "";
            document.getElementById('previewBadge').classList.remove('active');

            // Exit edit mode
            exitEditMode();

            // Show success message
            showToast(data.message || 'Profile updated successfully!', 'success');
        } else {
            showToast(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        // Restore button state
        saveBtn.style.opacity = '1';
        saveBtn.style.pointerEvents = 'auto';
    }
}

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    
    toast.innerHTML = `${icon}<span>${message}</span>`;
    document.body.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 4000);
}