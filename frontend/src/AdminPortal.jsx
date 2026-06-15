import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import './App.css'
import { clearToken, getUser, saveUser, apiFetch } from './api'
import { resetThemeToDefaults } from './hooks/useTheme'
import AdminLoginPage from './components/AdminLoginPage'
import PageSkeleton from './components/SkeletonLoader'
import AdminView from './views/AdminView'
import AdminAnalyticsView from './views/AdminAnalyticsView'
import AdminProfileView from './views/AdminProfileView'
import AdminCelebrationMusicView from './views/AdminCelebrationMusicView'
import AdminNotificationsView from './views/AdminNotificationsView'
import { IconCheck } from './components/Icons'
import { useTheme } from './hooks/useTheme'
import ThemeToggle from './components/ThemeToggle'
import Modal from './components/Modal'
import AboutContent from './components/AboutContent'

const REGION_BRANCHES = {
  'Central':     ['Manila', 'Palawan', 'Legazpi', 'Cavite', 'Batangas'],
  'North Luzon': ['Ilocos', 'Isabela'],
  'Vis&Min':     ['Gensan', 'Iloilo', 'Cebu', 'Davao', 'CDO'],
}

const NAV = [
  { id: 'analytics',          label: 'Analytics',          description: 'Branch stats and system overview' },
  { id: 'accounts',           label: 'Account Management', description: 'Create and manage branch accounts' },
  { id: 'celebration-music',  label: 'Celebration Music',  description: 'Configure win/lost sounds' },
  { id: 'notifications',      label: 'Notifications',      description: 'Review and approve pending customers' },
  { id: 'profile',            label: 'Profile Settings',   description: 'Change your username and password' },
]

const VIEW_META = {
  analytics:         { eyebrow: 'System administration', title: 'Analytics' },
  accounts:          { eyebrow: 'System administration', title: 'Account Management' },
  'celebration-music': { eyebrow: 'System administration', title: 'Celebration Music' },
  notifications:     { eyebrow: 'System administration', title: 'Notifications' },
  profile:           { eyebrow: 'System administration', title: 'Profile Settings' },
}

const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
)

export default function AdminPortal() {
  const location = useLocation()
  // Ensure we get the correct active view based on the path (e.g. /admin/analytics)
  const activeView = location.pathname.split('/')[2] || 'analytics'

  const { theme, setTheme, neonColor, setNeonColor } = useTheme()
  const [adminUser, setAdminUser]       = useState(getUser())
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [toast, setToast]               = useState(null)
  const [activeBranch, setActiveBranch] = useState('')
  const [activeRegion, setActiveRegion] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [showAbout, setShowAbout]       = useState(false)
  const [adminPendingCount, setAdminPendingCount] = useState(0)

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function handleLogout() {
    resetThemeToDefaults()   // synchronous: clears sessionStorage + style tag before re-render
    clearToken()
    setAdminUser(null)
    setTheme('dark')
    setNeonColor('pink')
  }

  function handleAdminLogin(user) {
    saveUser(user)
    setAdminUser(user)
  }

  useEffect(() => {
    if (!adminUser) return
    apiFetch('/api/customers/pending')
      .then(r => r.json())
      .then(d => setAdminPendingCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {})
  }, [adminUser])

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
          <Link
            to="/admin/celebration-music"
            className={`nav-item ${location.pathname.startsWith('/admin/celebration-music') ? 'is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Celebration Music
          </Link>
          <Link
            to="/admin/notifications"
            className={`nav-item ${location.pathname.startsWith('/admin/notifications') ? 'is-active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Notifications
            {adminPendingCount > 0 && (
              <span style={{
                marginLeft: '8px',
                background: 'var(--color-accent, #f97316)',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '10px',
                padding: '1px 6px',
                fontWeight: 700,
              }}>{adminPendingCount}</span>
            )}
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
          <ThemeToggle
            theme={theme}
            onThemeChange={setTheme}
            neonColor={neonColor}
            onNeonColorChange={setNeonColor}
            defaultTheme={adminUser?.theme}
            defaultNeonColor={adminUser?.neonColor}
            onSaveDefault={(t, nc) => {
              apiFetch('/api/team/profile/preferences', {
                method: 'PUT',
                body: JSON.stringify({ theme: t, neonColor: nc }),
              })
              const stored = getUser()
              if (stored) saveUser({ ...stored, theme: t, neonColor: nc })
            }}
          />
          <p className="sidebar-label">Signed in as</p>
          <div className="sidebar-user">
            <span className="sidebar-user__name">{adminUser.name}</span>
            <button type="button" className="logout-button" onClick={handleLogout}>Sign out</button>
          </div>
          <button type="button" className="about-button" onClick={() => setShowAbout(true)}>About this system</button>
          <Link to="/" className="admin-back-link sidebar-back-link u-flex-center-gap-sm">
            <IconArrowLeft /> Go to Branch Portal
          </Link>
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

        {adminLoading && (
          <div className="view-content">
            <PageSkeleton view={`admin-${activeView}`} />
          </div>
        )}
        <div className="view-content" style={adminLoading ? { display: 'none' } : undefined}>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/analytics" replace />} />
            <Route path="/analytics" element={<AdminAnalyticsView activeBranch={activeBranch} activeRegion={activeRegion} onLoadingChange={setAdminLoading} />} />
            <Route path="/accounts" element={<AdminView currentUser={adminUser} showToast={showToast} onLoadingChange={setAdminLoading} />} />
            <Route path="/celebration-music" element={<AdminCelebrationMusicView showToast={showToast} onLoadingChange={setAdminLoading} />} />
            <Route path="/notifications" element={<AdminNotificationsView showToast={showToast} onLoadingChange={setAdminLoading} onCountChange={setAdminPendingCount} />} />
            <Route path="/profile" element={<AdminProfileView currentUser={adminUser} onUserUpdate={handleAdminLogin} showToast={showToast} onLoadingChange={setAdminLoading} />} />
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

      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="Meet the Team" kicker="Internship Project · TDT Powersteel CRM">
        <AboutContent />
      </Modal>
    </div>
  )
}
