/**
 * Lightweight API helper for IndieVault frontend.
 * Handles auth token injection and JSON parsing.
 */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('iv_token');
}

function setToken(token) {
  localStorage.setItem('iv_token', token);
}

function clearToken() {
  localStorage.removeItem('iv_token');
}

function getUser() {
  const raw = localStorage.getItem('iv_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function setUser(user) {
  localStorage.setItem('iv_user', JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem('iv_user');
}

async function apiFetch(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (multer)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// Convenience methods
const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (path, body) => apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body)
  }),
  patch: (path, body) => apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body)
  }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};

export { api, getToken, setToken, clearToken, getUser, setUser, clearUser };
