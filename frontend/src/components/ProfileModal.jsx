import { useState, useRef } from 'react'
import Modal from './Modal'
import { IconEye, IconEyeOff } from './Icons'
import { API_BASE } from '../api'

export default function ProfileModal({ isOpen, onClose, currentUser, onPasswordChange, onPhotoUpload, onPhotoRemove, onUploadSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')
  
  const fileInputRef = useRef(null)

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

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
      setShowCurrent(false)
      setShowNew(false)
      setShowConfirm(false)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const result = await onPhotoUpload(file)
      const newUrl = result.url
      // Trigger redirection to adjust modal with the NEW URL
      onUploadSuccess(newUrl)
    } catch (err) {
      setError(err.message || 'Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return

    setIsRemoving(true)
    try {
      await onPhotoRemove()
      if (currentUser) {
        currentUser.profilePic = null
        currentUser.profileZoom = 1.0
        currentUser.profileOffsetY = 0.0
        const stored = JSON.parse(sessionStorage.getItem('crm_user') || '{}')
        stored.profilePic = null
        stored.profileZoom = 1.0
        stored.profileOffsetY = 0.0
        sessionStorage.setItem('crm_user', JSON.stringify(stored))
      }
    } catch (err) {
      setError(err.message || 'Failed to remove photo')
    } finally {
      setIsRemoving(false)
    }
  }

  const inputStyle = { width: '100%', padding: 'var(--pad-control)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-strong)', paddingRight: '40px', boxSizing: 'border-box' }
  const buttonStyle = { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="My Profile"
      kicker="Account Settings"
    >
      <div className="profile-content">
        <section className="profile-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
            <div 
              className="profile-avatar-large"
              onClick={handlePhotoClick}
              style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 800,
                color: 'white',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                border: '4px solid var(--bg-surface-2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              {currentUser?.profilePic ? (
                <img 
                  src={`${API_BASE}${currentUser.profilePic}`} 
                  alt="Profile" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    objectPosition: 'center', 
                    backgroundColor: 'var(--bg-surface)',
                    transform: `translate(${currentUser?.profileOffsetX || 0}%, ${currentUser?.profileOffsetY || 0}%) scale(${currentUser?.profileZoom || 1}) rotate(${currentUser?.profileRotation || 0}deg)`
                  }} 
                />
              ) : (
                getInitials(currentUser?.name)
              )}
              {(isUploading || isRemoving) && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner-small" />
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--text-strong)', margin: '0 0 4px 0' }}>{currentUser?.name}</h2>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>{currentUser?.role}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button 
                  type="button" 
                  className="about-button" 
                  style={{ fontSize: 'var(--fs-2xs)' }}
                  onClick={handlePhotoClick}
                  disabled={isUploading || isRemoving}
                >
                  {isUploading ? 'Uploading...' : 'Change Photo'}
                </button>
                {currentUser?.profilePic && (
                  <>
                    <button 
                      type="button" 
                      className="about-button" 
                      style={{ fontSize: 'var(--fs-2xs)', color: 'var(--alert)' }}
                      onClick={handleRemovePhoto}
                      disabled={isUploading || isRemoving}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

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
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Change Password</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="deal-form">
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  className="field"
                  style={inputStyle}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button type="button" style={buttonStyle} onClick={() => setShowCurrent(!showCurrent)} title={showCurrent ? "Hide password" : "Show password"}>
                  {showCurrent ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  className="field"
                  style={inputStyle}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button type="button" style={buttonStyle} onClick={() => setShowNew(!showNew)} title={showNew ? "Hide password" : "Show password"}>
                  {showNew ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 'var(--fs-2xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="field"
                  style={inputStyle}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" style={buttonStyle} onClick={() => setShowConfirm(!showConfirm)} title={showConfirm ? "Hide password" : "Show password"}>
                  {showConfirm ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
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
