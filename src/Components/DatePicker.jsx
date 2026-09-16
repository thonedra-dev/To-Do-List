import { useEffect, useRef, useState } from 'react';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Custom themed calendar date picker.
 * Controlled by `value` (ISO string or null) + `onChange(iso|null)`,
 * so TaskForm owns the actual field value — this component only owns
 * which month is currently displayed and whether the panel is open.
 *
 * Visuals/markup match the original date-picker/date-picker-panel/
 * date-picker-grid structure exactly, just built with JSX instead of
 * innerHTML string building.
 */
export default function DatePicker({ value, onChange, resetSignal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const wrapRef = useRef(null);

  // Parity with resetDatePicker(): when the form is cleared, snap the
  // calendar back to the current month.
  useEffect(() => {
    if (resetSignal !== undefined) {
      setViewDate(new Date());
    }
  }, [resetSignal]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  function togglePanel() {
    if (!isOpen) {
      // If a date is already selected, jump the visible month to it,
      // same as the calendar always reflecting the current selection.
      if (value) {
        const [y, m] = value.split('-').map(Number);
        setViewDate(new Date(y, m - 1, 1));
      }
    }
    setIsOpen((prev) => !prev);
  }

  function shiftMonth(delta) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectDate(iso) {
    onChange(iso);
    setIsOpen(false);
  }

  function pickToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    selectDate(toISODate(today));
  }

  function clearDate() {
    onChange(null);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = toISODate(new Date());

  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ type: 'empty', key: `empty-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISODate(new Date(year, month, day));
    cells.push({ type: 'day', key: iso, day, iso, isToday: iso === todayIso, isSelected: iso === value });
  }

  return (
    <div className="date-picker" id="date-picker" ref={wrapRef}>
      <button
        type="button"
        className={`date-picker-trigger${value ? ' has-value' : ''}`}
        onClick={togglePanel}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span id="date-picker-label">{value ? formatDateLabel(value) : 'Due date'}</span>
      </button>

      <input type="hidden" name="due_date" id="due_date" value={value || ''} readOnly />

      {isOpen && (
        <div className="date-picker-panel" id="date-picker-panel">
          <div className="date-picker-head">
            <button type="button" className="date-picker-nav" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span className="date-picker-month" id="date-picker-month">
              {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button type="button" className="date-picker-nav" onClick={() => shiftMonth(1)} aria-label="Next month">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

          <div className="date-picker-weekdays">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          <div className="date-picker-grid" id="date-picker-grid">
            {cells.map((cell) =>
              cell.type === 'empty' ? (
                <span key={cell.key} className="date-picker-day is-empty"></span>
              ) : (
                <button
                  key={cell.key}
                  type="button"
                  className={`date-picker-day${cell.isToday ? ' is-today' : ''}${cell.isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectDate(cell.iso)}
                >
                  {cell.day}
                </button>
              )
            )}
          </div>

          <div className="date-picker-footer">
            <button type="button" className="date-picker-clear" onClick={clearDate}>Clear</button>
            <button type="button" className="date-picker-today" onClick={pickToday}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}