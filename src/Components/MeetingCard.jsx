import { useState } from 'react';
import { CATEGORY_DOT_VAR } from '../api';
import MeetingMap from './MeetingMap';

export function meetingBucket(meeting) {
  if (meeting.status === 'completed' || meeting.status === 'cancelled') return meeting.status;
  if (!meeting.start_time) return 'upcoming';
  const start = new Date(meeting.start_time.replace(' ', 'T'));
  const today = new Date();
  const isSameDay =
    start.getFullYear() === today.getFullYear() &&
    start.getMonth() === today.getMonth() &&
    start.getDate() === today.getDate();
  if (isSameDay) return 'today';
  return start < today ? 'overdue' : 'upcoming';
}

function formatDateTime(raw) {
  if (!raw) return null;
  const d = new Date(raw.replace(' ', 'T'));
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatTimeOnly(raw) {
  if (!raw) return null;
  const d = new Date(raw.replace(' ', 'T'));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * One meeting row — sibling to TaskCard, own layout for location/time-range
 * and agenda items instead of steps. Location:
 *  - virtual: shows a "Join" link (meeting_link)
 *  - physical/hybrid: shows the address text; if geocoding succeeded
 *    (hasMapPin), a down-arrow toggle reveals an embedded Leaflet map
 *    on click — collapsed by default, not auto-shown.
 */
export default function MeetingCard({ meeting, onStatusChange }) {
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const bucket = meetingBucket(meeting);
  const isOverdue = bucket === 'overdue';
  const isDone = meeting.status === 'completed';
  const isCancelled = meeting.status === 'cancelled';

  const dateLabel = bucket === 'today' ? `Today, ${formatTimeOnly(meeting.start_time)}` : formatDateTime(meeting.start_time);
  const endLabel = meeting.end_time ? formatTimeOnly(meeting.end_time) : null;

  const agendaItems = meeting.agenda_items || [];
  const hasMapPin = meeting.location_lat != null && meeting.location_lng != null;

  return (
    <article
      className={`task-item${isDone ? ' is-done' : ''}`}
      data-priority={meeting.importance || 'Low'}
      data-id={meeting.id}
    >
      <button
        type="button"
        className="task-check"
        title={isDone ? 'Completed' : 'Mark complete'}
        onClick={() => onStatusChange(meeting.id, isDone ? 'scheduled' : 'completed')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>

      <div className="task-body">
        <div className="task-title-row">
          <div className="task-title">{meeting.title}</div>
        </div>

        {meeting.description && <div className="task-desc">{meeting.description}</div>}

        <div className="task-badges">
          <span className={`badge badge-priority ${meeting.importance || 'Low'}`}>
            {meeting.importance || 'Low'}
          </span>
          <span className="badge badge-cat">
            <span
              className="cat-dot"
              style={{ background: CATEGORY_DOT_VAR[meeting.related] || CATEGORY_DOT_VAR.Other }}
            ></span>
            {meeting.related || 'Other'}
          </span>
          {dateLabel && (
            <span className={`badge badge-date${isOverdue ? ' is-overdue' : ''}`}>
              {isOverdue ? 'Overdue' : dateLabel}{endLabel ? ` – ${endLabel}` : ''}
            </span>
          )}
          {meeting.location_type === 'virtual' && (
            <span className="badge badge-cat">Virtual</span>
          )}
          {meeting.location_type === 'hybrid' && (
            <span className="badge badge-cat">Hybrid</span>
          )}
          {meeting.project_meeting ? <span className="badge badge-cat">Project</span> : null}
          {isCancelled && <span className="badge badge-date is-overdue">Cancelled</span>}
          {agendaItems.length > 0 && (
            <button
              type="button"
              className="badge badge-cat task-expand-toggle"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setAgendaOpen((prev) => !prev)}
            >
              {agendaOpen ? 'Hide agenda' : 'Show agenda'}
            </button>
          )}
        </div>

        {(meeting.location_text || meeting.meeting_link) && (
          <div className="task-desc" style={{ marginTop: 8 }}>
            {meeting.location_text && (
              <span>
                📍 {meeting.location_text}
                {hasMapPin && (
                  <button
                    type="button"
                    onClick={() => setMapOpen((prev) => !prev)}
                    title={mapOpen ? 'Hide map' : 'Show map'}
                    style={{
                      display: 'inline-flex',
                      verticalAlign: 'middle',
                      marginLeft: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      opacity: 0.75,
                      padding: 0,
                      transform: mapOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.15s',
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                )}
              </span>
            )}
            {meeting.meeting_link && (
              <>
                {meeting.location_text ? ' · ' : ''}
                <a href={meeting.meeting_link} target="_blank" rel="noreferrer">Join meeting →</a>
              </>
            )}
            {meeting.location_text && !hasMapPin && (
              <span style={{ opacity: 0.6 }}> (map unavailable for this address)</span>
            )}
          </div>
        )}

        {hasMapPin && mapOpen && (
          <MeetingMap
            lat={meeting.location_lat}
            lng={meeting.location_lng}
            label={meeting.location_text}
          />
        )}

        {agendaItems.length > 0 && agendaOpen && (
          <div className="task-steps" style={{ marginTop: 10 }}>
            {agendaItems.map((item) => (
              <div className="cat-row" key={item.id}>
                <span className="cat-name">
                  {item.description}{item.presenter ? ` — ${item.presenter}` : ''}
                </span>
                <span className="cat-count">{item.duration_minutes ? `${item.duration_minutes}m` : ''}</span>
              </div>
            ))}
          </div>
        )}
        {agendaItems.length === 0 && agendaOpen && (
          <p className="panel-hint">No agenda items added.</p>
        )}
      </div>
    </article>
  );
}