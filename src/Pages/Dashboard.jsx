import { useState } from 'react';
import TopNav from '../Components/TopNav';
import { DashHero } from '../Components/ProgressRing';
import StatsRow from '../Components/StatsRow';
import TaskForm from '../Components/TaskForm';
import TaskList from '../Components/TaskList';
import ProgressRing from '../Components/ProgressRing';
import CategoryBreakdown from '../Components/CategoryBreakdown';
import EmailVerifyPopup from '../Components/EmailVerifyPopup';
import ProfileSetupPopup from '../Components/ProfileSetupPopup';
import { useDashboardData } from '../hooks/useDashboardData';
import { usePrompts } from '../hooks/usePrompts';
import '../dashboard.css';

/**
 * Top-level dashboard page — the React equivalent of homepage.html +
 * homepage.js's DOMContentLoaded boot sequence. Replaces:
 *   - loadDashboard() / loadNotiPreview() calls on boot -> handled inside
 *     useDashboardData() / useNotifications() (the latter lives inside
 *     TopNav) firing on mount instead.
 *   - handlePromptClick() -> openEmailVerify / openProfileSetup below.
 *   - removePromptButton() -> dismissPrompt() from usePrompts(), called
 *     from each popup's onVerified/onComplete callback.
 */
export default function Dashboard() {
  const { tasks, loading, error, stats, completeTask, addTaskLocal } = useDashboardData();
  const { username, profilePic, prompts, missingFields, dismissPrompt } = usePrompts();

  const [emailPopupOpen, setEmailPopupOpen] = useState(false);
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);

  function handlePromptClick(promptText) {
    if (promptText.includes('Verify Email')) {
      setEmailPopupOpen(true);
    } else if (promptText.includes('Setup Profile')) {
      setProfilePopupOpen(true);
    }
  }

  return (
    <>
      {/* Decorative HUD chrome (2100 atmosphere only — no logic) */}
      <div className="hud-corner tl" aria-hidden="true"></div>
      <div className="hud-corner tr" aria-hidden="true"></div>
      <div className="hud-corner bl" aria-hidden="true"></div>
      <div className="hud-corner br" aria-hidden="true"></div>

      <TopNav
        username={username}
        profilePic={profilePic}
        prompts={prompts}
        onPromptClick={handlePromptClick}
      />

      <div className="dash-container">
        <DashHero pendingCount={stats.pendingCount} />

        <StatsRow stats={stats} />

        <div className="dash-grid reveal">
          <div className="dash-main">
            <TaskForm onTaskAdded={addTaskLocal} />
            <TaskList tasks={tasks} loading={loading} error={error} onComplete={completeTask} />
          </div>

          <div className="dash-side">
            <ProgressRing completedCount={stats.completedCount} totalCount={stats.countAll} />
            <div className="panel">
              <CategoryBreakdown tasks={tasks} />
            </div>
          </div>
        </div>
      </div>

      <EmailVerifyPopup
        isOpen={emailPopupOpen}
        onClose={() => setEmailPopupOpen(false)}
        onVerified={() => dismissPrompt('Verify Email')}
      />

      <ProfileSetupPopup
        isOpen={profilePopupOpen}
        onClose={() => setProfilePopupOpen(false)}
        missingFields={missingFields}
        onComplete={() => dismissPrompt('Setup Profile')}
      />
    </>
  );
}