import { useState, useMemo, useEffect } from 'react';
import useCalendarTasks from '../hooks/useCalendarTasks';
import useCalendarMeetings from '../hooks/useCalendarMeetings';
import useTaskSteps from '../hooks/useTaskSteps';
import MeetingMap from '../Components/MeetingMap';
import GirlPointer from '../Components/GirlPointer';
import CalendarHeader from '../Components/CalendarHeader';
import '../Calendar.css';
import '../CalendarPanel.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const IMPORTANCE_LABEL = { Low: 'Low', Medium: 'Medium', High: 'High' };

// Three "kinds" plotted on the grid and switchable via the secondary tabs.
// Dot color is keyed by KIND now (task/meeting/project), not by category —
// this is what keeps the grid, legend, switcher and badges all consistent.
const TASK_KINDS = [
  { key: 'personal', label: 'Personal tasks', dotClass: 'kind-dot-personal', live: true },
  { key: 'project', label: 'Project tasks', dotClass: 'kind-dot-project', live: false },
  { key: 'meeting', label: 'Meetings', dotClass: 'kind-dot-meeting', live: true },
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

function formatTimeOnly(raw) {
  if (!raw) return null;
  const d = new Date(raw.replace(' ', 'T'));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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

  // Secondary tab under the date title: which kind's list is showing.
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'project' | 'meeting'

  // When set, the right panel shows ONLY this one item (task or meeting)
  // instead of the day's full list — the "focused" detail mode.
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [focusedMeetingId, setFocusedMeetingId] = useState(null);

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

  const {
    meetingsByDate,
    loading: meetingsLoading,
    error: meetingsError,
    selectedMeeting,
    selectMeeting,
  } = useCalendarMeetings();

  const { steps, loading: stepsLoading, error: stepsError } = useTaskSteps(focusedTaskId);

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const today = todayKey();

  const selectedDayMeetings = selectedDate ? (meetingsByDate[selectedDate] || []) : [];

  // Reset tab + any focused item whenever the selected day changes, so you
  // never land on "Meetings" tab for a day that has none, or stay focused
  // on a task from a previously-selected day.
  useEffect(() => {
    setActiveTab('personal');
    setFocusedTaskId(null);
    setFocusedMeetingId(null);
  }, [selectedDate]);

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

  function handleFocusTask(taskId) {
    setStepsCollapsed(false);
    selectTask(taskId);
    setFocusedTaskId(taskId);
  }

  function handleFocusMeeting(meetingId) {
    selectMeeting(meetingId);
    setFocusedMeetingId(meetingId);
  }

  function backToList() {
    setFocusedTaskId(null);
    setFocusedMeetingId(null);
  }

  const dayHasAnyOfKind = {
    personal: selectedDayTasks.length > 0,
    project: false, // static/future, per TASK_KINDS
    meeting: selectedDayMeetings.length > 0,
  };

  return (
    <div className="cal-page">
      <div className="cal-page-veil" />

      <div className="cal-shell">
        <CalendarHeader />

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
            {(loading || meetingsLoading) ? (
              <div className="cal-grid-status">Loading…</div>
            ) : (error || meetingsError) ? (
              <div className="cal-grid-status cal-grid-status-error">{error || meetingsError}</div>
            ) : (
              <div className="cal-grid">
                {cells.map((cell, i) => {
                  if (!cell.inMonth) {
                    return <div key={i} className="cal-cell cal-cell-outside"><span className="cal-cell-day">{cell.day}</span></div>;
                  }

                  const dayTasks = tasksByDate[cell.dateKey] || [];
                  const dayMeetings = meetingsByDate[cell.dateKey] || [];
                  const hasItems = dayTasks.length > 0 || dayMeetings.length > 0;
                  const isToday = cell.dateKey === today;
                  const isSelected = cell.dateKey === selectedDate;

                  return (
                    <button
                      type="button"
                      key={i}
                      className={[
                        'cal-cell',
                        hasItems ? 'cal-cell-has-tasks' : '',
                        isToday ? 'cal-cell-today' : '',
                        isSelected ? 'cal-cell-selected' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => selectDate(cell.dateKey)}
                    >
                      <span className="cal-cell-day">{cell.day}</span>

                      {hasItems && (
                        <div className="cal-cell-dots">
                          {dayTasks.slice(0, 6).map((t) => (
                            <span key={`t-${t.id}`} className="cal-task-dot kind-dot-personal" title={t.task} />
                          ))}
                          {dayMeetings.slice(0, 6 - dayTasks.length).map((m) => (
                            <span key={`m-${m.id}`} className="cal-task-dot kind-dot-meeting" title={m.title} />
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

        {/* ---------------- RIGHT: legend (idle) OR list/focused readout ---------------- */}
        <aside className="cal-panel">
          {!selectedDate ? (
            <div className="cal-panel-idle">
              <GirlPointer kinds={TASK_KINDS} />
            </div>
          ) : (
            <div className="cal-panel-scroll">
              <header className="cal-panel-date-header">
                {(focusedTaskId || focusedMeetingId) ? (
                  <button type="button" className="cal-back-btn" onClick={backToList} title="Back to list">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span>Back</span>
                  </button>
                ) : (
                  <>
                    <span className="cal-panel-date-label">{formatDateLong(selectedDate)}</span>
                    <span className="cal-panel-count">
                      {selectedDayTasks.length + selectedDayMeetings.length} item{selectedDayTasks.length + selectedDayMeetings.length === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </header>

              {/* Secondary tabs — hidden once focused on a single item */}
              {!(focusedTaskId || focusedMeetingId) && (
                <div className="cal-kind-tabs">
                  {TASK_KINDS.map((k) => (
                    <button
                      type="button"
                      key={k.key}
                      className={`cal-kind-tab${activeTab === k.key ? ' active' : ''}${!k.live ? ' disabled' : ''}`}
                      onClick={() => k.live && setActiveTab(k.key)}
                      disabled={!k.live}
                      title={k.live ? k.label : `${k.label} — coming soon`}
                    >
                      <span className={`cal-kind-dot ${k.dotClass}`} />
                      {k.label}
                      {dayHasAnyOfKind[k.key] && <span className="cal-kind-tab-count">
                        {k.key === 'personal' ? selectedDayTasks.length : k.key === 'meeting' ? selectedDayMeetings.length : 0}
                      </span>}
                    </button>
                  ))}
                </div>
              )}

              {/* ---- LIST MODE: personal tasks tab ---- */}
              {!focusedTaskId && !focusedMeetingId && activeTab === 'personal' && (
                selectedDayTasks.length === 0 ? (
                  <div className="cal-panel-empty cal-panel-empty-inline"><p>No tasks due on this day.</p></div>
                ) : (
                  <div className="cal-panel-task-switcher">
                    {selectedDayTasks.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className="cal-switcher-chip kind-chip-personal"
                        onClick={() => handleFocusTask(t.id)}
                      >
                        <span className="cal-switcher-dot" />
                        <span className="cal-switcher-text">{t.task}</span>
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* ---- LIST MODE: meetings tab ---- */}
              {!focusedTaskId && !focusedMeetingId && activeTab === 'meeting' && (
                selectedDayMeetings.length === 0 ? (
                  <div className="cal-panel-empty cal-panel-empty-inline"><p>No meetings on this day.</p></div>
                ) : (
                  <div className="cal-panel-task-switcher">
                    {selectedDayMeetings.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        className="cal-switcher-chip kind-chip-meeting"
                        onClick={() => handleFocusMeeting(m.id)}
                      >
                        <span className="cal-switcher-dot" />
                        <span className="cal-switcher-text">{m.title}</span>
                      </button>
                    ))}
                  </div>
                )
              )}

              {/* ---- LIST MODE: project tab (static/empty for now) ---- */}
              {!focusedTaskId && !focusedMeetingId && activeTab === 'project' && (
                <div className="cal-panel-empty cal-panel-empty-inline"><p>Project tasks are coming soon.</p></div>
              )}

              {/* ---- FOCUSED MODE: single task detail ---- */}
              {focusedTaskId && selectedTask && (
                <div className="cal-task-detail">
                  <div className="cal-task-detail-top">
                    <span className="cal-cat-badge kind-chip-personal">
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

              {/* ---- FOCUSED MODE: single meeting detail ---- */}
              {focusedMeetingId && selectedMeeting && (
                <MeetingDetail meeting={selectedMeeting} />
              )}
            </div>
          )}
        </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * Focused detail view for one meeting — sibling to the task detail block
 * above but with meeting-shaped fields (time range, location/link, agenda,
 * and an embedded map when geocoding succeeded).
 */
function MeetingDetail({ meeting }) {
  const [agendaCollapsed, setAgendaCollapsed] = useState(false);
  const agendaItems = meeting.agenda_items || [];
  const hasMapPin = meeting.location_lat != null && meeting.location_lng != null;

  const startLabel = formatTimeOnly(meeting.start_time);
  const endLabel = meeting.end_time ? formatTimeOnly(meeting.end_time) : null;

  return (
    <div className="cal-task-detail">
      <div className="cal-task-detail-top">
        <span className="cal-cat-badge kind-chip-meeting">{meeting.related || 'Other'}</span>
        <span className={`cal-importance-badge cal-importance-${(meeting.importance || 'medium').toLowerCase()}`}>
          {IMPORTANCE_LABEL[meeting.importance] || meeting.importance}
        </span>
        {meeting.status === 'cancelled' && <span className="cal-importance-badge cal-importance-high">Cancelled</span>}
      </div>

      <h2 className="cal-task-title">{meeting.title}</h2>

      {meeting.description && <p className="cal-task-description">{meeting.description}</p>}

      <div className="cal-task-meta-row">
        <span className={`cal-status-dot ${meeting.status === 'completed' ? 'done' : 'pending'}`}></span>
        <span className="cal-task-meta-text">
          {startLabel}{endLabel ? ` – ${endLabel}` : ''}
        </span>
      </div>

      {(meeting.location_text || meeting.meeting_link) && (
        <p className="cal-task-description" style={{ marginTop: 4 }}>
          {meeting.location_text && <span>📍 {meeting.location_text}</span>}
          {meeting.meeting_link && (
            <>
              {meeting.location_text ? ' · ' : ''}
              <a href={meeting.meeting_link} target="_blank" rel="noreferrer">Join meeting →</a>
            </>
          )}
        </p>
      )}

      {/* Map is fetched responsively whenever coordinates resolved — no
          extra toggle needed here since focused mode already has room. */}
      {hasMapPin && (
        <MeetingMap lat={meeting.location_lat} lng={meeting.location_lng} label={meeting.location_text} />
      )}

      <div className="cal-steps-section">
        <button
          type="button"
          className="cal-steps-heading-row"
          onClick={() => setAgendaCollapsed((c) => !c)}
        >
          <h3 className="cal-steps-heading">Agenda {agendaItems.length > 0 && `(${agendaItems.length})`}</h3>
          <svg
            className={`cal-steps-chevron${agendaCollapsed ? ' collapsed' : ''}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {!agendaCollapsed && (
          agendaItems.length === 0 ? (
            <div className="cal-steps-status">No agenda items added.</div>
          ) : (
            <ul className="cal-steps-list">
              {agendaItems.map((item) => (
                <li key={item.id} className="cal-step-item">
                  <span className="cal-step-status-dot"></span>
                  <div className="cal-step-body">
                    <span className="cal-step-desc">
                      {item.description}{item.presenter ? ` — ${item.presenter}` : ''}
                    </span>
                    <span className="cal-step-difficulty">{item.duration_minutes ? `${item.duration_minutes}m` : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}