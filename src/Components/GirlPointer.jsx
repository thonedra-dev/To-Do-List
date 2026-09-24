/**
 * 2D replacement for the old GirlModelViewer (three.js/GLTF). Renders the
 * flattened, transparent african_girl.png cutout plus the "blackboard"
 * that holds the three kind-legend items — the whole idle-panel visual is
 * owned by this one component now, so Calendar.jsx just drops it in and
 * passes the legend data through.
 *
 * Layout logic (see CalendarPanel.css for the actual positioning):
 * she's anchored bottom-left of the idle panel, the board is pinned
 * top-right, and the two are sized/spaced so her raised hand reads as
 * pointing up at the board's bottom-left corner.
 */
export default function GirlPointer({ kinds }) {
  return (
    <>
      <div className="cal-chalkboard">
        <div className="cal-chalkboard-frame">
          <span className="cal-chalkboard-tray" aria-hidden="true" />
          <ul className="cal-chalkboard-list">
            {kinds.map((k) => (
              <li
                key={k.key}
                className={`cal-chalkboard-item${k.live ? '' : ' static'}`}
                title={k.live ? k.label : `${k.label} — coming soon`}
              >
                <span className={`cal-kind-dot ${k.dotClass}`} />
                <span className="cal-chalkboard-label">{k.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="cal-idle-girl" role="presentation">
        <img
          src="/src/assets/backgrounds/african_girl.png"
          alt=""
          className="cal-idle-girl-img"
          draggable={false}
        />
      </div>
    </>
  );
}