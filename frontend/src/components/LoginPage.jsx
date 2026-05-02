import { useState, useEffect } from 'react'
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
  const [form, setForm] = useState({ 
    username: '', 
    password: '', 
    branch: localStorage.getItem('tdt_last_branch') || '' 
  })
  const [showPassword, setShowPassword] = useState(false)
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
        // Persist the branch selection for next time
        localStorage.setItem('tdt_last_branch', form.branch)
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
      <div className="login-brand-panel">
        <div className="brand-content fade-in">
          <img src="/Logo_tdt.png" alt="TDT Powersteel" className="brand-hero-logo" />
          <h1 className="brand-headline">
            Empower your <span>Sales</span> through visibility.
          </h1>
          <p className="brand-tagline">
            The next generation of TDT Powersteel CRM. Designed for clean data, 
            activity tracking, and real-time performance analytics.
          </p>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card fade-in">
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
              <div className="password-input-wrapper">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
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
              {loading ? (
                <>
                  <span className="spinner-small" /> Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="login-footer">© {new Date().getFullYear()} TDT Powersteel. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
