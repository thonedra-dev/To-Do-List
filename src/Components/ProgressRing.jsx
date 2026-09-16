import { useEffect, useState } from 'react';

const CIRCUMFERENCE = 377; // 2 * PI * 60, matches the CSS circle radius — unchanged from original

/**
 * "Today's Progress" panel: SVG ring + percentage + done/total + copy line.
 * Also renders the hero date/greeting, since both are driven by the same
 * `pendingCount`/`completedCount`/`total` numbers and were computed
 * together in the original (renderGreeting + renderProgressRing were both
 * called from computeAndRenderStats in one pass).
 */
export default function ProgressRing({ completedCount, totalCount }) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * pct) / 100;

  const copy =
    pct === 100 && totalCount > 0
      ? "Everything's done. Nice work!"
      : 'A steady start. One task at a time.';

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Today's Progress</h2>
      </div>
      <p className="progress-copy" id="progress-copy">{copy}</p>

      <div className="progress-ring-wrap">
        <div className="progress-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'var(--accent-2)', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle className="ring-track" cx="70" cy="70" r="60"></circle>
            <circle
              className="ring-value"
              id="ring-value"
              cx="70"
              cy="70"
              r="60"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            ></circle>
          </svg>
          <div className="progress-ring-center">
            <div className="progress-pct" id="progress-pct">{pct}%</div>
            <div className="progress-done" id="progress-done">{completedCount}/{totalCount} done</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Hero date + greeting, shown above the stat row.
 * Split out from the ring itself (they're separate DOM regions in the
 * original markup — .dash-hero vs the side-column .panel) but grouped in
 * this file since they're computed from the exact same inputs.
 */
export function DashHero({ pendingCount }) {
  const [now, setNow] = useState(() => new Date());

  // The original computed this once on load; re-deriving on mount is
  // equivalent since this component only mounts once per page load.
  useEffect(() => {
    setNow(new Date());
  }, []);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const hour = now.getHours();
  const word = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
  const sub =
    pendingCount === 0
      ? "You're all caught up."
      : `You have ${pendingCount} task${pendingCount === 1 ? '' : 's'} to go.`;

  return (
    <div className="dash-hero reveal">
      <div className="dash-date" id="dash-date">{dateLabel}</div>
      <h1 className="dash-greeting">
        <span id="greeting-word">{word}</span>
        <br />
        <span className="muted" id="greeting-sub">{sub}</span>
      </h1>
    </div>
  );
}