import { useState } from 'react'

const API_BASE = 'http://localhost:5000'

export default function AdminLoginPage({ onLogin }) {
  const [form, setForm]     = useState({ username: '', password: '' })
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
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid credentials.')
        return
      }
      onLogin(data.user)
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell admin-login-shell">
      <div className="login-card admin-login-card">
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
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
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
  )
}
