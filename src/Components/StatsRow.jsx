/**
 * The four-card stat row at the top of the dashboard.
 * Purely presentational — Dashboard.jsx (Wave 3) will pass in the
 * `stats` object already computed by useDashboardData().
 */
export default function StatsRow({ stats }) {
  const { pendingCount = 0, dueTodayCount = 0, completedCount = 0, overdueCount = 0 } = stats;

  return (
    <div className="stat-row reveal">
      <div className="stat-card">
        <div className="stat-icon tone-accent">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
        <div>
          <div className="stat-value" id="stat-pending">{pendingCount}</div>
          <div className="stat-label">Pending Tasks</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon tone-warning">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        <div>
          <div className="stat-value" id="stat-due-today">{dueTodayCount}</div>
          <div className="stat-label">Due Today</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon tone-success">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div>
          <div className="stat-value" id="stat-completed">{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon tone-danger">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div>
          <div className="stat-value" id="stat-overdue">{overdueCount}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>
    </div>
  );
}