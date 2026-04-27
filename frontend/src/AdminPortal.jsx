import { useState } from 'react'
import './App.css'
import { clearToken, getUser, saveUser } from './api'
import AdminLoginPage from './components/AdminLoginPage'
import AdminView from './views/AdminView'
import AdminAnalyticsView from './views/AdminAnalyticsView'
import AdminProfileView from './views/AdminProfileView'

const NAV = [
  { id: 'analytics', label: 'Analytics',          description: 'Branch stats and system overview' },
  { id: 'accounts',  label: 'Account Management', description: 'Create and manage branch accounts' },
  { id: 'profile',   label: 'Profile Settings',   description: 'Change your username and password' },
]

const VIEW_META = {
  analytics: { eyebrow: 'System administration', title: 'Analytics' },
  accounts:  { eyebrow: 'System administration', title: 'Account Management' },
  profile:   { eyebrow: 'System administration', title: 'Profile Settings' },
}

export default function AdminPortal() {
  const [adminUser, setAdminUser]     = useState(getUser())
  const [activeView, setActiveView]   = useState('analytics')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast]             = useState(null)

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function handleNavChange(id) {
    setActiveView(id)
    setSidebarOpen(false)
  }

  function handleLogout() {
    clearToken()
    setAdminUser(null)
  }

  function handleAdminLogin(user) {
    saveUser(user)
    setAdminUser(user)
  }

  if (!adminUser) {
    return <AdminLoginPage onLogin={handleAdminLogin} />
  }

  const meta = VIEW_META[activeView]

  return (
    <div className="crm-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand-block">
          <img src="/tdt-powersteel-logo.png" alt="TDT Powersteel" className="brand-logo" />
          <p className="brand-name">Admin Portal</p>
          <div className="brand-branch-badge admin-portal-badge">Headquarters</div>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          <p className="nav-section-label">Menu</p>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeView === item.id ? 'is-active' : ''}`}
              onClick={() => handleNavChange(item.id)}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              <span className="nav-item__copy">
                <span className="nav-item__label">{item.label}</span>
                <span className="nav-item__description">{item.description}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-label">Signed in as</p>
          <div className="sidebar-user">
            <span className="sidebar-user__name">{adminUser.name}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>Sign out</button>
          </div>
          <a href="/" className="admin-back-link sidebar-back-link">← Go to Branch Portal</a>
        </div>
      </aside>

      <main className="dashboard" id="admin-main-content">
        <header className="top-bar">
          <button
            type="button"
            className={`hamburger-btn ${sidebarOpen ? 'is-open' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span /><span /><span />
          </button>
          <div className="mobile-brand">
            <img src="/tdt-powersteel-logo.png" alt="TDT" />
            <span>Admin Portal</span>
          </div>
          <div className="top-bar-title">
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2 className="page-title">{meta.title}</h2>
          </div>
        </header>

        <div className="view-content">
          {activeView === 'analytics' && <AdminAnalyticsView />}
          {activeView === 'accounts'  && <AdminView currentUser={adminUser} showToast={showToast} />}
          {activeView === 'profile'   && <AdminProfileView currentUser={adminUser} onUserUpdate={handleAdminLogin} showToast={showToast} />}
        </div>
      </main>

      {toast && (
        <div className="toast" role="status">
          <span className="toast__icon">✓</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
