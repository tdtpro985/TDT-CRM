import { useState } from 'react'
import { API_BASE, saveToken } from '../api'

export default function AdminLoginPage({ onLogin }) {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password) {
      setError('Please enter your username and password.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      let data = null
      try {
        data = await res.json()
      } catch (err) {
        // response not JSON
      }
      if (!res.ok) {
        setError((data && data.error) || `Invalid credentials (status ${res.status}).`)
        return
      }
      // Save the JWT token so all admin API calls can attach it
      saveToken(data?.access_token)
      onLogin(data?.user)
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell admin-login-shell">
      <div className="login-brand-panel">
        <div className="brand-content fade-in">
          <img src="/Logo_tdt.png" alt="TDT Powersteel" className="brand-hero-logo" />
          <h1 className="brand-headline">
            Central <span>Administration</span> & Control.
          </h1>
          <p className="brand-tagline">
            Manage system users, view global analytics, and maintain the 
            data integrity of the entire CRM network.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card admin-login-card fade-in">
          <div className="login-brand">
            <img src="/Logo_tdt.png" alt="TDT Powersteel" className="login-logo" />
            <p className="login-subtitle">Admin Portal</p>
            <span className="admin-login-badge">Restricted Access</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <label className="login-field">
              <span>Admin Username</span>
              <input
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. admin.tdtpowersteel"
                autoComplete="username"
                autoFocus
              />
            </label>

            <label className="login-field">
              <span>Password</span>
              <div className="password-input-wrapper">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div className="login-error" role="alert">{error}</div>
            )}

            <button
              type="submit"
              className="primary-button login-submit"
              disabled={loading}
            >
              {loading ? 'Verifying…' : 'Sign in to Admin'}
            </button>
          </form>

          <p className="login-footer admin-login-footer">
            Not an admin?{' '}
            <a href="/" className="admin-login-link">Go to Branch Portal →</a>
          </p>
          <p className="login-footer">© {new Date().getFullYear()} TDT Powersteel. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
