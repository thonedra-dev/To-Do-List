import { useEffect, useRef, useState } from 'react';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

function pad2(n) {
  return String(n).padStart(2, '0');
}

// "HH:MM" (24h) -> { hour12, minute, period }
function parse24h(value) {
  if (!value) return { hour12: 9, minute: 0, period: 'AM' };
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, period };
}

function to24h(hour12, minute, period) {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${pad2(h)}:${pad2(minute)}`;
}

function formatLabel(value) {
  if (!value) return null;
  const { hour12, minute, period } = parse24h(value);
  return `${hour12}:${pad2(minute)} ${period}`;
}

/**
 * Reusable time picker. Controlled by `value` (24h "HH:MM" string or null)
 * + `onChange(value|null)`. Draft hour/minute/period are only committed on
 * "OK" — closing without pressing OK discards the draft, same as a native
 * time picker's confirm step.
 */
export default function TimePicker({ value, onChange, placeholder = 'Select time' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => parse24h(value));
  const wrapRef = useRef(null);

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
    if (!isOpen) setDraft(parse24h(value));
    setIsOpen((prev) => !prev);
  }

  function confirm() {
    onChange(to24h(draft.hour12, draft.minute, draft.period));
    setIsOpen(false);
  }

  function clearTime() {
    onChange(null);
    setIsOpen(false);
  }

  return (
    <div className="time-picker" data-open={isOpen} ref={wrapRef}>
      <button type="button" className={`time-picker-trigger${value ? ' has-value' : ''}`} onClick={togglePanel}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>{value ? formatLabel(value) : placeholder}</span>
      </button>

      {isOpen && (
        <div className="time-picker-panel">
          <div className="time-picker-columns">
            <div className="time-picker-col">
              {HOURS.map((h) => (
                <button
                  type="button"
                  key={h}
                  className={`time-picker-option${draft.hour12 === h ? ' is-selected' : ''}`}
                  onClick={() => setDraft((prev) => ({ ...prev, hour12: h }))}
                >
                  {pad2(h)}
                </button>
              ))}
            </div>
            <div className="time-picker-col">
              {MINUTES.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={`time-picker-option${draft.minute === m ? ' is-selected' : ''}`}
                  onClick={() => setDraft((prev) => ({ ...prev, minute: m }))}
                >
                  {pad2(m)}
                </button>
              ))}
            </div>
            <div className="time-picker-col time-picker-col-period">
              {['AM', 'PM'].map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`time-picker-option${draft.period === p ? ' is-selected' : ''}`}
                  onClick={() => setDraft((prev) => ({ ...prev, period: p }))}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="time-picker-footer">
            <button type="button" className="date-picker-clear" onClick={clearTime}>Clear</button>
            <button type="button" className="time-picker-ok" onClick={confirm}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}