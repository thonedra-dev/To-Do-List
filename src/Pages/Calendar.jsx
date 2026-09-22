import { useState, useMemo } from 'react';
import useCalendarTasks from '../hooks/useCalendarTasks';
import useTaskSteps from '../hooks/useTaskSteps';
import '../Calendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const IMPORTANCE_LABEL = { Low: 'Low', Medium: 'Medium', High: 'High' };

// The three task "kinds" shown as the legend / filter dots on the right.
// Only 'personal' is wired to real backend data right now — project and
// meeting are static/future, exactly as requested.
const TASK_KINDS = [
  { key: 'personal', label: 'Personal tasks', dotClass: 'kind-dot-personal', live: true },
  { key: 'project', label: 'Project tasks', dotClass: 'kind-dot-project', live: false },
  { key: 'meeting', label: 'Meetings', dotClass: 'kind-dot-meeting', live: false },
];

function toDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function todayKey() {
  const t = new Date();
  return toDateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function formatDateLong(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Builds a flat array of cells for a month grid: leading/trailing blanks
 * from adjacent months (rendered dim, unclickable) plus the real days.
 */
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, inMonth: false, dateKey: null });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, inMonth: true, dateKey: toDateKey(year, month, day) });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startWeekday + daysInMonth) + 1;
    cells.push({ day: nextDay, inMonth: false, dateKey: null });
  }

  return cells;
}

