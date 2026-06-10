/**
 * Centralized API utility.
 * All fetch calls go through apiFetch() which automatically:
 *   - attaches the JWT token from sessionStorage
 *   - throws on 401 so the app can force-logout
 */

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5001'

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
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

export async function updatePassword(currentPassword, newPassword) {
  const res = await apiFetch('/api/team/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update password')
  }
  return res.json()
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData()
  formData.append('file', file)

  const token = sessionStorage.getItem('crm_token')
  const res = await fetch(`${API_BASE}/api/team/profile/photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to upload photo')
  }
  return res.json()
}

export async function removeProfilePhoto() {
  const res = await apiFetch('/api/team/profile/photo', {
    method: 'DELETE'
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to remove photo')
  }
  return res.json()
}

export async function adjustProfilePhoto(zoom, offsetY, offsetX, rotation, profilePic) {
  const res = await apiFetch('/api/team/profile/photo/adjust', {
    method: 'PUT',
    body: JSON.stringify({ zoom, offsetY, offsetX, rotation, profilePic }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to save adjustment')
  }
  return res.json()
}

