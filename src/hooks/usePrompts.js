import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../api';

/**
 * Owns the speech-bubble prompt list ("Verify Email ⚡", "Setup Profile 🛠️")
 * shown under the profile avatar, plus which profile fields are missing
 * (position/age/gender/pic) — the same two pieces of data the old
 * <div id="prompt-data"> carried in via server-rendered data attributes.
 *
 * Since this is now a pure SPA with no Jinja context, we fetch /home_data
 * on mount instead of reading data-prompts/data-missing-fields off the DOM.
 *
 * `dismissPrompt(keyword)` replaces removePromptButton(): call it once a
 * flow completes (email verified / profile setup finished) to fade that
 * button out of the list. The fade-out animation itself lives in CSS
 * (unchanged `fadeOut` keyframe) — this hook just removes the prompt from
 * state, and the parent renders with a `.leaving` class for one animation
 * cycle before it's actually gone.
 */
export function usePrompts() {
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [missingFields, setMissingFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const data = await apiGet('/home_data');
        if (cancelled) return;
        if (data.success) {
          setUsername(data.username || 'Unknown');
          setProfilePic(data.profile_pic || null);
          setPrompts(data.prompts || []);
          setMissingFields(data.missing_fields || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHomeData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Removes any prompt whose text includes `keyword` (e.g. 'Verify Email',
  // 'Setup Profile') — same matching rule as the original's
  // btn.textContent.includes(keyword).
  const dismissPrompt = useCallback((keyword) => {
    setPrompts((prev) => prev.filter((p) => !p.includes(keyword)));
  }, []);

  return { username, profilePic, prompts, missingFields, loading, dismissPrompt };
}