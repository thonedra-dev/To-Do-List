/**
 * SECTION 1: THEME & TASK POPUP LOGIC (unchanged)
 */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
    } else {
        localStorage.setItem('theme', 'dark');
    }
}

function showTaskPopup() {
    document.getElementById("taskInputPopup").style.display = "block";
}

function closeTaskPopup() {
    document.getElementById("taskInputPopup").style.display = "none";
    document.getElementById("task_name").value = "";
}

function showDueDatePopupUI() {
    const taskName = document.getElementById("task_name").value;
    if (taskName.trim() === "") {
        alert("Please enter a task name first");
        return;
    }
    document.getElementById("taskInputPopup").style.display = "none";
    document.getElementById("dueDatePopup").style.display = "block";
}

function submitTaskWithDueDate() {
    document.getElementById("dueDatePopup").style.display = "none";
    document.getElementById("stepSetupPopup").style.display = "block";
}

function submitTaskWithoutDueDate() {
    document.getElementById("due_date").value = "";
    document.getElementById("dueDatePopup").style.display = "none";
    document.getElementById("stepSetupPopup").style.display = "block";
}

function closeStepSetupPopup() {
    document.getElementById("stepSetupPopup").style.display = "none";
    document.getElementById("taskForm").submit();
}

function addStepToList() {
    const stepDesc = document.getElementById("step_description").value;
    const difficulty = document.getElementById("difficulty").value;

    if (stepDesc.trim() !== "") {
        const stepList = document.getElementById("stepList");
        const listItem = document.createElement("li");

        let badgeClass = difficulty.toLowerCase();
        listItem.innerHTML = `<span class="step-text">${stepDesc}</span> <span class="step-badge ${badgeClass}">${difficulty}</span>`;
        stepList.appendChild(listItem);

        const stepInput = document.createElement("input");
        stepInput.type = "hidden";
        stepInput.name = "steps[]";
        stepInput.value = `${stepDesc}|${difficulty}`;
        document.getElementById("taskForm").appendChild(stepInput);

        document.getElementById("step_description").value = "";
    }
}

/**
 * SECTION 2: PROMPT BUTTON DATA & CLICK HANDLER
 */
const promptContainer = document.getElementById('prompt-data');
const USER_PROMPTS = JSON.parse(promptContainer.getAttribute('data-prompts') || "[]");

function handlePromptClick(promptText) {
    if (promptText.includes('Verify Email')) {
        openEmailVerifyPopup();
    } else if (promptText.includes('Setup Profile')) {
        openProfileSetupPopup();
    }
}

// =====================================================================
// SECTION 3: SHARED OVERLAY HELPERS
// =====================================================================
function showOverlay() {
    document.getElementById('setup-overlay').style.display = 'block';
}

function hideOverlay() {
    document.getElementById('setup-overlay').style.display = 'none';
}

function closeAllSetupPopups() {
    document.getElementById('emailVerifyPopup').style.display = 'none';
    document.getElementById('profileSetupPopup').style.display = 'none';
    hideOverlay();
}

// =====================================================================
// SECTION 4: EMAIL VERIFICATION POPUP
// =====================================================================



function openEmailVerifyPopup() {
    document.getElementById('email-input').value = '';
    document.getElementById('otp-input').value = '';
    hideError('email-step1-error');
    hideError('email-step2-error');
    showEmailStep1();
    document.getElementById('emailVerifyPopup').style.display = 'block';
    showOverlay();
}

function closeEmailVerifyPopup() {
    document.getElementById('emailVerifyPopup').style.display = 'none';
    hideOverlay();
    pickedEmail = null;
}

function showEmailStep1() {
    document.getElementById('emailStep1').style.display    = 'block';
    document.getElementById('emailStep2').style.display    = 'none';
    document.getElementById('emailStepDone').style.display = 'none';
}

function showEmailStep2() {
    document.getElementById('emailStep1').style.display    = 'none';
    document.getElementById('emailStep2').style.display    = 'block';
    document.getElementById('emailStepDone').style.display = 'none';
    document.getElementById('otp-target-email').textContent = pickedEmail;
}

function showEmailStepDone() {
    document.getElementById('emailStep1').style.display    = 'none';
    document.getElementById('emailStep2').style.display    = 'none';
    document.getElementById('emailStepDone').style.display = 'block';
}

async function sendEmailOtp() {
    const emailVal = document.getElementById('email-input').value.trim();
    if (!emailVal || !emailVal.includes('@')) {
        showError('email-step1-error', 'Please enter a valid email address.');
        return;
    }
    hideError('email-step1-error');
    pickedEmail = emailVal;

    const btn = document.querySelector('#emailStep1 .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const res  = await fetch('/send_verification_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pickedEmail })
        });
        const data = await res.json();
        if (data.success) {
            showEmailStep2();
        } else {
            showError('email-step1-error', data.message || 'Failed to send code. Try again.');
        }
    } catch (err) {
        showError('email-step1-error', 'Network error. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Code';
    }
}

