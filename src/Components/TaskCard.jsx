import { useState } from 'react';
import { CATEGORY_DOT_VAR } from '../api';
import { taskDueBucket } from '../hooks/useDashboardData';

/**
 * One task row. JSX escapes text content by default, so all the old
 * escapeHtml() calls from taskCardHtml() simply aren't needed anymore.
 */
export default function TaskCard({ task, onComplete }) {
  const [stepsOpen, setStepsOpen] = useState(false);

  const bucket = taskDueBucket(task);
  const isOverdue = bucket === 'overdue';
  // ✅ AFTER
const formatDueDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const dueLabel = task.due_date
  ? bucket === 'today'
    ? 'Today'
    : formatDueDate(task.due_date)
  : null;
  
  const steps = task.steps || [];

  return (
    <article
      className={`task-item${task.completed ? ' is-done' : ''}`}
      data-priority={task.importance || 'Low'}
      data-id={task.id}
    >
      <button
        type="button"
        className="task-check"
        title="Mark complete"
        onClick={() => onComplete(task.id)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

      <div className="task-body">
        <div className="task-title-row">
          <div className="task-title">{task.task}</div>
        </div>

        {task.description && <div className="task-desc">{task.description}</div>}

        <div className="task-badges">
          <span className={`badge badge-priority ${task.importance || 'Low'}`}>
            {task.importance || 'Low'}
          </span>
          <span className="badge badge-cat">
            <span
              className="cat-dot"
              style={{ background: CATEGORY_DOT_VAR[task.related] || CATEGORY_DOT_VAR.Other }}
            ></span>
            {task.related || 'Other'}
          </span>
          {dueLabel && (
            <span className={`badge badge-date${isOverdue ? ' is-overdue' : ''}`}>
              {isOverdue ? 'Overdue' : dueLabel}
            </span>
          )}
          {steps.length > 0 && (
            <button
              type="button"
              className="badge badge-cat task-expand-toggle"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setStepsOpen((prev) => !prev)}
            >
              {stepsOpen ? 'Hide steps' : 'Show steps'}
            </button>
          )}
        </div>

        {steps.length > 0 && stepsOpen && (
          <div className="task-steps" style={{ marginTop: 10 }}>
            {steps.map((s) => (
              <div className="cat-row" key={s.sid}>
                <span className="cat-name">
                  {s.status ? '✅' : '⬜'} {s.step_description}
                </span>
                <span className="cat-count">{s.difficulty || ''}</span>
              </div>
            ))}
          </div>
        )}
        {steps.length === 0 && stepsOpen && (
          <p className="panel-hint">No steps added.</p>
        )}
      </div>
    </article>
  );
}