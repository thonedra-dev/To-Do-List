/**
 * Shared API helper.
 *
 * Every call to the Flask backend needs `credentials: 'include'` so the
 * session cookie survives the cross-origin dev request (Vite on :5173,
 * Flask on :5000 — different origins even though both are localhost).
 *
 * Two request shapes are used across the old homepage.js:
 *   - JSON body (Content-Type: application/json)      -> apiPost / apiJson
 *   - multipart FormData (file uploads, steps[] etc.)  -> apiPostForm
 * GETs never need a body, just the credentials flag.
 */

const BASE_URL = '/api';

async function parseJsonSafely(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: 'Unexpected response from server.' };
  }
}

/** GET request. Returns parsed JSON body regardless of status code. */
export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await parseJsonSafely(res);
  return { ok: res.status, ...data };
}

/** POST with a JSON body (application/json). */
export async function apiPostJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJsonSafely(res);
  return { status: res.status, ...data };
}

/** POST with a FormData body (multipart — file uploads, steps[], etc.). */
export async function apiPostForm(path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await parseJsonSafely(res);
  return { status: res.status, ...data };
}

/** POST with no body at all (e.g. /complete/<id>, /logout). */
export async function apiPostEmpty(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
  });
  const data = await parseJsonSafely(res);
  return { status: res.status, ...data };
}

export const CATEGORY_LABELS = ['Work', 'Study', 'Personal', 'Shopping', 'Health', 'Other'];

// CSS custom properties, same var names the original stylesheet already defines
export const CATEGORY_DOT_VAR = {
  Work: 'var(--cat-work)',
  Study: 'var(--cat-study)',
  Personal: 'var(--cat-personal)',
  Shopping: 'var(--cat-shopping)',
  Health: 'var(--cat-health)',
  Other: 'var(--cat-other)',
};