async function verifyEmailOtp() {
    const otp = document.getElementById('otp-input').value.trim();
    if (!otp || otp.length < 6) {
        showError('email-step2-error', 'Please enter the 6-digit code.');
        return;
    }
    hideError('email-step2-error');

    try {
        // 1. Verify the OTP
        const verifyRes  = await fetch('/verify_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pickedEmail, otp: otp })
        });
        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            showError('email-step2-error', verifyData.message || 'Invalid code. Try again.');
            return;
        }

        // 2. Save the verified email to the user's account
        const saveRes  = await fetch('/homepage_save_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: pickedEmail })
        });
        const saveData = await saveRes.json();

        if (saveData.success) {
            showEmailStepDone();
            removePromptButton('Verify Email');
        } else {
            showError('email-step2-error', saveData.message || 'Could not save email. Try again.');
        }
    } catch (err) {
        showError('email-step2-error', 'Network error. Please try again.');
    }
}
// =====================================================================
// SECTION 5: PROFILE SETUP POPUP
// =====================================================================
const profileData = { position: null, age: null, gender: null, pic: null };
const PROFILE_STEPS_TOTAL = 4;

function openProfileSetupPopup() {
    // Reset all step data
    profileData.position = null;
    profileData.age      = null;
    profileData.gender   = null;
    profileData.pic      = null;
    document.getElementById('ps-position').value = '';
    document.getElementById('ps-age').value = '';
    document.getElementById('ps-gender').value = '';
    document.getElementById('ps-pic-input').value = '';
    document.getElementById('pic-preview-img').style.display = 'none';
    document.getElementById('pic-placeholder-icon').style.display = 'block';
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));

    showProfileStep(1);
    document.getElementById('profileSetupPopup').style.display = 'block';
    showOverlay();
}

function closeProfileSetupPopup() {
    document.getElementById('profileSetupPopup').style.display = 'none';
    hideOverlay();
}

function showProfileStep(stepNum) {
    for (let i = 1; i <= PROFILE_STEPS_TOTAL; i++) {
        const el = document.getElementById(`profileStep${i}`);
        if (el) el.style.display = (i === stepNum) ? 'block' : 'none';
    }
    document.getElementById('profileStepDone').style.display = 'none';

    // Update step bar
    const pct = ((stepNum - 1) / PROFILE_STEPS_TOTAL) * 100;
    document.getElementById('profileStepBar').style.width = pct + '%';
    document.getElementById('profileStepLabel').textContent = `Step ${stepNum} of ${PROFILE_STEPS_TOTAL}`;
}

function showProfileDone() {
    for (let i = 1; i <= PROFILE_STEPS_TOTAL; i++) {
        const el = document.getElementById(`profileStep${i}`);
        if (el) el.style.display = 'none';
    }
    document.getElementById('profileStepDone').style.display = 'block';
    document.getElementById('profileStepBar').style.width = '100%';
    document.getElementById('profileStepLabel').textContent = 'Complete!';
    // Remove the "Setup Profile" button from the bubble
    removePromptButton('Setup Profile');
}

function profileStepSkip(step) {
    // Clear that step's data and move on
    if (step === 1) profileData.position = null;
    if (step === 2) profileData.age      = null;
    if (step === 3) profileData.gender   = null;
    if (step === 4) profileData.pic      = null;

    if (step < PROFILE_STEPS_TOTAL) {
        showProfileStep(step + 1);
    } else {
        submitProfileSetup();
    }
}

function profileStepNext(step) {
    if (step === 1) {
        const val = document.getElementById('ps-position').value.trim();
        profileData.position = val || null;
        showProfileStep(2);
    } else if (step === 2) {
        const val = parseInt(document.getElementById('ps-age').value);
        if (document.getElementById('ps-age').value.trim() && (isNaN(val) || val < 1 || val > 120)) {
            alert('Please enter a valid age between 1 and 120.');
            return;
        }
        profileData.age = val || null;
        showProfileStep(3);
    } else if (step === 3) {
        profileData.gender = document.getElementById('ps-gender').value || null;
        showProfileStep(4);
    } else if (step === 4) {
        // pic is already stored in profileData.pic via previewProfilePic
        submitProfileSetup();
    }
}

function selectGender(btn) {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('ps-gender').value = btn.getAttribute('data-value');
}

function previewProfilePic(input) {
    if (input.files && input.files[0]) {
        profileData.pic = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('pic-preview-img').src = e.target.result;
            document.getElementById('pic-preview-img').style.display = 'block';
            document.getElementById('pic-placeholder-icon').style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitProfileSetup() {
    const formData = new FormData();
    if (profileData.position) formData.append('position', profileData.position);
    if (profileData.age)      formData.append('age', profileData.age);
    if (profileData.gender)   formData.append('gender', profileData.gender);
    if (profileData.pic)      formData.append('profile_pic', profileData.pic);

    try {
        const res = await fetch('/save_profile_setup', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            showProfileDone();
        } else {
            alert('Error saving profile: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Network error while saving profile. Please try again.');
    }
}

// =====================================================================
// SECTION 6: BUBBLE BUTTON REMOVAL HELPER
// =====================================================================
function removePromptButton(keyword) {
    const container = document.getElementById('prompt-buttons-container');
    if (!container) return;
    const btns = container.querySelectorAll('.prompt-action-btn');
    btns.forEach(btn => {
        if (btn.textContent.includes(keyword)) {
            btn.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => btn.remove(), 300);
        }
    });
    // If no buttons left, hide the speech bubble entirely
    setTimeout(() => {
        if (container.querySelectorAll('.prompt-action-btn').length === 0) {
            const bubble = document.getElementById('speech-bubble');
            if (bubble) bubble.style.display = 'none';
        }
    }, 500);
}

// =====================================================================
// SECTION 7: SMALL UTILITY HELPERS
// =====================================================================
function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}