export default function Calendar() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [stepsCollapsed, setStepsCollapsed] = useState(false);

  const {
    tasksByDate,
    loading,
    error,
    selectedDate,
    selectedDayTasks,
    selectedTaskId,
    selectedTask,
    selectDate,
    selectTask,
  } = useCalendarTasks();

  const { steps, loading: stepsLoading, error: stepsError } = useTaskSteps(selectedTaskId);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = todayKey();

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    selectDate(today);
  }

  function handleSelectTask(taskId) {
    setStepsCollapsed(false);
    selectTask(taskId);
  }

  return (
    <div className="cal-page">
      <div className="cal-page-veil" />

      <div className="cal-layout">
        {/* ---------------- LEFT: calendar grid (self-scrolling) ---------------- */}
        <section className="cal-main">
          <header className="cal-toolbar">
            <div className="cal-toolbar-title">
              <span className="cal-month-name">{MONTH_NAMES[viewMonth]}</span>
              <span className="cal-year">{viewYear}</span>
            </div>

            <div className="cal-toolbar-actions">
              <button type="button" className="cal-nav-btn" onClick={goPrevMonth} title="Previous month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <button type="button" className="cal-today-btn" onClick={goToday}>Today</button>
              <button type="button" className="cal-nav-btn" onClick={goNextMonth} title="Next month">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          </header>

          <div className="cal-weekday-row">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="cal-weekday-label">{w}</div>
            ))}
          </div>

          <div className="cal-grid-scroll">
            {loading ? (
              <div className="cal-grid-status">Loading tasks…</div>
            ) : error ? (
              <div className="cal-grid-status cal-grid-status-error">{error}</div>
            ) : (
              <div className="cal-grid">
                {cells.map((cell, i) => {
                  if (!cell.inMonth) {
                    return <div key={i} className="cal-cell cal-cell-outside"><span className="cal-cell-day">{cell.day}</span></div>;
                  }

                  const dayTasks = tasksByDate[cell.dateKey] || [];
                  const hasTasks = dayTasks.length > 0;
                  const isToday = cell.dateKey === today;
                  const isSelected = cell.dateKey === selectedDate;

                  return (
                    <button
                      type="button"
                      key={i}
                      className={[
                        'cal-cell',
                        hasTasks ? 'cal-cell-has-tasks' : '',
                        isToday ? 'cal-cell-today' : '',
                        isSelected ? 'cal-cell-selected' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => selectDate(cell.dateKey)}
                    >
                      <span className="cal-cell-day">{cell.day}</span>

                      {hasTasks && (
                        <div className="cal-cell-dots">
                          {dayTasks.slice(0, 6).map((t) => (
                            <span
                              key={t.id}
                              className={`cal-task-dot cal-cat-${(t.related || 'other').toLowerCase()}`}
                              title={t.task}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ---------------- RIGHT: legend (idle state) OR detail readout ---------------- */}
        <aside className="cal-panel">
          {!selectedDate ? (
            <div className="cal-panel-empty cal-panel-empty-idle">
              <div className="cal-kind-legend">
                {TASK_KINDS.map((k) => (
                  <div key={k.key} className={`cal-kind-item${k.live ? '' : ' static'}`} title={k.live ? k.label : `${k.label} — coming soon`}>
                    <span className={`cal-kind-dot ${k.dotClass}`} />
                    <span className="cal-kind-label">{k.label}</span>
                    {!k.live && <span className="cal-kind-soon">soon</span>}
                  </div>
                ))}
              </div>

              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <p>Pick a day on the calendar to see what's due.</p>
            </div>
          ) : (
            <div className="cal-panel-scroll">
              <header className="cal-panel-date-header">
                <span className="cal-panel-date-label">{formatDateLong(selectedDate)}</span>
                <span className="cal-panel-count">
                  {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'task' : 'tasks'}
                </span>
              </header>

              {selectedDayTasks.length === 0 && (
                <div className="cal-panel-empty cal-panel-empty-inline">
                  <p>Nothing due on this day.</p>
                </div>
              )}

              {selectedDayTasks.length > 1 && (
                <div className="cal-panel-task-switcher">
                  {selectedDayTasks.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      className={`cal-switcher-chip cal-cat-${(t.related || 'other').toLowerCase()}${t.id === selectedTaskId ? ' active' : ''}`}
                      onClick={() => handleSelectTask(t.id)}
                    >
                      <span className="cal-switcher-dot" />
                      <span className="cal-switcher-text">{t.task}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedTask && (
                <div className="cal-task-detail">
                  <div className="cal-task-detail-top">
                    <span className={`cal-cat-badge cal-cat-${(selectedTask.related || 'other').toLowerCase()}`}>
                      {selectedTask.related || 'Other'}
                    </span>
                    <span className={`cal-importance-badge cal-importance-${(selectedTask.importance || 'medium').toLowerCase()}`}>
                      {IMPORTANCE_LABEL[selectedTask.importance] || selectedTask.importance}
                    </span>
                  </div>

                  <h2 className="cal-task-title">{selectedTask.task}</h2>

                  {selectedTask.description && (
                    <p className="cal-task-description">{selectedTask.description}</p>
                  )}

                  <div className="cal-task-meta-row">
                    <span className={`cal-status-dot ${selectedTask.completed ? 'done' : 'pending'}`}></span>
                    <span className="cal-task-meta-text">
                      {selectedTask.completed ? 'Completed' : 'Not completed yet'}
                    </span>
                  </div>

                  <div className="cal-steps-section">
                    <button
                      type="button"
                      className="cal-steps-heading-row"
                      onClick={() => setStepsCollapsed((c) => !c)}
                    >
                      <h3 className="cal-steps-heading">Steps {steps.length > 0 && `(${steps.length})`}</h3>
                      <svg
                        className={`cal-steps-chevron${stepsCollapsed ? ' collapsed' : ''}`}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>

                    {!stepsCollapsed && (
                      <>
                        {stepsLoading && <div className="cal-steps-status">Loading steps…</div>}
                        {stepsError && <div className="cal-steps-status cal-steps-status-error">{stepsError}</div>}

                        {!stepsLoading && !stepsError && steps.length === 0 && (
                          <div className="cal-steps-status">This task has no steps yet.</div>
                        )}

                        {!stepsLoading && !stepsError && steps.length > 0 && (
                          <ul className="cal-steps-list">
                            {steps.map((s) => (
                              <li key={s.sid} className={`cal-step-item${s.status ? ' done' : ''}`}>
                                <span className="cal-step-status-dot"></span>
                                <div className="cal-step-body">
                                  <span className="cal-step-desc">{s.step_description}</span>
                                  <span className={`cal-step-difficulty cal-diff-${(s.difficulty || '').toLowerCase()}`}>
                                    {s.difficulty}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}