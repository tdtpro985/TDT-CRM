import { useState } from 'react'
import Modal from './Modal'
import { IconEye, IconEyeOff } from './Icons'

export default function ProfileModal({ isOpen, onClose, currentUser, onPasswordChange }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)
    try {
      await onPasswordChange(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePasswordVisibility = () => setShowPasswords(!showPasswords)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Profile"
      kicker="Account Settings"
    >
      <div className="profile-content">
        <section className="profile-section">
          <h3>User Information</h3>
          <div className="profile-grid">
            <div className="profile-info-item">
              <label>Full Name</label>
              <div className="info-value">{currentUser?.name}</div>
            </div>
            <div className="profile-info-item">
              <label>Username</label>
              <div className="info-value">{currentUser?.username}</div>
            </div>
            <div className="profile-info-item">
              <label>Role</label>
              <div className="info-value">{currentUser?.role}</div>
            </div>
            <div className="profile-info-item">
              <label>Branch / Region</label>
              <div className="info-value">{currentUser?.branch || currentUser?.region || 'Global'}</div>
            </div>
          </div>
        </section>

        <section className="profile-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Change Password</h3>
            <button 
              type="button" 
              onClick={togglePasswordVisibility}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent)', 
                fontSize: 'var(--fs-xs)', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {showPasswords ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              {showPasswords ? 'Hide' : 'Show'}
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="deal-form">
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Current Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="field"
                style={{ width: '100%', padding: 'var(--pad-control)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-strong)' }}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="field"
                style={{ width: '100%', padding: 'var(--pad-control)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-strong)' }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="field"
                style={{ width: '100%', padding: 'var(--pad-control)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-strong)' }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="form-error" style={{ color: 'var(--alert)', fontSize: 'var(--fs-xs)', fontWeight: 600, marginBottom: '1.5rem', padding: '12px', background: 'rgba(251, 113, 133, 0.1)', borderRadius: 'var(--r-md)', border: '1px solid rgba(251, 113, 133, 0.2)' }}>
                {error}
              </div>
            )}

            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Modal>
  )
}
