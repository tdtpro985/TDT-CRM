import { useState } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import './App.css'
import { clearToken, getUser, saveUser } from './api'
import AdminLoginPage from './components/AdminLoginPage'
import AdminView from './views/AdminView'
import AdminAnalyticsView from './views/AdminAnalyticsView'
import AdminProfileView from './views/AdminProfileView'
import { IconCheck } from './components/Icons'

const REGION_BRANCHES = {
  'Central':     ['Manila', 'Palawan', 'Legazpi', 'Cavite', 'Batangas'],
  'North Luzon': ['Ilocos', 'Isabela'],
  'Vis&Min':     ['Gensan', 'Iloilo', 'Cebu', 'Davao', 'CDO'],
}

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
  const location = useLocation()
  // Ensure we get the correct active view based on the path (e.g. /admin/analytics)
  const activeView = location.pathname.split('/')[2] || 'analytics'

  const [adminUser, setAdminUser]     = useState(getUser())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast]             = useState(null)
  const [activeBranch, setActiveBranch] = useState('')
  const [activeRegion, setActiveRegion] = useState('')

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
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

  const meta = VIEW_META[activeView] || VIEW_META.analytics

  return (
    <div className={`crm-shell ${sidebarOpen ? 'sidebar-is-open' : ''}`}>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="sidebar-hover-trigger" onMouseEnter={() => setSidebarOpen(true)} />
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} onMouseLeave={() => setSidebarOpen(false)}>
        <div className="brand-block">
          <img src="/tdt-powersteel-logo.png" alt="TDT Powersteel" className="brand-logo" />
          <p className="brand-name">Admin Portal</p>
          <div className="brand-branch-badge admin-portal-badge">Headquarters</div>
        </div>

        <nav className="sidebar-nav u-flex-0-0-auto" aria-label="Admin navigation">
          <Link 
            to="/admin/accounts" 
            className={`nav-item ${location.pathname.startsWith('/admin/accounts') ? 'is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Manage Accounts
          </Link>
          <Link 
            to="/admin/analytics" 
            className={`nav-item ${location.pathname.startsWith('/admin/analytics') ? 'is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Analytics & Audits
          </Link>

          <div className="sidebar-nav-section">
            <p className="nav-section-label u-margin-b-8">Viewing Branch</p>

            <select
              className="sidebar-select"
              value={activeRegion}
              onChange={e => {
                setActiveRegion(e.target.value)
                setActiveBranch('')
              }}
            >
              <option value="">All Regions</option>
              {Object.keys(REGION_BRANCHES).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              className="sidebar-select"
              value={activeBranch}
              onChange={e => setActiveBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {(activeRegion ? REGION_BRANCHES[activeRegion] : Object.values(REGION_BRANCHES).flat())
                .map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </nav>


        <div className="sidebar-footer u-margin-t-auto">
          <p className="sidebar-label">Signed in as</p>
          <div className="sidebar-user">
            <span className="sidebar-user__name">{adminUser.name}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>Sign out</button>
          </div>
          <Link to="/" className="admin-back-link sidebar-back-link">← Go to Branch Portal</Link>
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
          <div className="top-bar-context-badge">
            {activeRegion || 'All Regions'}
            <span className="context-sep">/</span>
            {activeBranch || 'All Branches'}
          </div>
        </header>

        <div className="view-content">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/analytics" element={<AdminAnalyticsView activeBranch={activeBranch} activeRegion={activeRegion} />} />
            <Route path="/accounts" element={<AdminView currentUser={adminUser} showToast={showToast} />} />
            <Route path="/profile" element={<AdminProfileView currentUser={adminUser} onUserUpdate={handleAdminLogin} showToast={showToast} />} />
            <Route path="*" element={<Navigate to="/admin/analytics" replace />} />
          </Routes>
        </div>
      </main>

      {toast && (
        <div className="toast" role="status">
          <span className="toast__icon"><IconCheck /></span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  )
}
