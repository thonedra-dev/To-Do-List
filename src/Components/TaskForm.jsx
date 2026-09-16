import { useState } from 'react';
import { apiPostForm } from '../api';
import DatePicker from './DatePicker';

const EMPTY_STEP_DRAFT = { desc: '', difficulty: 'Easy' };

/**
 * Add New Task panel — title, description, priority, category, due date,
 * and the "steps builder" (queue steps locally, submit them all with the
 * task in one POST /add_task).
 *
 * `onTaskAdded(task)` is called with the task object the backend returns,
 * so the parent can prepend it to the task list without a full refetch —
 * same behavior as the original inline JS.
 */
export default function TaskForm({ onTaskAdded }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState('Medium');
  const [related, setRelated] = useState('Other');
  const [dueDate, setDueDate] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);

  const [stepDraft, setStepDraft] = useState(EMPTY_STEP_DRAFT);
  const [pendingSteps, setPendingSteps] = useState([]); // { desc, difficulty }[]

  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  function addStepToList() {
    const desc = stepDraft.desc.trim();
    if (!desc) return;
    setPendingSteps((prev) => [...prev, { desc, difficulty: stepDraft.difficulty }]);
    setStepDraft((prev) => ({ ...prev, desc: '' }));
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setImportance('Medium');
    setRelated('Other');
    setDueDate(null);
    setPendingSteps([]);
    setStepDraft(EMPTY_STEP_DRAFT);
    setFormMsg('');
    setResetSignal((n) => n + 1); // tells DatePicker to snap back to current month
  }

  // ✅ AFTER
async function handleSubmit(e) {
  e.preventDefault();
  if (!title.trim()) return;

  setSubmitting(true);
  setFormMsg('');

  const formData = new FormData();
  formData.append('task', title);
  formData.append('description', description);
  formData.append('importance', importance);
  formData.append('related', related);
  if (dueDate) formData.append('due_date', dueDate);

  // Include any un-added active step draft
  const allSteps = [...pendingSteps];
  if (stepDraft.desc.trim()) {
    allSteps.push({ desc: stepDraft.desc.trim(), difficulty: stepDraft.difficulty });
  }

  allSteps.forEach((step) => {
    formData.append('steps[]', `${step.desc}|${step.difficulty}`);
  });

    try {
      const data = await apiPostForm('/add_task', formData);
      if (data.success) {
        onTaskAdded?.(data.task);
        resetForm();
      } else {
        setFormMsg(data.message || 'Could not add task.');
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
        <h2>Add New Task</h2>
        <span className="panel-hint">What needs to be done?</span>
      </div>

      <form className="task-form" id="taskForm" onSubmit={handleSubmit}>
        <input
          className="field-input"
          type="text"
          name="task"
          placeholder="Task title..."
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="field-textarea"
          name="description"
          placeholder="Add a description (optional)..."
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="composer-row">
          <div className="select-field" id="priority-select-field">
            <span className="priority-dot" id="priority-dot" data-level={importance}></span>
            <select
              name="importance"
              id="importance"
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>

          <div className="select-field">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
            <select name="related" id="related" value={related} onChange={(e) => setRelated(e.target.value)}>
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
              id="step_description"
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
              id="difficulty"
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

          <div id="stepList" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {pendingSteps.map((step, i) => (
              <div key={i} className="badge badge-cat" style={{ justifyContent: 'space-between' }}>
                <span>{step.desc} · {step.difficulty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <span className="form-msg" id="task-form-msg">{formMsg}</span>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>Clear</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </form>
    </section>
  );
}