import { useState, useMemo, useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import './App.css'
import { formatCurrencyCompact, displayRole, shortStageLabel, getTodayISO, formatRelativeDays } from './utils'
import { clearToken, getUser, saveUser, apiFetch, API_BASE } from './api'
import { resetThemeToDefaults } from './hooks/useTheme'
import {
  CUSTOMER_STATUSES,
  TASK_TYPES,
  TASK_PRIORITIES,
  STAGE_WORKFLOW,
  DEAL_STAGES,
  SHORT_STAGE_LABEL,
  REGION_BRANCHES,
  NAV_CONFIG,
  VIEW_META
} from './constants'
import DashboardView from './views/DashboardView'
import CustomersView from './views/CustomersView'
import PipelineView  from './views/PipelineView'
import TasksView     from './views/TasksView'
import useCRMData    from './hooks/useCRMData'
import { useTheme } from './hooks/useTheme'
import LoginPage     from './components/LoginPage'
import Modal         from './components/Modal'
import ProfileModal   from './components/ProfileModal'
import ImageAdjustModal from './components/ImageAdjustModal'
import AboutContent  from './components/AboutContent'
import PageSkeleton  from './components/SkeletonLoader'
import LeadForm      from './components/forms/LeadForm'
import TaskForm      from './components/forms/TaskForm'
import ThemeToggle   from './components/ThemeToggle'
import { IconCheck, IconSearch } from './components/Icons'

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeView = location.pathname.substring(1) || 'dashboard'

  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  const [notice, setNotice] = useState('TDT Powersteel CRM is focused on clean data, pipeline visibility, activity tracking, and a 5 KPI dashboard.')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showAbout, setShowAbout]       = useState(false)
  const [showProfile, setShowProfile]   = useState(false)
  const [showAdjust, setShowAdjust]     = useState(false)
  const [tempProfilePic, setTempProfilePic] = useState(null)
  const [toast, setToast] = useState(null)
  const [currentUser, setCurrentUser] = useState(getUser())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarClosing, setSidebarClosing] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const sidebarCloseTimer = useRef(null)
  const [showDueDateAlert, setShowDueDateAlert] = useState(false)
  const dueAlertShown = useRef(false)
  
  // Theme management
  const { theme, setTheme, neonColor, setNeonColor } = useTheme()

  // ─── Performance: Search Debounce ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  function handleLogin(user) {
    saveUser(user)
    setCurrentUser(user)
    if (user.theme) setTheme(user.theme)
    if (user.neonColor) setNeonColor(user.neonColor)
    setNotice(`Welcome back, ${user.name}! You are logged in to the ${user.branch} branch.`)
  }

  function handleLogout() {
    resetThemeToDefaults()   // synchronous: clears sessionStorage + style tag before re-render
    clearToken()
    setCurrentUser(null)
    setShowDueDateAlert(false)
    dueAlertShown.current = false
    setTheme('dark')
    setNeonColor('pink')
    setNotice('You have been logged out.')
  }

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const { data, actions, stopAllCelebration } = useCRMData({ setNotice, showToast, currentUser })
  const { companies, customers, contacts, leads, deals, tasks, teamMembers, dealContactMap, loading, activeBranch, activeRegion } = data
  const { setActiveBranch, setActiveRegion, fetchCompanies, fetchContacts } = actions

  // ─── Stop celebration audio/overlay on route change ─────────────────────────
  const stopAllCelebrationRef = useRef(null)
  useEffect(() => {
    stopAllCelebrationRef.current = stopAllCelebration
  }, [stopAllCelebration])
  useEffect(() => {
    if (stopAllCelebrationRef.current) stopAllCelebrationRef.current()
  }, [location.pathname])

  // ─── Derived data ───────────────────────────────────────────────────────────

  const activeDeals = useMemo(() => 
    deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'),
  [deals])

  const pipelineValue = useMemo(() => 
    activeDeals.reduce((sum, d) => sum + Number(d.value || 0), 0),
  [activeDeals])

  const openTasks = useMemo(() => 
    tasks.filter((t) => t.status !== 'Completed'),
  [tasks])

  const dueToday = useMemo(() => 
    openTasks.filter((t) => t.dueDate === getTodayISO()),
  [openTasks])

  // ─── Compute tasks due within ±3 days ──────────────────────────────────
  const dueSoonTasks = useMemo(() => {
    if (!currentUser) return []
    const todayStr = getTodayISO()
    const todayDate = new Date(todayStr)
    const threeDaysAgo = new Date(todayDate)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeAgoStr = threeDaysAgo.toISOString().split('T')[0]
    const threeDaysLater = new Date(todayDate)
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const threeLaterStr = threeDaysLater.toISOString().split('T')[0]

    return openTasks.filter(t => {
      if (t.status === 'Completed') return false
      if (!t.dueDate) return false
      if (String(t.ownerId) !== String(currentUser.id)) return false
      return t.dueDate >= threeAgoStr && t.dueDate <= threeLaterStr
    }).sort((a, b) => {
      if (a.dueDate < b.dueDate) return -1
      if (a.dueDate > b.dueDate) return 1
      return 0
    })
  }, [openTasks, currentUser])

  // ─── Show due date modal once per session ──────────────────────────────
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (dueSoonTasks.length > 0 && !dueAlertShown.current) {
      dueAlertShown.current = true
      setShowDueDateAlert(true)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dueSoonTasks])

  const currentMonth = useMemo(() => getTodayISO().slice(0, 7), [])

  const newLeads = useMemo(() => 
    leads.filter((l) => l.createdAt?.startsWith(currentMonth)),
  [leads, currentMonth])

  const convertedLeads = useMemo(() => 
    leads.filter((l) => l.status === 'Converted'),
  [leads])

  const conversionRate = useMemo(() => 
    leads.length ? Math.floor((convertedLeads.length / leads.length) * 100) : 0,
  [leads, convertedLeads.length])

  const linkedLeadCount = useMemo(() => 
    leads.filter((l) => l.contactNum && l.region).length,
  [leads])

  const linkHealth = useMemo(() => 
    leads.length ? Math.round((linkedLeadCount / leads.length) * 100) : 100,
  [leads, linkedLeadCount])

  const averageDealSize = useMemo(() => 
    activeDeals.length ? Math.floor(pipelineValue / activeDeals.length) : 0,
  [activeDeals.length, pipelineValue])

  const stageSummary = useMemo(() => DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    return { stage, count: stageDeals.length, value: stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0) }
  }), [deals])

  const stageBreakdown = useMemo(() => stageSummary
    .map((s) => `${shortStageLabel(s.stage, SHORT_STAGE_LABEL)} ${s.count}`)
    .join(' | '), [stageSummary])

  const topKpis = useMemo(() => [
    { label: 'New Customers',   value: newLeads.length.toLocaleString(),    meta: 'Customers added this month',                                   accent: 'accent',  route: '/database'  },
    { label: 'Active Deals',    value: activeDeals.length.toLocaleString(), meta: 'Open opportunities being worked',                              accent: 'surface', route: '/pipeline'  },
    { label: 'Deals per Stage', value: `${stageSummary.filter((s) => s.count > 0).length} stages`, meta: stageBreakdown,                         accent: 'alt',     route: '/pipeline'  },
    { label: 'Conversion Rate', value: `${conversionRate}%`,                meta: `${convertedLeads.length} of ${leads.length} customers converted`,  accent: 'surface', route: '/database'  },
    { label: 'Pipeline Value',  value: formatCurrencyCompact(pipelineValue), meta: 'Expected revenue across active deals',                        accent: 'accent',  route: '/pipeline'  },
  ], [newLeads.length, activeDeals.length, stageSummary, stageBreakdown, conversionRate, convertedLeads.length, leads.length, pipelineValue])

  const searchSuggestions = useMemo(() => {
    if (activeView !== 'tasks') return []
    const companyNames = openTasks.map(t => {
      const deal = deals.find(d => d.id === t.dealId)
      return t.companyName || companies.find(c => c.id === deal?.companyId)?.name
    }).filter(Boolean)
    return [...new Set(companyNames)].sort()
  }, [activeView, openTasks, deals, companies])

  // ─── Actions Wrapper ─────────────────────────────────────────────────────────

  const handleCreateLead = async (form) => {
    const result = await actions.createLead(form);
    if (result?.error) return result
    setSelectedLeadId(result.lead.id)
    return result
  }

  const handleCreateTask = async (form) => {
    return await actions.createTask(form, DEAL_STAGES);
  }

  async function fetchDealContacts(dealId) {
    try {
      const res = await apiFetch(`/api/deals/${dealId}/contacts`)
      if (res.ok) return res.json()
      console.error('Failed to fetch deal contacts:', res.status)
      return []
    } catch (err) {
      console.error('Error fetching deal contacts:', err)
      return []
    }
  }

  // ─── Navigation helpers ─────────────────────────────────────────────────────

  function focusSection(viewId, sectionId, message) {
    navigate(`/${viewId}`)
    setNotice(message)
    window.setTimeout(() => {
      const section = document.getElementById(sectionId)
      if (!section) return
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const target = section.querySelector('input, select, textarea, button')
      if (target instanceof HTMLElement) target.focus()
    }, 80)
  }

  function handleViewChange(viewId) {
    navigate(`/${viewId}`)
    setSearchInput('')
    setSearchQuery('')
    setShowLeadForm(false)
    setShowTaskForm(false)
    setNotice(`${VIEW_META[viewId]?.title || viewId} is active.`)
    // Keep sidebar state as is during navigation
  }

  function handlePrimaryAction() {
    if (activeView === 'dashboard') {
      setShowLeadForm(true)
      return focusSection('database', 'lead-form', 'Fast lead entry is ready.')
    }
    if (activeView === 'database') {
      setShowLeadForm(true)
      return setNotice('New customer entry is ready.')
    }
    // Consolidated: Pipeline now uses Task flow for entry
    setShowTaskForm(true)
    focusSection(activeView === 'pipeline' ? 'pipeline' : 'tasks', 'task-form', 'Activity entry is ready.')
  }

  async function handleShareCurrentView() {
    const summary = `${VIEW_META[activeView].title} | new leads ${newLeads.length}, active deals ${activeDeals.length}, conversion ${conversionRate}%, pipeline ${formatCurrencyCompact(pipelineValue)}`
    try {
      await navigator.clipboard.writeText(summary)
      setNotice('Current view summary copied to clipboard.')
    } catch {
      setNotice('Clipboard access was blocked.')
    }
  }

  const primaryActionLabel =
    activeView === 'database' ? 'New customer'
    : activeView === 'pipeline' ? 'Add task'
    : activeView === 'tasks' ? 'Add task'
    : 'New lead'

  const navItems = useMemo(() => NAV_CONFIG.map((item) => ({
    ...item,
    badge: item.id === 'dashboard' ? '5'
      : item.id === 'database'  ? `${customers.length}`
      : item.id === 'pipeline'  ? `${activeDeals.length}`
      : `${openTasks.length}`,
  })), [customers.length, activeDeals.length, openTasks.length])

  const currentMeta = VIEW_META[activeView] || VIEW_META.dashboard

  // ─── Sidebar Hover Delay ─────────────────────────────────────────────────────
  const openSidebar = () => {
    if (sidebarCloseTimer.current) {
      clearTimeout(sidebarCloseTimer.current)
      sidebarCloseTimer.current = null
    }
    setSidebarOpen(true)
  }

  const closeSidebarWithDelay = () => {
    sidebarCloseTimer.current = setTimeout(() => {
      setSidebarOpen(false)
      setSidebarClosing(true)
      setTimeout(() => setSidebarClosing(false), 300)
    }, 30)
  }

  // ─── View routing ────────────────────────────────────────────────────────────

  function renderRoutes() {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <DashboardView
            topKpis={topKpis}
            stageSummary={stageSummary}
            deals={deals}
            leads={leads}
            contacts={contacts}
            companies={companies}
            openTasks={openTasks}
            linkHealth={linkHealth}
            currentUser={currentUser}
            teamMembers={teamMembers}
            showCustomize={showCustomize}
            setShowCustomize={setShowCustomize}
          />
        } />
        <Route path="/database" element={
          <CustomersView
            setNotice={setNotice}
            customers={customers}
            contacts={contacts}
            teamMembers={teamMembers}
            selectedCustomerId={selectedLeadId}
            setSelectedCustomerId={setSelectedLeadId}
            customerStatuses={CUSTOMER_STATUSES}
            onCreateCustomer={handleCreateLead}
            linkHealth={linkHealth}
            deals={deals}
            dealStages={DEAL_STAGES}
            companies={companies}
            onCreateTask={handleCreateTask}
            acknowledgeCustomer={actions.acknowledgeCustomer}
            fetchDealContacts={fetchDealContacts}
            fetchCompanies={fetchCompanies}
            fetchContacts={fetchContacts}
            showCustomerForm={showLeadForm}
            setShowCustomerForm={setShowLeadForm}
            currentUser={currentUser}
            searchQuery={searchQuery}
            onReassignLead={actions.reassignLead}
            endorseCustomer={actions.endorseCustomer}
          />
        } />
        <Route path="/pipeline" element={
          <PipelineView
            deals={deals}
            tasks={tasks}
            leads={leads}
            contacts={contacts}
            companies={companies}
            teamMembers={teamMembers}
            activeBranch={activeBranch}
            currentUser={currentUser}
            activeDeals={activeDeals}
            pipelineValue={pipelineValue}
            averageDealSize={averageDealSize}
            dealStages={DEAL_STAGES}
            stageWorkflow={STAGE_WORKFLOW}
            setNotice={setNotice}
            handleDealStageChange={actions.updateDealStage}
            handleDealUpdate={actions.updateDeal}
            handleTaskStatusToggle={actions.toggleTaskStatus}
            onViewTasks={() => {
              navigate('/tasks')
            }}
            searchQuery={searchQuery}
          />
        } />
        <Route path="/tasks" element={
          <TasksView
            tasks={tasks}
            contacts={contacts}
            openTasks={openTasks}
            dueToday={dueToday}
            deals={deals}
            companies={companies}
            teamMembers={teamMembers}
            dealContactMap={dealContactMap}
            onCreateTask={handleCreateTask}
            handleTaskStatusToggle={actions.toggleTaskStatus}
            reassignTask={actions.reassignTask}
            searchQuery={searchQuery}
            onClearSearch={() => { setSearchInput(''); setSearchQuery(''); }}
            currentUser={currentUser}
          />
        } />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    )
  }

  // ─── Guard: show login if not authenticated ──────────────────────────────────
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // ─── Shell ──────────────────────────────────────────────────────────────────

  return (
    <div className={`crm-shell ${sidebarOpen ? 'sidebar-is-open' : ''}`} data-theme={theme}>
      {/* Combined Trigger: Visible at viewport edge when closed, at sidebar edge when open */}
      <div 
        className={`sidebar-hover-trigger ${sidebarClosing ? 'is-closing' : ''}`} 
        onMouseEnter={openSidebar}
      />

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside 
        className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}
        onMouseEnter={openSidebar}
        onMouseLeave={closeSidebarWithDelay}
      >
        <div className="brand-block">
          <img src="/tdt-powersteel-logo.png" alt="TDT Powersteel" className="brand-logo" />
          <div 
            className="brand-user-info" 
            onClick={() => setShowProfile(true)} 
            style={{ 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              padding: '10px 14px',
              borderRadius: 'var(--r-md)',
              transition: 'background 0.2s',
              width: '100%',
              boxSizing: 'border-box'
            }} 
            title="My Profile"
          >
            <div 
              className="sidebar-avatar"
              style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--accent)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: 'var(--fs-xl)',
                fontWeight: 800,
                color: 'white',
                flexShrink: 0,
                overflow: 'hidden',
                border: '2px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {currentUser?.profilePic ? (
                <img 
                  src={`${API_BASE}${currentUser.profilePic}`} 
                  alt="" 
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
            </div>
            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <p className="brand-user-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 'var(--fs-lg)' }}>{currentUser?.name}</p>
              <p className="brand-user-role" style={{ fontSize: 'var(--fs-sm)' }}>{displayRole(currentUser?.role)}</p>
              <div className="brand-badges" style={{ marginTop: '4px' }}>
                {currentUser?.role === 'Head of Sales' ? (
                  <div className="brand-branch-badge is-region">{activeRegion || 'All Regions'}</div>
                ) : currentUser?.role === 'Regional Sales Manager' ? (
                  <div className="brand-branch-badge is-region">{currentUser?.region}</div>
                ) : (
                  <div className="brand-branch-badge">{currentUser?.branch}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary CRM navigation">
          <p className="nav-section-label">Navigation</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeView === item.id ? 'is-active' : ''}`}
              onClick={() => handleViewChange(item.id)}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              <span className="nav-item__copy">
                <span className="nav-item__label">{item.label}</span>
                <span className="nav-item__description">{item.description}</span>
              </span>
              <span className="nav-item__badge">{item.badge}</span>
            </button>
          ))}

        </nav>

        {/* Branch / Region filter — only for Head of Sales and Regional Sales Manager */}
        {(currentUser.role === 'Head of Sales' || currentUser.role === 'Admin' || currentUser.role === 'Regional Sales Manager') && (
          <div className="sidebar-nav-section">
            <p className="nav-section-label u-margin-b-8">Viewing Branch</p>

            {(currentUser.role === 'Head of Sales' || currentUser.role === 'Admin') && (
              <>
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
              </>
            )}

            {currentUser.role === 'Regional Sales Manager' && (
              <select
                className="sidebar-select"
                value={activeBranch}
                onChange={e => setActiveBranch(e.target.value)}
              >
                <option value="">All {currentUser.region}</option>
                {(REGION_BRANCHES[currentUser.region] ?? [currentUser.branch]).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="sidebar-footer">
          <p className="sidebar-label">Today's pulse</p>
          <div className="sidebar-stat">
            <strong>{newLeads.length}</strong>
            <span>New leads logged for the current month</span>
          </div>
          <div className="sidebar-stat">
            <strong>{openTasks.length}</strong>
            <span>Open tasks still waiting on follow-through</span>
          </div>
          
          <ThemeToggle
            theme={theme}
            onThemeChange={setTheme}
            neonColor={neonColor}
            onNeonColorChange={setNeonColor}
            defaultTheme={currentUser?.theme}
            defaultNeonColor={currentUser?.neonColor}
            onSaveDefault={(t, nc) => {
              apiFetch('/api/team/profile/preferences', {
                method: 'PUT',
                body: JSON.stringify({ theme: t, neonColor: nc }),
              })
              const stored = getUser()
              if (stored) saveUser({ ...stored, theme: t, neonColor: nc })
            }}
          />
          
          <div className="sidebar-user">
            <button type="button" className="about-button" style={{ marginBottom: '4px' }} onClick={() => setShowProfile(true)}>My Profile</button>
            <button type="button" className="about-button" onClick={() => setShowAbout(true)}>About this system</button>
            <button type="button" className="logout-button" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </aside>

      <main className="dashboard" id="crm-main-content">
        <header className="top-bar">
          <button
            type="button"
            className={`hamburger-btn ${sidebarOpen ? 'is-open' : ''}`}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span /><span /><span />
          </button>

          <div className="top-bar-title">
            <p className="eyebrow">{currentMeta.eyebrow}</p>
            <h2 className="page-title">{currentMeta.title}</h2>
            <p className="page-description">{currentMeta.description}</p>
          </div>
          {loading && <div className="top-bar-loader" aria-hidden="true" />}
          {(currentUser?.role === 'Head of Sales' || currentUser?.role === 'Admin' || currentUser?.role === 'Regional Sales Manager') && (
            <div className="top-bar-context-badge">
              {currentUser.role === 'Regional Sales Manager'
                ? currentUser.region
                : (activeRegion || 'All Regions')}
              <span className="context-sep">/</span>
              {activeBranch || 'All Branches'}
            </div>
          )}
          <div className="top-bar-actions">
            <label className="search-field" htmlFor="global-search-input">
              <span className="search-icon" aria-hidden="true"><IconSearch size={16} /></span>
              <input
                id="global-search-input"
                name="searchInput"
                type="search"
                list="global-search-suggestions"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={currentMeta.searchPlaceholder}
                aria-label={currentMeta.searchPlaceholder}
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <datalist id="global-search-suggestions">
                {searchSuggestions.map(s => <option key={s} value={s} />)}
              </datalist>
            </label>
            <button type="button" className="secondary-button" onClick={handleShareCurrentView}>Share view</button>
            {activeView === 'dashboard' && (
              <button type="button" className="secondary-button" onClick={() => setShowCustomize(true)}>Customize Layout</button>
            )}
            {activeView !== 'pipeline' && activeView !== 'dashboard' && (
              <button type="button" className="primary-button" onClick={handlePrimaryAction}>{primaryActionLabel}</button>
            )}
          </div>
        </header>

        <div className="notice-bar" aria-live="polite">
          <span className="status-dot" />
          <strong>Live state</strong>
          <span>{notice}</span>
        </div>

        {loading ? (
          <div className="view-content">
            <PageSkeleton view={activeView} />
          </div>
        ) : (
          <div className="view-content">
            {renderRoutes()}
          </div>
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          <span className="toast__icon"><IconCheck /></span>
          <span>{toast}</span>
        </div>
      )}

      <Modal
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        title="Log a task & Update deal"
        kicker="Activity entry"
      >
        <TaskForm
          deals={deals}
          companies={companies}
          contacts={contacts}
          teamMembers={teamMembers}
          taskTypes={TASK_TYPES}
          taskPriorities={TASK_PRIORITIES}
          dealStages={DEAL_STAGES}
          currentUser={currentUser}
          fetchDealContacts={fetchDealContacts}
          fetchCompanies={fetchCompanies}
          fetchContacts={fetchContacts}
          onCancel={() => setShowTaskForm(false)}
          onSubmit={async (form) => {
            try {
              await handleCreateTask(form)
              setShowTaskForm(false)
            } catch (err) {
              console.error('Task creation error:', err)
              showToast(`Failed to create task: ${err.message}`)
            }
          }}
        />
      </Modal>

      <Modal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
        title="Meet the Team"
        kicker="Internship Project · TDT Powersteel CRM"
      >
        <AboutContent />
      </Modal>

      <Modal
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        title="Add a new customer"
        kicker="Fast entry"
      >
        <LeadForm
          teamMembers={teamMembers}
          currentUser={currentUser}
          contacts={contacts}
          onCancel={() => setShowLeadForm(false)}
          onSubmit={async (form) => {
            const result = await handleCreateLead(form)
            if (result?.error) return result
            setShowLeadForm(false)
          }}
        />
      </Modal>

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        currentUser={currentUser}
        onPasswordChange={actions.changePassword}
        onPhotoUpload={actions.updateProfilePhoto}
        onPhotoRemove={actions.deleteProfilePhoto}
        onUploadSuccess={(url) => {
          setTempProfilePic(url)
          setShowProfile(false)
          setShowAdjust(true)
        }}
      />

      <ImageAdjustModal
        isOpen={showAdjust}
        onClose={() => {
          setShowAdjust(false)
          setTempProfilePic(null)
        }}
        imageUrl={tempProfilePic ? `${API_BASE}${tempProfilePic}` : (currentUser?.profilePic ? `${API_BASE}${currentUser.profilePic}` : '')}
        currentZoom={currentUser?.profileZoom || 1}
        currentOffsetX={currentUser?.profileOffsetX || 0}
        currentOffsetY={currentUser?.profileOffsetY || 0}
        currentRotation={currentUser?.profileRotation || 0}
        onSave={async (zoom, offsetY, offsetX, rotation) => {
          // If we have a tempProfilePic, we are saving a NEW photo.
          // Otherwise, we are just re-adjusting an existing one.
          await actions.savePhotoAdjustment(zoom, offsetY, offsetX, rotation, tempProfilePic)
          
          // Update local state to reflect changes immediately
          const updated = { 
            ...currentUser, 
            profileZoom: zoom, 
            profileOffsetY: offsetY, 
            profileOffsetX: offsetX, 
            profileRotation: rotation 
          }
          if (tempProfilePic) {
            updated.profilePic = tempProfilePic
          }
          
          setCurrentUser(updated)
          saveUser(updated)
          setTempProfilePic(null)
          showToast('Profile photo updated!')
        }}
      />

      <Modal
        isOpen={showDueDateAlert}
        onClose={() => setShowDueDateAlert(false)}
        title="Upcoming Due Dates"
        kicker="Alert"
      >
        <div style={{ padding: '0 24px 24px' }}>
          {dueSoonTasks.length === 0 ? (
            <p className="u-text-muted">No tasks with upcoming due dates.</p>
          ) : (
            dueSoonTasks.map(t => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div>
                  <strong style={{ fontSize: 'var(--fs-sm)' }}>{t.title}</strong>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {t.companyName || t.contact || '—'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 'var(--fs-sm)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color: t.dueDate < getTodayISO() ? 'var(--alert)' : 'var(--warning)',
                  }}
                >
                  {formatRelativeDays(t.dueDate)}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
