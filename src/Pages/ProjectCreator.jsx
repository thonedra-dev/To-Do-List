import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../ProjectCreator.css';

/**
 * Floating accent particles inside the parallax hero.
 * `depth` multiplies the mouse translation — larger = closer
 * to the camera = moves more.
 */
const PARTICLES = [
  { px: '14%', py: '22%', depth: 1.5, size: 5 },
  { px: '82%', py: '20%', depth: 2.6, size: 4 },
  { px: '22%', py: '72%', depth: 2.0, size: 5 },
  { px: '72%', py: '78%', depth: 1.3, size: 4 },
  { px: '46%', py: '14%', depth: 3.0, size: 3 },
  { px: '90%', py: '52%', depth: 1.8, size: 4 },
  { px: '8%',  py: '48%', depth: 2.4, size: 4 },
];

/**
 * Standalone project-creation page — /project/new
 *
 * Layout (single viewport, no page scroll):
 *
 *   LEFT  →  brand, hero copy, floating 2.5D parallax hero,
 *            feature chips. Breathing gaps; no stat row.
 *   RIGHT →  glass card with pinned H1 "Start a new project",
 *            step bar, and a scrollable body (step 1 / 2).
 *
 * The whole page shares one atmosphere (blurred artwork) + grid
 * + scanlines. Only the form card's body may scroll.
 *
 * Parallax is scoped: the mousemove/mouseleave handlers live on
 * the hero illustration, so moving the cursor anywhere else on
 * the page leaves the artwork perfectly still.
 *
 * Backend: POST /api/create_project (multipart/form-data), and
 * GET /api/search_user_by_code?connection_code=XXNNNNN for
 * collaborator lookup — both live in user.py.
 */
