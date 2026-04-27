import { useState } from 'react'
import Panel from '../components/Panel'

const API_BASE = 'http://localhost:5000'

export default function AdminProfileView({ currentUser, onUserUpdate, showToast }) {
  const [usernameForm, setUsernameForm] = useState({
    currentPassword: '',
    newUsername: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [usernameError, setUsernameError]   = useState('')
  const [passwordError, setPasswordError]   = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  function handleUsernameChange(e) {
    setUsernameForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setUsernameError('')
  }

  function handlePasswordChange(e) {
    setPasswordForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setPasswordError('')
  }

  async function handleUsernameSubmit(e) {
    e.preventDefault()
    if (!usernameForm.newUsername.trim()) {
      setUsernameError('New username is required.')
      return
    }
    if (!usernameForm.currentPassword.trim()) {
      setUsernameError('Current password is required to confirm changes.')
      return
    }
    setSavingUsername(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          currentPassword: usernameForm.currentPassword,
          newUsername: usernameForm.newUsername,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setUsernameError(data.error || 'Failed to update username.'); return }
      onUserUpdate(data.user)
      showToast('Username updated successfully.')
      setUsernameForm({ currentPassword: '', newUsername: '' })
    } finally {
      setSavingUsername(false)
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    if (!passwordForm.newPassword.trim()) {
      setPasswordError('New password is required.')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (!passwordForm.currentPassword.trim()) {
      setPasswordError('Current password is required to confirm changes.')
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentUser.id,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPasswordError(data.error || 'Failed to update password.'); return }
      onUserUpdate(data.user)
      showToast('Password updated successfully.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <>
      {/* Account Info Card */}
      <div className="profile-info-card">
        <div className="profile-avatar">
          {currentUser.name?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info-text">
          <h3 className="profile-info-name">{currentUser.name}</h3>
          <span className="profile-info-meta">{currentUser.username} · {currentUser.role}</span>
          <span className="profile-info-email">{currentUser.email}</span>
        </div>
        <span className="admin-role-pill admin-role-pill--accent profile-role-badge">Admin</span>
      </div>

      <div className="profile-grid">

        {/* Change Username */}
        <Panel kicker="Account settings" title="Change Username">
          <form className="profile-form" onSubmit={handleUsernameSubmit} noValidate>
            <label className="field">
              <span>Current username</span>
              <input
                type="text"
                value={currentUser.username}
                readOnly
                className="input--readonly"
              />
            </label>
            <label className="field">
              <span>New username</span>
              <input
                name="newUsername"
                type="text"
                value={usernameForm.newUsername}
                onChange={handleUsernameChange}
                placeholder="e.g. admin.tdt2025"
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>Confirm with current password</span>
              <input
                name="currentPassword"
                type="password"
                value={usernameForm.currentPassword}
                onChange={handleUsernameChange}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </label>
            {usernameError && <p className="profile-error">{usernameError}</p>}
            <div className="profile-form-actions">
              <button type="submit" className="primary-button" disabled={savingUsername}>
                {savingUsername ? 'Saving…' : 'Update username'}
              </button>
            </div>
          </form>
        </Panel>

        {/* Change Password */}
        <Panel kicker="Security" title="Change Password">
          <form className="profile-form" onSubmit={handlePasswordSubmit} noValidate>
            <label className="field">
              <span>Current password</span>
              <input
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </label>
            {passwordError && <p className="profile-error">{passwordError}</p>}
            <div className="profile-form-actions">
              <button type="submit" className="primary-button" disabled={savingPassword}>
                {savingPassword ? 'Saving…' : 'Update password'}
              </button>
            </div>
          </form>
        </Panel>

      </div>
    </>
  )
}
