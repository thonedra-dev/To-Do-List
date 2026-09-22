import { useMemo, useState } from 'react';
import Modal from './Modal';
import { apiPostForm } from '../api';

const ALL_STEPS = [
  { id: 'profileStep1', field: 'position' },
  { id: 'profileStep2', field: 'age' },
  { id: 'profileStep3', field: 'gender' },
  { id: 'profileStep4', field: 'pic' },
];

const EMPTY_DATA = { position: null, age: null, gender: null, pic: null };

/**
 * Profile Setup popup — multi-step, only showing steps for fields the
 * user is actually missing (falls back to all 4 if none are missing, same
 * as `if (ACTIVE_STEPS.length === 0) ACTIVE_STEPS = ALL_STEPS;`).
 *
 * `missingFields` comes from usePrompts() (was MISSING_FIELDS, previously
 * read off a data attribute — now fetched via /home_data).
 * `onComplete()` fires once saved, so the parent can dismiss the
 * "Setup Profile 🛠️" prompt bubble.
 */
export default function ProfileSetupPopup({ isOpen, onClose, missingFields, onComplete }) {
  const activeSteps = useMemo(() => {
    const filtered = ALL_STEPS.filter((s) => missingFields.includes(s.field));
    return filtered.length > 0 ? filtered : ALL_STEPS;
  }, [missingFields]);

  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [profileData, setProfileData] = useState(EMPTY_DATA);

  const [positionInput, setPositionInput] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [picFile, setPicFile] = useState(null);
  const [picPreview, setPicPreview] = useState(null);

  function resetAll() {
    setStepIndex(0);
    setDone(false);
    setProfileData(EMPTY_DATA);
    setPositionInput('');
    setAgeInput('');
    setSelectedGender('');
    setPicFile(null);
    setPicPreview(null);
  }

  function handleClose() {
    resetAll();
    onClose();
  }

  function goToStep(idx) {
    if (idx < activeSteps.length) {
      setStepIndex(idx);
    } else {
      submitProfileSetup();
    }
  }

  function handleSkip() {
    const current = activeSteps[stepIndex];
    setProfileData((prev) => ({ ...prev, [current.field]: null }));
    goToStep(stepIndex + 1);
  }

  // ✅ AFTER
function handleNext() {
  const current = activeSteps[stepIndex];
  let updatedData = { ...profileData };

  if (current.field === 'position') {
    updatedData.position = positionInput.trim() || null;
  } else if (current.field === 'age') {
    const raw = ageInput.trim();
    const val = parseInt(raw, 10);
    if (raw && (isNaN(val) || val < 1 || val > 120)) {
      window.alert('Please enter a valid age between 1 and 120.');
      return;
    }
    updatedData.age = raw ? val : null;
  } else if (current.field === 'gender') {
    updatedData.gender = selectedGender || null;
  }

  setProfileData(updatedData);

  if (stepIndex + 1 < activeSteps.length) {
    setStepIndex(stepIndex + 1);
  } else {
    submitProfileSetup(updatedData);
  }
}

async function submitProfileSetup(finalData = profileData) {
  const formData = new FormData();
  if (finalData.position) formData.append('position', finalData.position);
  if (finalData.age) formData.append('age', finalData.age);
  if (finalData.gender) formData.append('gender', finalData.gender);
  if (picFile) formData.append('profile_pic', picFile);

  try {
    const data = await apiPostForm('/save_profile_setup', formData);
    if (data.success) {
      setDone(true);
      onComplete?.();
    } else {
      window.alert('Error saving profile: ' + (data.message || 'Unknown error'));
    }
  } catch {
    window.alert('Network error while saving profile. Please try again.');
  }
}

  function handlePicChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPicPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function submitProfileSetup() {
    const formData = new FormData();
    if (profileData.position) formData.append('position', profileData.position);
    if (profileData.age) formData.append('age', profileData.age);
    if (profileData.gender) formData.append('gender', profileData.gender);
    if (picFile) formData.append('profile_pic', picFile);

    try {
      const data = await apiPostForm('/save_profile_setup', formData);
      if (data.success) {
        setDone(true);
        onComplete?.();
      } else {
        window.alert('Error saving profile: ' + (data.message || 'Unknown error'));
      }
    } catch {
      window.alert('Network error while saving profile. Please try again.');
    }
  }

  const pct = Math.round((stepIndex / activeSteps.length) * 100);
  const currentField = activeSteps[stepIndex]?.field;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="setup-step-bar">
        <div
          className="setup-step-bar-inner"
          id="profileStepBar"
          style={{ width: done ? '100%' : `${pct}%` }}
        ></div>
      </div>
      <div className="setup-step-label" id="profileStepLabel">
        {done ? 'Complete!' : `Step ${stepIndex + 1} of ${activeSteps.length}`}
      </div>

      {!done && currentField === 'position' && (
        <div id="profileStep1">
          <div className="popup-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <h3>What's your role? 💼</h3>
          </div>
          <p className="setup-description">Let us know your position or job title so we can personalize your experience.</p>
          <input
            type="text"
            id="ps-position"
            className="setup-input"
            placeholder="e.g. Software Engineer, Student, Manager..."
            value={positionInput}
            onChange={(e) => setPositionInput(e.target.value)}
          />
          <div className="popup-buttons">
            <button type="button" className="btn-secondary" onClick={handleSkip}>Skip</button>
            <button type="button" className="btn-primary" onClick={handleNext}>Next</button>
          </div>
        </div>
      )}

      {!done && currentField === 'age' && (
        <div id="profileStep2">
          <div className="popup-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <h3>How old are you? 🎂</h3>
          </div>
          <p className="setup-description">Your age helps us tailor relevant tips and reminders.</p>
          <input
            type="number"
            id="ps-age"
            className="setup-input"
            placeholder="Enter your age..."
            min={1}
            max={120}
            value={ageInput}
            onChange={(e) => setAgeInput(e.target.value)}
          />
          <div className="popup-buttons">
            <button type="button" className="btn-secondary" onClick={handleSkip}>Skip</button>
            <button type="button" className="btn-primary" onClick={handleNext}>Next</button>
          </div>
        </div>
      )}

      {!done && currentField === 'gender' && (
        <div id="profileStep3">
          <div className="popup-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 20c0-4 4-7 8-7s8 3 8 7"></path>
            </svg>
            <h3>Your Gender 🧬</h3>
          </div>
          <p className="setup-description">Optional — only used for personalizing greetings.</p>
          <div className="gender-options">
            {['Male', 'Female', 'Other'].map((g) => (
              <button
                key={g}
                type="button"
                className={`gender-btn${selectedGender === g ? ' selected' : ''}`}
                data-value={g}
                onClick={() => setSelectedGender(g)}
              >
                {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '🌈 Other'}
              </button>
            ))}
          </div>
          <input type="hidden" id="ps-gender" value={selectedGender} readOnly />
          <div className="popup-buttons">
            <button type="button" className="btn-secondary" onClick={handleSkip}>Skip</button>
            <button type="button" className="btn-primary" onClick={handleNext}>Next</button>
          </div>
        </div>
      )}

      {!done && currentField === 'pic' && (
        <div id="profileStep4">
          <div className="popup-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <h3>Profile Picture 📸</h3>
          </div>
          <p className="setup-description">Upload a photo to personalize your profile.</p>
          <div className="pic-upload-area" onClick={() => document.getElementById('ps-pic-input').click()}>
            <div id="pic-preview-wrap">
              {!picPreview && (
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" id="pic-placeholder-icon">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              )}
              {picPreview && (
                <img
                  id="pic-preview-img"
                  src={picPreview}
                  alt=""
                  style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
            </div>
            <p className="pic-upload-hint">Click to choose an image</p>
          </div>
          <input
            type="file"
            id="ps-pic-input"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePicChange}
          />
          <div className="popup-buttons">
            <button type="button" className="btn-secondary" onClick={handleSkip}>Skip</button>
            <button type="button" className="btn-primary" onClick={handleNext}>Save & Finish</button>
          </div>
        </div>
      )}

      {done && (
        <div id="profileStepDone">
          <div className="setup-success-icon">🎉</div>
          <h3 className="setup-success-title">Profile Setup Complete!</h3>
          <p className="setup-description">Your profile has been updated. You're all set!</p>
          <div className="popup-buttons">
            <button type="button" className="btn-primary" onClick={handleClose}>Let's Go 🚀</button>
          </div>
        </div>
      )}
    </Modal>
  );
}