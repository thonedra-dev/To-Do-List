import useCurrentUser from '../hooks/useCurrentUser';

/**
 * Slim identity bar above the calendar layout. Purely presentational —
 * all fetching lives in useCurrentUser. Renders a lightweight skeleton
 * while loading and quietly no-ops on error (a missing name shouldn't
 * block the calendar from being usable).
 */
export default function CalendarHeader() {
  const { user, loading } = useCurrentUser();

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : '';

  return (
    <div className="cal-topbar">
      <div className="cal-topbar-avatar" aria-hidden={loading}>
        {loading ? (
          <span className="cal-topbar-skel cal-topbar-skel-avatar" />
        ) : user?.profile_pic ? (
          <img src={user.profile_pic} alt="" className="cal-topbar-avatar-img" draggable={false} />
        ) : (
          <span className="cal-topbar-avatar-fallback">{initial || '?'}</span>
        )}
      </div>

      <div className="cal-topbar-greeting">
        <span className="cal-topbar-eyebrow">Welcome back</span>
        <span className="cal-topbar-name">
          {loading ? <span className="cal-topbar-skel" /> : (user?.username || 'there')}
        </span>
      </div>
    </div>
  );
}