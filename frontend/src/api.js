/**
 * Centralized API utility.
 * All fetch calls go through apiFetch() which automatically:
 *   - attaches the JWT token from sessionStorage
 *   - throws on 401 so the app can force-logout
 */

export const API_BASE = 'http://localhost:5000'

export function getToken() {
  return sessionStorage.getItem('crm_token')
}

export function saveToken(token) {
  sessionStorage.setItem('crm_token', token)
}

export function clearToken() {
  sessionStorage.removeItem('crm_token')
  sessionStorage.removeItem('crm_user')
}

export function saveUser(user) {
  sessionStorage.setItem('crm_user', JSON.stringify(user))
}

export function getUser() {
  const user = sessionStorage.getItem('crm_user')
  return user ? JSON.parse(user) : null
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  // If token expired or invalid, clear it so the user sees the login screen
  if (res.status === 401) {
    clearToken()
    window.location.reload()
  }

  return res
}
