import { useState, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import './App.css'
import { formatCurrencyCompact, matchesSearch, displayRole, shortStageLabel, getTodayISO } from './utils'
import { clearToken, getUser, saveUser, apiFetch } from './api'
import {
  LEAD_STATUSES,
  CUSTOMER_STATUSES,
  TASK_TYPES,
  TASK_PRIORITIES,
  LEAD_SOURCES,
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
import LoginPage     from './components/LoginPage'
import Modal         from './components/Modal'
import LeadForm      from './components/forms/LeadForm'
import TaskForm      from './components/forms/TaskForm'

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const activeView = location.pathname.substring(1) || 'dashboard'

  const [searchQuery, setSearchQuery]       = useState('')
  const [stageFilter, setStageFilter]       = useState('all')
  const [leadStatusFilter, setLeadStatusFilter] = useState('all')
  const [taskFilter, setTaskFilter]         = useState('open')

  const [leadPage, setLeadPage]             = useState(1)
  const [pipelinePage, setPipelinePage]     = useState(1)
  const [tasksPage, setTasksPage]           = useState(1)

  const [selectedLeadId,    setSelectedLeadId]    = useState(null)

  const [notice, setNotice] = useState('TDT Powersteel CRM is focused on clean data, pipeline visibility, activity tracking, and a 5 KPI dashboard.')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [currentUser, setCurrentUser] = useState(getUser())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogin(user) {
    saveUser(user)
    setCurrentUser(user)
    setNotice(`Welcome back, ${user.name}! You are logged in to the ${user.branch} branch.`)
  }

  function handleLogout() {
    clearToken()
    setCurrentUser(null)
    setNotice('You have been logged out.')
  }

  function showToast(message) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const { data, actions } = useCRMData({ setNotice, showToast, currentUser })
  const { companies, customers, contacts, leads, deals, tasks, teamMembers, loading, activeBranch, activeRegion } = data
  const { setActiveBranch, setActiveRegion } = actions

  // ─── Derived data ───────────────────────────────────────────────────────────

  const companyMap   = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies])
  const contactMap   = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts])
  const activeDeals  = deals.filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')
  const pipelineValue = activeDeals.reduce((sum, d) => sum + Number(d.value || 0), 0)
  const openTasks    = tasks.filter((t) => t.status !== 'Completed')
    const dueToday     = openTasks.filter((t) => t.dueDate === getTodayISO())


  const currentMonth     = getTodayISO().slice(0, 7)
  const newLeads         = leads.filter((l) => l.createdAt?.startsWith(currentMonth))
  const convertedLeads   = leads.filter((l) => l.status === 'Converted')
  const conversionRate   = leads.length ? Math.floor((convertedLeads.length / leads.length) * 100) : 0
  const linkedLeadCount  = leads.filter((l) => l.contactNum && l.region).length
  const linkHealth       = leads.length ? Math.round((linkedLeadCount / leads.length) * 100) : 100
  const averageDealSize  = activeDeals.length ? Math.floor(pipelineValue / activeDeals.length) : 0

  const stageSummary = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    return { stage, count: stageDeals.length, value: stageDeals.reduce((sum, d) => sum + Number(d.value || 0), 0) }
  })

    const stageBreakdown = stageSummary
    .map((s) => `${shortStageLabel(s.stage, SHORT_STAGE_LABEL)} ${s.count}`)
    .join(' | ')


  const topKpis = useMemo(() => [
    { label: 'New Customers',   value: newLeads.length.toLocaleString(),    meta: 'Customers added this month',                                   accent: 'accent'  },
    { label: 'Active Deals',    value: activeDeals.length.toLocaleString(), meta: 'Open opportunities being worked',                              accent: 'surface' },
    { label: 'Deals per Stage', value: `${stageSummary.filter((s) => s.count > 0).length} stages`, meta: stageBreakdown,                         accent: 'alt'     },
    { label: 'Conversion Rate', value: `${conversionRate}%`,                meta: `${convertedLeads.length} of ${leads.length} customers converted`,  accent: 'surface' },
    { label: 'Pipeline Value',  value: formatCurrencyCompact(pipelineValue), meta: 'Expected revenue across active deals',                        accent: 'accent'  },
  ], [newLeads.length, activeDeals.length, stageSummary, stageBreakdown, conversionRate, convertedLeads.length, leads.length, pipelineValue])

  // ─── Filtered lists ─────────────────────────────────────────────────────────

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Handle deal-based status filtering
      if (leadStatusFilter !== 'all') {
        const companyDeals = deals.filter(d => d.companyId === c.id)
        
        if (leadStatusFilter === 'New') {
          // New: No active deals (only Closed or no deals at all)
          if (companyDeals.some(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost')) return false
        } else if (leadStatusFilter === 'Prospect') {
          // Prospect: At least one deal in "New Opportunity"
          if (!companyDeals.some(d => d.stage === 'New Opportunity')) return false
        } else if (leadStatusFilter === 'Negotiation') {
          // Negotiation: At least one deal in "Proposal" or "Negotiation"
          if (!companyDeals.some(d => d.stage === 'Proposal' || d.stage === 'Negotiation')) return false
        } else if (leadStatusFilter === 'Converted') {
          // Converted: At least one deal is Closed (Won or Lost) and owned by current user
          if (!companyDeals.some(d => (d.stage === 'Closed Won' || d.stage === 'Closed Lost') && d.ownerId === currentUser?.id)) return false
        }
      }

      return matchesSearch(searchQuery, [c.name, c.contactNum, c.address, c.region, c.sr, c.branch, c.customerStatus])
    })
  }, [customers, searchQuery, leadStatusFilter, deals, currentUser])

  const filteredDeals = useMemo(() => deals.filter(
    (d) =>
      (stageFilter === 'all' || d.stage === stageFilter) &&
      matchesSearch(searchQuery, [d.name, companyMap[d.companyId]?.name, contactMap[d.contactId]?.name, d.owner, d.stage]),
  ), [deals, stageFilter, searchQuery, companyMap, contactMap])

  const filteredTasks = useMemo(() => tasks.filter(
    (t) => {
      const deal = deals.find((d) => d.id === t.dealId)
      const companyName = t.companyName || companyMap[deal?.companyId]?.name || ''
      
      return (
        (taskFilter === 'all' || 
         (taskFilter === 'open' && t.status === 'Open') || 
         (taskFilter === 'completed' && t.status === 'Completed') ||
         (taskFilter === 'reopened' && t.status === 'Reopened')) &&
        matchesSearch(searchQuery, [t.title, t.type, t.owner, deal?.name, companyName])
      )
    }
  ), [tasks, taskFilter, searchQuery, deals, companyMap])

  // ─── Actions Wrapper ─────────────────────────────────────────────────────────

  const handleCreateLead = async (form) => {
    const newLead = await actions.createLead(form);
    setSelectedLeadId(newLead.id)
  }

  const handleCreateTask = async (form) => {
    await actions.createTask(form, DEAL_STAGES);
  }

  async function fetchDealContacts(dealId) {
    try {
      const res = await apiFetch(`/api/deals/${dealId}/contacts`)
      if (res.ok) return res.json()
      return []
    } catch {
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
    setSearchQuery('')
    setLeadPage(1)
    setPipelinePage(1)
    setTasksPage(1)
    setShowLeadForm(false)
    setShowTaskForm(false)
    setNotice(`${VIEW_META[viewId]?.title || viewId} is active.`)
    setSidebarOpen(false)
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

  const navItems = NAV_CONFIG.map((item) => ({
    ...item,
    badge: item.id === 'dashboard' ? '5'
      : item.id === 'database'  ? `${customers.length}`
      : item.id === 'pipeline'  ? `${activeDeals.length}`
      : `${openTasks.length}`,
  }))

  const currentMeta = VIEW_META[activeView] || VIEW_META.dashboard

  // ─── View routing ────────────────────────────────────────────────────────────

  function renderRoutes() {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <DashboardView
            topKpis={topKpis}
            stageSummary={stageSummary}
            pipelineValue={pipelineValue}
            leads={leads}
            contacts={contacts}
            companies={companies}
            openTasks={openTasks}
            linkHealth={linkHealth}
          />
        } />
        <Route path="/database" element={
          <CustomersView
            setNotice={setNotice}
            filteredCustomers={filteredCustomers}
            customers={customers}
            contacts={contacts}
            teamMembers={teamMembers}
            selectedCustomerId={selectedLeadId}
            setSelectedCustomerId={setSelectedLeadId}
            customerStatuses={CUSTOMER_STATUSES}
            statusFilter={leadStatusFilter}
            setStatusFilter={setLeadStatusFilter}
            onCreateCustomer={handleCreateLead}
            linkHealth={linkHealth}
            deals={deals}
            dealStages={DEAL_STAGES}
            companies={companies}
            onCreateTask={handleCreateTask}
            showCustomerForm={showLeadForm}
            setShowCustomerForm={setShowLeadForm}
            currentUser={currentUser}
            searchQuery={searchQuery}
            page={leadPage}
            setPage={setLeadPage}
          />
        } />
        <Route path="/pipeline" element={
          <PipelineView
            filteredDeals={filteredDeals}
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
            stageFilter={stageFilter}
            setStageFilter={setStageFilter}
            setNotice={setNotice}
            companyMap={companyMap}
            handleDealStageChange={actions.updateDealStage}
            handleDealUpdate={actions.updateDeal}
            handleTaskStatusToggle={actions.toggleTaskStatus}
            currentPage={pipelinePage}
            setCurrentPage={setPipelinePage}
            onViewTasks={(filter) => {
              setTaskFilter(filter)
              setTasksPage(1)
              navigate('/tasks')
            }}
          />
        } />
        <Route path="/tasks" element={
          <TasksView
            filteredTasks={filteredTasks}
            tasks={tasks}
            contacts={contacts}
            openTasks={openTasks}
            dueToday={dueToday}
            deals={deals}
            companies={companies}
            companyMap={companyMap}
            taskTypes={TASK_TYPES}
            taskPriorities={TASK_PRIORITIES}
            dealStages={DEAL_STAGES}
            teamMembers={teamMembers}
            taskFilter={taskFilter}
            setTaskFilter={setTaskFilter}
            onCreateTask={handleCreateTask}
            handleTaskStatusToggle={actions.toggleTaskStatus}
            showTaskForm={showTaskForm}
            setShowTaskForm={setShowTaskForm}
            currentPage={tasksPage}
            setCurrentPage={setTasksPage}
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

  // ─── Shell ──────────────────────────────────────────────────────────────────

  return (
    <div className="crm-shell">
      {/* Invisible hover trigger zone for sidebar */}
      <div 
        className="sidebar-hover-trigger" 
        onMouseEnter={() => setSidebarOpen(true)}
      />

      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside 
        className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="brand-block">
          <img src="/tdt-powersteel-logo.png" alt="TDT Powersteel" className="brand-logo" />
          <div className="brand-user-info">
            <p className="brand-user-name">{currentUser.name}</p>
            <p className="brand-user-role">{displayRole(currentUser.role)}</p>
          </div>
          <div className="brand-badges">
            {currentUser.role === 'Head of Sales' ? (
              <div className="brand-branch-badge is-region">{activeRegion || 'All Regions'}</div>
            ) : currentUser.role === 'Regional Sales Manager' ? (
              <div className="brand-branch-badge is-region">{currentUser.region}</div>
            ) : (
              <div className="brand-branch-badge">{currentUser.branch}</div>
            )}
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
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <p className="nav-section-label" style={{ marginBottom: '8px' }}>Viewing Branch</p>

            {(currentUser.role === 'Head of Sales' || currentUser.role === 'Admin') && (
              <>
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
              </>
            )}

            {currentUser.role === 'Regional Sales Manager' && (
              <select
                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #444', background: '#222222', color: '#ffffff', fontSize: '0.8rem' }}
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
          <div className="sidebar-user">
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
          <div className="top-bar-actions">
            <label className="search-field" htmlFor="global-search-input">
              <span className="search-icon" aria-hidden="true">Search</span>
              <input
                id="global-search-input"
                name="searchQuery"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setLeadPage(1)
                  setPipelinePage(1)
                  setTasksPage(1)
                }}
                placeholder={currentMeta.searchPlaceholder}
                aria-label={currentMeta.searchPlaceholder}
              />
            </label>
            <button type="button" className="secondary-button" onClick={handleShareCurrentView}>Share view</button>
            {activeView !== 'pipeline' && (
              <button type="button" className="primary-button" onClick={handlePrimaryAction}>{primaryActionLabel}</button>
            )}
          </div>
        </header>

        <div className="notice-bar" aria-live="polite">
          <strong>Live state</strong>
          <span>{notice}</span>
        </div>

        {loading ? (
          <p style={{ padding: '2rem' }}>Loading data…</p>
        ) : (
          <div className="view-content">
            {renderRoutes()}
          </div>
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          <span className="toast__icon">✓</span>
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
          onCancel={() => setShowTaskForm(false)}
          onSubmit={(form) => {
            handleCreateTask(form)
            setShowTaskForm(false)
          }}
        />
      </Modal>

      <Modal
        isOpen={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        title="Add a new customer"
        kicker="Fast entry"
      >
        <LeadForm
          teamMembers={teamMembers}
          branch={currentUser?.branch}
          onCancel={() => setShowLeadForm(false)}
          onSubmit={(form) => {
            handleCreateLead(form)
            setShowLeadForm(false)
          }}
        />
      </Modal>
    </div>
  )
}