export default function ProjectCreator() {
  const navigate = useNavigate();

  const pageRef = useRef(null);
  const heroRef = useRef(null);
  const frameRef = useRef(null);

  // ---- Theme (body.light-mode, same toggle Dashboard uses) ----
  const [isLight, setIsLight] = useState(() =>
    typeof document !== 'undefined' &&
    document.body.classList.contains('light-mode')
  );

  useEffect(() => {
    const target = document.body;

    const observer = new MutationObserver(() => {
      setIsLight(target.classList.contains('light-mode'));
    });

    observer.observe(target, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // ---- Parallax state (page-scoped, hero-driven) ----
  const current = useRef({
    x: 0, y: 0,
    rotateX: 0, rotateY: 0,
    mx: 50, my: 50,
  });

  const target = useRef({
    x: 0, y: 0,
    rotateX: 0, rotateY: 0,
    mx: 50, my: 50,
  });

  useEffect(() => {
    const element = pageRef.current;
    if (!element) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (reducedMotion) return;

    const animate = () => {
      const c = current.current;
      const t = target.current;

      c.x += (t.x - c.x) * 0.075;
      c.y += (t.y - c.y) * 0.075;

      c.rotateX += (t.rotateX - c.rotateX) * 0.075;
      c.rotateY += (t.rotateY - c.rotateY) * 0.075;

      c.mx += (t.mx - c.mx) * 0.09;
      c.my += (t.my - c.my) * 0.09;

      element.style.setProperty('--pc-x', `${c.x.toFixed(3)}px`);
      element.style.setProperty('--pc-y', `${c.y.toFixed(3)}px`);
      element.style.setProperty('--pc-rotate-x', `${c.rotateX.toFixed(3)}deg`);
      element.style.setProperty('--pc-rotate-y', `${c.rotateY.toFixed(3)}deg`);
      element.style.setProperty('--pc-mx', `${c.mx.toFixed(3)}%`);
      element.style.setProperty('--pc-my', `${c.my.toFixed(3)}%`);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /**
   * Scoped parallax: coordinates are computed against the hero
   * box, not the page. Because this handler is only attached to
   * .pc-parallax-hero, moving the cursor anywhere else will
   * simply never fire it.
   */
  function handleHeroMouseMove(e) {
    const element = heroRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();

    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;

    const px = nx - 0.5;
    const py = ny - 0.5;

    target.current = {
      x: px * 26,
      y: py * 26,

      rotateX: -py * 3.6,
      rotateY: px * 3.6,

      mx: nx * 100,
      my: ny * 100,
    };
  }

  function handleHeroMouseLeave() {
    target.current = {
      x: 0, y: 0,
      rotateX: 0, rotateY: 0,
      mx: 50, my: 50,
    };
  }

  // ---- Step 1: project details ----
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [step1Error, setStep1Error] = useState('');

  // ---- Step 2: collaborators ----
  const [codeInput, setCodeInput] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [collaborators, setCollaborators] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  }

  function goToStep2() {
    if (!projectName.trim()) {
      setStep1Error('Project name is required.');
      return;
    }

    setStep1Error('');
    setStep(2);
  }

  async function handleSearchCode(e) {
    e.preventDefault();

    const code = codeInput.trim().toUpperCase();
    if (!code) return;

    setSearching(true);
    setSearchError('');
    setFoundUser(null);

    try {
      const res = await fetch(
        `/api/search_user_by_code?connection_code=${encodeURIComponent(code)}`,
        { credentials: 'include' }
      );

      const data = await res.json();

      if (!data.success) {
        setSearchError(data.message || 'User not found.');
        return;
      }

      if (collaborators.some((c) => c.id === data.user.id)) {
        setSearchError('Already added.');
        return;
      }

      setFoundUser(data.user);
    } catch {
      setSearchError('Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  }

  function addCollaborator() {
    if (!foundUser) return;

    setCollaborators((prev) => [...prev, foundUser]);
    setFoundUser(null);
    setCodeInput('');
  }

  function removeCollaborator(id) {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();

      formData.append('project_name', projectName.trim());
      formData.append('description', description.trim());

      if (imageFile) {
        formData.append('project_image', imageFile);
      }

      formData.append(
        'collaborator_ids',
        JSON.stringify(collaborators.map((c) => c.id))
      );

      const res = await fetch('/api/create_project', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        setSubmitError(data.message || 'Could not create project.');
        return;
      }

      navigate('/');
    } catch {
      setSubmitError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function avatarSrc(profilePic) {
    if (!profilePic) return null;

    return profilePic.startsWith('http') || profilePic.startsWith('/')
      ? profilePic
      : `/static/${profilePic}`;
  }

  return (
    <div
      className={`pc-page${isLight ? ' pc-page--light' : ''}`}
      ref={pageRef}
    >
      {/* ---------- SHARED SCENE (behind everything) ---------- */}
      <div className="pc-atmosphere" aria-hidden="true" />
      <div className="pc-grid" aria-hidden="true" />
      <div className="pc-scanlines" aria-hidden="true" />

      {/* ---------- BACK ---------- */}
      <button
        type="button"
        className="pc-back-btn"
        onClick={() => navigate('/')}
        title="Back to dashboard"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18" height="18"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <div className="pc-shell">

        {/* ============================================================
            LEFT COLUMN — brand + hero copy + illustration + chips
            ============================================================ */}
        <aside className="pc-left">

          <div className="pc-brand">
            <div className="brand-mark">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20" height="20"
                viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <div className="brand-name">
              Task<span>Flow</span>
            </div>
          </div>

          <h1 className="pc-hero-title">
            Turn ideas into <em>shipped work</em>.
          </h1>

          <p className="pc-hero-sub">
            Set it up, invite the people who'll build it with you, and get
            out of the way.
          </p>

          <ParallaxHero
            heroRef={heroRef}
            onMouseMove={handleHeroMouseMove}
            onMouseLeave={handleHeroMouseLeave}
          />

          <div className="pc-chip-row">
            <span className="pc-chip">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14" height="14"
                viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Real-time sync
            </span>

            <span className="pc-chip">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14" height="14"
                viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Private by default
            </span>

            <span className="pc-chip">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14" height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Unlimited seats
            </span>
          </div>
        </aside>

        {/* ============================================================
            RIGHT COLUMN — glass form card
            ============================================================ */}
        <main className="pc-right">
          <div className="pc-form-card">

            <h1 className="pc-form-header">Start a new project</h1>

            <div className="pc-step-bar">
              <div
                className="pc-step-bar-inner"
                style={{ width: step === 1 ? '50%' : '100%' }}
              />
            </div>

            <div className="pc-step-label">
              Step {step} of 2 —{' '}
              {step === 1 ? 'Project Details' : 'Add Collaborators'}
            </div>

            <div className="pc-form-body">

              {step === 1 && (
                <div className="pc-form-step">
                  <p className="pc-subtitle">
                    Give it a name, a short description, and an optional cover
                    image.
                  </p>

                  <label className="pc-field-label">Project name</label>
                  <input
                    type="text"
                    className="pc-input"
                    placeholder="e.g. Website Redesign"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    maxLength={150}
                  />

                  <label className="pc-field-label">Description</label>
                  <textarea
                    className="pc-input pc-textarea"
                    placeholder="What is this project about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />

                  <label className="pc-field-label">Project image</label>
                  <label className="pc-image-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      hidden
                    />

                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Project cover preview"
                        className="pc-image-preview"
                      />
                    ) : (
                      <div className="pc-image-placeholder">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="22" height="22"
                          viewBox="0 0 24 24"
                          fill="none" stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span>Click to upload a cover image</span>
                      </div>
                    )}
                  </label>

                  {step1Error && <p className="pc-error">{step1Error}</p>}

                  <div className="pc-actions">
                    <button
                      type="button"
                      className="pc-btn pc-btn-primary"
                      onClick={goToStep2}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="pc-form-step">
                  <h2 className="pc-title">Add collaborators</h2>

                  <p className="pc-subtitle">
                    Search by connection code (e.g. <code>AB12345</code>) and
                    add teammates.
                  </p>

                  <form className="pc-code-search" onSubmit={handleSearchCode}>
                    <input
                      type="text"
                      className="pc-input pc-code-input"
                      placeholder="AB12345"
                      value={codeInput}
                      onChange={(e) =>
                        setCodeInput(e.target.value.toUpperCase())
                      }
                      maxLength={7}
                    />

                    <button
                      type="submit"
                      className="pc-btn pc-btn-secondary"
                      disabled={searching || !codeInput.trim()}
                    >
                      {searching ? 'Searching…' : 'Search'}
                    </button>
                  </form>

                  {searchError && <p className="pc-error">{searchError}</p>}

                  {foundUser && (
                    <div className="pc-found-user">
                      <div className="pc-found-user-info">
                        {avatarSrc(foundUser.profile_pic) ? (
                          <img
                            src={avatarSrc(foundUser.profile_pic)}
                            alt={foundUser.username}
                            className="pc-found-avatar"
                          />
                        ) : (
                          <span className="pc-found-avatar pc-found-avatar-fallback">
                            {foundUser.username?.[0]?.toUpperCase()}
                          </span>
                        )}

                        <span className="pc-found-name">
                          {foundUser.username}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="pc-btn pc-btn-add"
                        onClick={addCollaborator}
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <div className="pc-roster-wrap">
                    <div className="pc-roster-label">
                      Collaborators
                      <span className="pc-roster-count">
                        {collaborators.length}
                      </span>
                    </div>

                    {collaborators.length === 0 ? (
                      <p className="pc-roster-empty">
                        No collaborators added yet.
                      </p>
                    ) : (
                      <div className="pc-roster-grid">
                        {collaborators.map((c) => (
                          <div className="pc-roster-card" key={c.id}>
                            <button
                              type="button"
                              className="pc-roster-remove"
                              onClick={() => removeCollaborator(c.id)}
                              title="Remove"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12" height="12"
                                viewBox="0 0 24 24"
                                fill="none" stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>

                            {avatarSrc(c.profile_pic) ? (
                              <img
                                src={avatarSrc(c.profile_pic)}
                                alt={c.username}
                                className="pc-roster-avatar"
                              />
                            ) : (
                              <span className="pc-roster-avatar pc-roster-avatar-fallback">
                                {c.username?.[0]?.toUpperCase()}
                              </span>
                            )}

                            <span className="pc-roster-name">
                              {c.username}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {submitError && <p className="pc-error">{submitError}</p>}

                  <div className="pc-actions pc-actions-split">
                    <button
                      type="button"
                      className="pc-btn pc-btn-ghost"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      className="pc-btn pc-btn-primary"
                      onClick={handleConfirm}
                      disabled={submitting}
                    >
                      {submitting ? 'Creating…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Free-floating 2.5D parallax illustration for the left column.
 *
 * Nothing but the artwork: no card, no frame. It floats on the
 * shared scene via a strong drop-shadow and swaps by theme.
 *
 * Parallax is *scoped* to this element: onMouseMove/onMouseLeave
 * are attached by the parent directly to this node, so mouse
 * movement anywhere else on the page never triggers a reaction.
 */
function ParallaxHero({ heroRef, onMouseMove, onMouseLeave }) {
  return (
    <div
      className="pc-parallax-hero"
      ref={heroRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      aria-hidden="true"
    >
      <div className="pc-parallax-stage">
        <div className="pc-parallax-glow" />
        <div className="pc-parallax-base" />
        <div className="pc-parallax-layer pc-parallax-mid" />
        <div className="pc-parallax-layer pc-parallax-near" />

        <div className="pc-parallax-particles">
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="pc-particle"
              style={{
                '--px': p.px,
                '--py': p.py,
                '--depth': p.depth,
                '--size': `${p.size}px`,
              }}
            />
          ))}
        </div>

        <div className="pc-parallax-highlight" />
      </div>
    </div>
  );
}