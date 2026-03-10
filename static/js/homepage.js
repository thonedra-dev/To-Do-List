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
// Read which fields are missing from the data attribute
const MISSING_FIELDS = JSON.parse(
    document.getElementById('prompt-data').getAttribute('data-missing-fields') || '[]'
);

// All 4 possible steps mapped to their field name and HTML step ID
const ALL_STEPS = [
    { field: 'position', id: 'profileStep1' },
    { field: 'age',      id: 'profileStep2' },
    { field: 'gender',   id: 'profileStep3' },
    { field: 'pic',      id: 'profileStep4' },
];

// Only keep steps where the field is actually missing
const ACTIVE_STEPS = ALL_STEPS.filter(s => MISSING_FIELDS.includes(s.field));

const profileData = { position: null, age: null, gender: null, pic: null };

function openProfileSetupPopup() {
    // Reset data
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

    // Hide ALL step divs first, then show only active ones via showProfileStep
    ALL_STEPS.forEach(s => {
        document.getElementById(s.id).style.display = 'none';
    });
    document.getElementById('profileStepDone').style.display = 'none';

    showProfileStep(0); // index into ACTIVE_STEPS
    document.getElementById('profileSetupPopup').style.display = 'block';
    showOverlay();
}

function closeProfileSetupPopup() {
    document.getElementById('profileSetupPopup').style.display = 'none';
    hideOverlay();
}

// activeIndex = index in ACTIVE_STEPS array (0-based)
function showProfileStep(activeIndex) {
    // Hide all step divs
    ALL_STEPS.forEach(s => {
        document.getElementById(s.id).style.display = 'none';
    });
    document.getElementById('profileStepDone').style.display = 'none';

    // Show the current active step's div
    const current = ACTIVE_STEPS[activeIndex];
    if (current) {
        document.getElementById(current.id).style.display = 'block';
    }

    // Progress bar based on active steps only
    const pct = (activeIndex / ACTIVE_STEPS.length) * 100;
    document.getElementById('profileStepBar').style.width = pct + '%';
    document.getElementById('profileStepLabel').textContent =
        `Step ${activeIndex + 1} of ${ACTIVE_STEPS.length}`;
}

function showProfileDone() {
    ALL_STEPS.forEach(s => {
        document.getElementById(s.id).style.display = 'none';
    });
    document.getElementById('profileStepDone').style.display = 'block';
    document.getElementById('profileStepBar').style.width = '100%';
    document.getElementById('profileStepLabel').textContent = 'Complete!';
    removePromptButton('Setup Profile');
}

// activeIndex = current index in ACTIVE_STEPS
function profileStepSkip(activeIndex) {
    const current = ACTIVE_STEPS[activeIndex];
    if (current) profileData[current.field] = null; // clear that field

    const next = activeIndex + 1;
    if (next < ACTIVE_STEPS.length) {
        showProfileStep(next);
    } else {
        submitProfileSetup();
    }
}

function profileStepNext(activeIndex) {
    const current = ACTIVE_STEPS[activeIndex];

    if (current.field === 'position') {
        profileData.position = document.getElementById('ps-position').value.trim() || null;

    } else if (current.field === 'age') {
        const raw = document.getElementById('ps-age').value.trim();
        const val = parseInt(raw);
        if (raw && (isNaN(val) || val < 1 || val > 120)) {
            alert('Please enter a valid age between 1 and 120.');
            return;
        }
        profileData.age = raw ? val : null;

    } else if (current.field === 'gender') {
        profileData.gender = document.getElementById('ps-gender').value || null;

    } else if (current.field === 'pic') {
        // pic is already stored via previewProfilePic()
    }

    const next = activeIndex + 1;
    if (next < ACTIVE_STEPS.length) {
        showProfileStep(next);
    } else {
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

function profileStepSkipByField(field) {
    const idx = ACTIVE_STEPS.findIndex(s => s.field === field);
    if (idx !== -1) profileStepSkip(idx);
}

function profileStepNextByField(field) {
    const idx = ACTIVE_STEPS.findIndex(s => s.field === field);
    if (idx !== -1) profileStepNext(idx);
}

// =====================================================================
// SECTION 8: ACTION HUB  ← NEW
// Handles the gear button expand/collapse and notification preview.
// =====================================================================

let hubOpen = false;
let notiPreviewLoaded = false;

/**
 * Toggle the hub open / closed.
 * Clicking outside the hub also closes it (document listener below).
 */
function toggleHub() {
    hubOpen = !hubOpen;
    document.getElementById('hub-trigger').classList.toggle('open', hubOpen);
    document.getElementById('hub-items').classList.toggle('open', hubOpen);

    // Lazy-load notification preview the first time hub opens
    if (hubOpen && !notiPreviewLoaded) {
        loadNotiPreview();
    }
}

/**
 * Close the hub when clicking anywhere outside it.
 */
document.addEventListener('click', function (e) {
    const hub = document.getElementById('action-hub');
    if (hub && !hub.contains(e.target) && hubOpen) {
        hubOpen = false;
        document.getElementById('hub-trigger').classList.remove('open');
        document.getElementById('hub-items').classList.remove('open');
    }
});

/**
 * Fetch the latest notifications and:
 *  1. Show the red dot if there are any pending (acceptance_status = 0).
 *  2. Populate the hover tooltip with the first ~55 chars of the newest message.
 */
async function loadNotiPreview() {
    notiPreviewLoaded = true;
    try {
        const res  = await fetch('/notifications');
        const data = await res.json();

        if (!data.success || !data.notifications || data.notifications.length === 0) {
            document.getElementById('noti-preview-tip').textContent = 'No notifications yet.';
            return;
        }

        const notifications = data.notifications;

        // Red dot — any pending invitation (acceptance_status === 0)
        const hasPending = notifications.some(n => n.acceptance_status === 0);
        if (hasPending) {
            document.getElementById('noti-dot').classList.add('active');
        }

        // Tooltip — first few words of the newest message (strip emoji lines, take the project name line)
        const newest     = notifications[0].message || '';
        // Grab text up to first newline after "📌 Project :" for a clean preview
        const lines      = newest.split('\n').map(l => l.trim()).filter(Boolean);
        const projectLine = lines.find(l => l.includes('📌')) || lines[1] || lines[0];
        const preview    = projectLine.replace('📌', '').replace('Project :', '').trim();
        const snippet    = preview.length > 55 ? preview.slice(0, 52) + '…' : preview;

        document.getElementById('noti-preview-tip').textContent =
            `🔔 ${notifications.length} notification${notifications.length > 1 ? 's' : ''} — ${snippet}`;

    } catch (err) {
        document.getElementById('noti-preview-tip').textContent = 'Could not load notifications.';
    }
}