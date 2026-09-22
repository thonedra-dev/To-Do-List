import { useState } from 'react';
import { apiPostForm } from '../api';
import DatePicker from './DatePicker';

const EMPTY_STEP_DRAFT = { desc: '', difficulty: 'Easy' };
const EMPTY_AGENDA_DRAFT = { desc: '', duration: '', presenter: '' };

function combineDateTime(dateIso, time) {
  if (!dateIso || !time) return null;
  return `${dateIso} ${time}:00`; // MySQL DATETIME format
}

/**
 * Add New Task / Add New Meeting panel (formerly TaskForm.jsx).
 * A reload icon next to the heading toggles `mode` between 'task' and
 * 'meeting', swapping both the title and the field set below it.
 *
 * Task mode: unchanged behavior from the original TaskForm, posts to
 * /add_task, calls onTaskAdded(task).
 *
 * Meeting mode: posts to /add_meeting, calls onMeetingAdded(meeting) if
 * provided (optional — a meetings list isn't wired up on the dashboard
 * yet, so this is safe to omit for now).
 */
export default function InputForm({ onTaskAdded, onMeetingAdded }) {
  const [mode, setMode] = useState('task'); // 'task' | 'meeting'

  // ---------- shared ----------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('Medium');
  const [related, setRelated] = useState('Other');
  const [resetSignal, setResetSignal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  // ---------- task-only ----------
  const [dueDate, setDueDate] = useState(null);
  const [stepDraft, setStepDraft] = useState(EMPTY_STEP_DRAFT);
  const [pendingSteps, setPendingSteps] = useState([]);

  // ---------- meeting-only ----------
  const [locationType, setLocationType] = useState('physical'); // physical | virtual | hybrid
  const [locationText, setLocationText] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState(null);
  const [endTime, setEndTime] = useState('');
  const [projectMeeting, setProjectMeeting] = useState(false);
  const [agendaDraft, setAgendaDraft] = useState(EMPTY_AGENDA_DRAFT);
  const [pendingAgendaItems, setPendingAgendaItems] = useState([]);

  const showLocationText = locationType === 'physical' || locationType === 'hybrid';
  const showMeetingLink = locationType === 'virtual' || locationType === 'hybrid';

  function toggleMode() {
    setMode((prev) => (prev === 'task' ? 'meeting' : 'task'));
    setFormMsg('');
  }

  function addStepToList() {
    const desc = stepDraft.desc.trim();
    if (!desc) return;
    setPendingSteps((prev) => [...prev, { desc, difficulty: stepDraft.difficulty }]);
    setStepDraft((prev) => ({ ...prev, desc: '' }));
  }

  function addAgendaItemToList() {
    const desc = agendaDraft.desc.trim();
    if (!desc) return;
    setPendingAgendaItems((prev) => [
      ...prev,
      { desc, duration: agendaDraft.duration, presenter: agendaDraft.presenter },
    ]);
    setAgendaDraft((prev) => ({ ...prev, desc: '', duration: '', presenter: '' }));
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setImportance('Medium');
    setRelated('Other');
    setFormMsg('');
    setResetSignal((n) => n + 1);

    // task fields
    setDueDate(null);
    setPendingSteps([]);
    setStepDraft(EMPTY_STEP_DRAFT);

    // meeting fields
    setLocationType('physical');
    setLocationText('');
    setMeetingLink('');
    setStartDate(null);
    setStartTime('');
    setEndDate(null);
    setEndTime('');
    setProjectMeeting(false);
    setPendingAgendaItems([]);
    setAgendaDraft(EMPTY_AGENDA_DRAFT);
  }

  async function handleTaskSubmit() {
    const formData = new FormData();
    formData.append('task', title);
    formData.append('description', description);
    formData.append('importance', importance);
    formData.append('related', related);
    if (dueDate) formData.append('due_date', dueDate);

    const allSteps = [...pendingSteps];
    if (stepDraft.desc.trim()) {
      allSteps.push({ desc: stepDraft.desc.trim(), difficulty: stepDraft.difficulty });
    }
    allSteps.forEach((step) => {
      formData.append('steps[]', `${step.desc}|${step.difficulty}`);
    });

    const data = await apiPostForm('/add_task', formData);
    if (data.success) {
      onTaskAdded?.(data.task);
      resetForm();
    } else {
      setFormMsg(data.message || 'Could not add task.');
    }
  }

  async function handleMeetingSubmit() {
    if (!startDate || !startTime) {
      setFormMsg('Start date and time are required.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location_type', locationType);
    if (showLocationText) formData.append('location_text', locationText);
    if (showMeetingLink) formData.append('meeting_link', meetingLink);
    formData.append('start_time', combineDateTime(startDate, startTime));
    const endCombined = combineDateTime(endDate, endTime);
    if (endCombined) formData.append('end_time', endCombined);
    formData.append('importance', importance);
    formData.append('related', related);
    formData.append('project_meeting', projectMeeting ? 'true' : 'false');

    const allAgendaItems = [...pendingAgendaItems];
    if (agendaDraft.desc.trim()) {
      allAgendaItems.push({
        desc: agendaDraft.desc.trim(),
        duration: agendaDraft.duration,
        presenter: agendaDraft.presenter,
      });
    }
    allAgendaItems.forEach((item) => {
      formData.append('agenda_items[]', `${item.desc}|${item.duration || ''}|${item.presenter || ''}`);
    });

    const data = await apiPostForm('/add_meeting', formData);
    if (data.success) {
      onMeetingAdded?.(data.meeting);
      resetForm();
    } else {
      setFormMsg(data.message || 'Could not add meeting.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setFormMsg('');
    try {
      if (mode === 'task') {
        await handleTaskSubmit();
      } else {
        await handleMeetingSubmit();
      }
    } catch {
      setFormMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{mode === 'task' ? 'Add New Task' : 'Add New Meeting'}</h2>
        <button
          type="button"
          className="nav-icon-btn"
          title={mode === 'task' ? 'Switch to Meeting' : 'Switch to Task'}
          onClick={toggleMode}
          style={{ marginLeft: 8 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
        <span className="panel-hint">
          {mode === 'task' ? 'What needs to be done?' : 'What are we meeting about?'}
        </span>
      </div>

      <form className="task-form" onSubmit={handleSubmit}>
        <input
          className="field-input"
          type="text"
          placeholder={mode === 'task' ? 'Task title...' : 'Meeting title...'}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="field-textarea"
          placeholder="Add a description (optional)..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {mode === 'task' ? (
          <>
            <div className="composer-row">
              <div className="select-field" id="priority-select-field">
                <span className="priority-dot" data-level={importance}></span>
                <select value={importance} onChange={(e) => setImportance(e.target.value)}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>

              <div className="select-field">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
                <select value={related} onChange={(e) => setRelated(e.target.value)}>
                  <option value="Work">Work</option>
                  <option value="Study">Study</option>
                  <option value="Personal">Personal</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <DatePicker value={dueDate} onChange={setDueDate} resetSignal={resetSignal} />
            </div>

            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Add a step (optional)..."
                  style={{ flex: 1 }}
                  value={stepDraft.desc}
                  onChange={(e) => setStepDraft((prev) => ({ ...prev, desc: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addStepToList();
                    }
                  }}
                />
                <select
                  className="field-input"
                  style={{ width: 120 }}
                  value={stepDraft.difficulty}
                  onChange={(e) => setStepDraft((prev) => ({ ...prev, difficulty: e.target.value }))}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
                <button type="button" className="btn btn-secondary" onClick={addStepToList}>
                  + Add
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {pendingSteps.map((step, i) => (
                  <div key={i} className="badge badge-cat" style={{ justifyContent: 'space-between' }}>
                    <span>{step.desc} · {step.difficulty}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="composer-row">
              <div className="select-field" id="priority-select-field">
                <span className="priority-dot" data-level={importance}></span>
                <select value={importance} onChange={(e) => setImportance(e.target.value)}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>

              <div className="select-field">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
                <select value={related} onChange={(e) => setRelated(e.target.value)}>
                  <option value="Work">Work</option>
                  <option value="Study">Study</option>
                  <option value="Personal">Personal</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="select-field">
                <select value={locationType} onChange={(e) => setLocationType(e.target.value)}>
                  <option value="physical">Physical</option>
                  <option value="virtual">Virtual</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {showLocationText && (
              <input
                className="field-input"
                type="text"
                placeholder="Address (e.g. 12 Jalan Merdeka, Alor Setar)"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                style={{ marginTop: 10 }}
              />
            )}

            {showMeetingLink && (
              <input
                className="field-input"
                type="text"
                placeholder="Meeting link (Zoom / Meet / Teams)"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                style={{ marginTop: 10 }}
              />
            )}

            <div className="composer-row" style={{ marginTop: 10 }}>
              <DatePicker value={startDate} onChange={setStartDate} resetSignal={resetSignal} />
              <input
                className="field-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: 130 }}
              />
              <span className="panel-hint" style={{ alignSelf: 'center' }}>start</span>
            </div>

            <div className="composer-row" style={{ marginTop: 8 }}>
              <DatePicker value={endDate} onChange={setEndDate} resetSignal={resetSignal} />
              <input
                className="field-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: 130 }}
              />
              <span className="panel-hint" style={{ alignSelf: 'center' }}>end (optional)</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={projectMeeting}
                onChange={(e) => setProjectMeeting(e.target.checked)}
              />
              This is a project meeting
            </label>

            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Add an agenda item (optional)..."
                  style={{ flex: 1 }}
                  value={agendaDraft.desc}
                  onChange={(e) => setAgendaDraft((prev) => ({ ...prev, desc: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAgendaItemToList();
                    }
                  }}
                />
                <input
                  className="field-input"
                  type="number"
                  placeholder="Mins"
                  style={{ width: 80 }}
                  value={agendaDraft.duration}
                  onChange={(e) => setAgendaDraft((prev) => ({ ...prev, duration: e.target.value }))}
                />
                <input
                  className="field-input"
                  type="text"
                  placeholder="Presenter"
                  style={{ width: 140 }}
                  value={agendaDraft.presenter}
                  onChange={(e) => setAgendaDraft((prev) => ({ ...prev, presenter: e.target.value }))}
                />
                <button type="button" className="btn btn-secondary" onClick={addAgendaItemToList}>
                  + Add
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {pendingAgendaItems.map((item, i) => (
                  <div key={i} className="badge badge-cat" style={{ justifyContent: 'space-between' }}>
                    <span>
                      {item.desc}
                      {item.duration ? ` · ${item.duration}m` : ''}
                      {item.presenter ? ` · ${item.presenter}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="form-actions">
          <span className="form-msg">{formMsg}</span>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>Clear</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : mode === 'task' ? 'Add Task' : 'Add Meeting'}
          </button>
        </div>
      </form>
    </section>
  );
}