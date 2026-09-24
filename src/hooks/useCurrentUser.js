import { useState, useEffect } from 'react';
import { apiGet } from '../api';

/**
 * Fetches the logged-in user's basic identity (username, profile_pic, ...)
 * from the existing `user_bp` blueprint route — GET /profile — rather than
 * duplicating that query somewhere in backend.py. That route already
 * returns everything the header bar needs (and more, for later screens),
 * so this hook just calls it and exposes the bits UI components want.
 *
 * Uses the same apiGet(path) helper as useCalendarTasks/useCalendarMeetings
 * for consistency (base URL, credentials, JSON parsing, error shape all
 * handled in one place).
 *
 * ONE THING TO CONFIRM: apiGet's base is presumably wired to whatever
 * prefix the app.route('/api/...') endpoints (calendar_tasks, etc.) sit
 * under in backend.py. The /profile route we read is defined bare on
 * user_bp with no visible url_prefix — if user_bp is registered in
 * backend.py with app.register_blueprint(user_bp) (no prefix), and apiGet
 * always prepends '/api', this call will actually hit '/api/profile',
 * which doesn't exist, and 404. In that case either:
 *   a) change PROFILE_PATH below to whatever absolute path reaches
 *      user_bp's /profile (e.g. skip apiGet's base for this one call), or
 *   b) register user_bp under /api in backend.py so it lines up, or
 *   c) add url_prefix='/api' to user_bp's registration.
 * Whichever is true, once confirmed this file needs zero further changes.
 */
const PROFILE_PATH = '/profile';

/**
 * The `users` table stores profile_pic as a path relative to Flask's
 * static/ folder — e.g. 'uploads/profile_pics/xyz.jpg' — not a full URL.
 * Flask's default static route serves that folder at /static/..., so the
 * browser needs '/static/uploads/profile_pics/xyz.jpg'. Built here, once,
 * so every consumer of this hook gets an already-usable <img> src and
 * never has to know about the static/ convention.
 *
 * Handles a few DB shapes defensively: a value that already starts with
 * '/static/' or 'http' is left alone; a bare 'uploads/...' path (no
 * leading slash, no 'static/' segment) gets both prepended.
 */
function resolveProfilePicUrl(rawPath) {
  if (!rawPath) return null;
  if (/^https?:\/\//i.test(rawPath) || rawPath.startsWith('/static/')) {
    return rawPath;
  }
  const cleaned = rawPath.replace(/^\/+/, ''); // strip any leading slash(es)
  const withStatic = cleaned.startsWith('static/') ? cleaned : `static/${cleaned}`;
  return `/${withStatic}`;
}

export default function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(PROFILE_PATH);
        if (cancelled) return;

        if (res.success) {
          setUser({
            ...res.user,
            profile_pic: resolveProfilePicUrl(res.user.profile_pic),
          });
        } else {
          setError(res.message || 'Failed to load profile');
          setUser(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load profile');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { user, loading, error };
}