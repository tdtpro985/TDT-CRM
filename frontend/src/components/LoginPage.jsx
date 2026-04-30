import { useState } from 'react'
import { API_BASE, saveToken } from '../api'

const BRANCHES = [
  'Manila',
  'Batangas',
  'Cavite',
  'CDO',
  'Cebu',
  'Davao',
  'Isabela',
  'Iloilo',
  'Ilocos',
  'Gensan',
  'Legazpi',
  'Palawan',
  'Powerstore',
  'Headquarters',
]

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '', branch: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.password || !form.branch) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
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
        setError((data && data.error) || `Login failed (status ${res.status}).`)
      } else {
        // Save the JWT token so all future API calls can attach it
        saveToken(data?.access_token)
        onLogin(data?.user)
      }
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <img src="/Logo_tdt.png" alt="TDT Powersteel" className="login-logo" />
          <p className="login-subtitle">Sales CRM — Branch Portal</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label className="login-field">
            <span>Username</span>
            <input
              id="login-username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              placeholder="e.g. manila.tdtpowersteel"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              id="login-password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          <label className="login-field">
            <span>Branch</span>
            <select
              id="login-branch"
              name="branch"
              value={form.branch}
              onChange={handleChange}
            >
              <option value="" disabled>Select your branch…</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="primary-button login-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-footer">© {new Date().getFullYear()} TDT Powersteel. All rights reserved.</p>
      </div>
    </div>
  )
}
