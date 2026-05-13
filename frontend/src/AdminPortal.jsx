import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import './App.css'
import { clearToken, getUser, saveUser } from './api'
import AdminLoginPage from './components/AdminLoginPage'
import AdminView from './views/AdminView'
import AdminAnalyticsView from './views/AdminAnalyticsView'
import AdminProfileView from './views/AdminProfileView'

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
  const navigate = useNavigate()
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

  function handleNavChange(id) {
    navigate(`/admin/${id}`)
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

  const meta = VIEW_META[activeView] || VIEW_META.analytics

  return (
    <div className="crm-shell">
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

        <nav className="sidebar-nav" aria-label="Admin navigation" style={{ flex: '0 0 auto' }}>
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

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <p className="nav-section-label" style={{ marginBottom: '8px' }}>Viewing Branch</p>
          <select
            style={{ width: '100%', marginBottom: '6px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #444', background: '#222222', color: '#ffffff', fontSize: '0.8rem' }}
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
            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #444', background: '#222222', color: '#ffffff', fontSize: '0.8rem' }}
            value={activeBranch}
            onChange={e => setActiveBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {(activeRegion ? REGION_BRANCHES[activeRegion] : Object.values(REGION_BRANCHES).flat())
              .map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="sidebar-footer" style={{ marginTop: 'auto' }}>
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
        </header>

        <div className="view-content">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/analytics" element={<AdminAnalyticsView activeBranch={activeBranch} />} />
            <Route path="/accounts" element={<AdminView currentUser={adminUser} showToast={showToast} />} />
            <Route path="/profile" element={<AdminProfileView currentUser={adminUser} onUserUpdate={handleAdminLogin} showToast={showToast} />} />
            <Route path="*" element={<Navigate to="/admin/analytics" replace />} />
          </Routes>
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
