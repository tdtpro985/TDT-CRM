import { useState, useMemo } from 'react'
import './App.css'
import { formatCurrencyCompact, matchesSearch } from './utils'
import { clearToken, getUser, saveUser } from './api'
import DashboardView from './views/DashboardView'
import DatabaseView  from './views/DatabaseView'
import PipelineView  from './views/PipelineView'
import TasksView     from './views/TasksView'
import useCRMData    from './hooks/useCRMData'
import LoginPage     from './components/LoginPage'

const CURRENT_DATE = new Date().toISOString().split('T')[0]

const LEAD_STATUSES  = ['New', 'Working', 'Qualified', 'Converted']
const DEAL_STAGES    = ['New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won']
const TASK_TYPES     = ['Call', 'Follow-up', 'Meeting', 'Email']
const TASK_PRIORITIES = ['Low', 'Medium', 'High']
const LEAD_SOURCES   = ['Website', 'Referral', 'Outbound', 'Event', 'Email']

const SHORT_STAGE_LABEL = { 'New Opportunity': 'New', 'Closed Won': 'Won' }

const NAV_CONFIG = [
  { id: 'dashboard', label: 'Dashboard',         description: '5 KPI overview' },
  { id: 'database',  label: 'Customer Database',  description: 'Customer records and registry' },
  { id: 'pipeline',  label: 'Pipeline',           description: 'Opportunity visibility' },
  { id: 'tasks',     label: 'Tasks',              description: 'Follow-ups and activity log' },
]

const VIEW_META = {
  dashboard: { eyebrow: 'In-house CRM prototype', title: 'Dashboard', description: '', searchPlaceholder: 'Search leads, deals, tasks, or companies' },
  database:  { eyebrow: 'Clean data', title: 'Customer Database', description: '', searchPlaceholder: 'Search customer name, region, SR, or branch' },
  pipeline:  { eyebrow: 'Pipeline visibility', title: 'Pipeline', description: '', searchPlaceholder: 'Search deal, company, stage, or owner' },
  tasks:     { eyebrow: 'Activity tracking', title: 'Tasks', description: '', searchPlaceholder: 'Search tasks, deals, owners, or due dates' },
}

function shortStageLabel(stage) { return SHORT_STAGE_LABEL[stage] ?? stage }

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeView, setActiveView]         = useState('dashboard')
  const [searchQuery, setSearchQuery]       = useState('')
  const [databaseTab, setDatabaseTab]       = useState('leads')
  const [stageFilter, setStageFilter]       = useState('all')
  const [taskFilter, setTaskFilter]         = useState('open')

  const [selectedLeadId,    setSelectedLeadId]    = useState(null)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)

  const [notice, setNotice] = useState('TDT Powersteel CRM is focused on clean data, pipeline visibility, activity tracking, and a 5 KPI dashboard.')
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
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
  const { companies, contacts, leads, deals, tasks, teamMembers, loading } = data

  // ─── Derived data ───────────────────────────────────────────────────────────

  const companyMap   = useMemo(() => Object.fromEntries(companies.map((c) => [c.id, c])), [companies])
  const contactMap   = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c])), [contacts])
  const activeDeals  = deals.filter((d) => d.stage !== 'Closed Won')
  const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0)
  const openTasks    = tasks.filter((t) => t.status !== 'Completed')
  const dueToday     = openTasks.filter((t) => t.dueDate === CURRENT_DATE)

  const currentMonth     = CURRENT_DATE.slice(0, 7)
  const newLeads         = leads.filter((l) => l.createdAt?.startsWith(currentMonth))
  const convertedLeads   = leads.filter((l) => l.status === 'Converted')
  const conversionRate   = leads.length ? Math.round((convertedLeads.length / leads.length) * 100) : 0
  const linkedLeadCount  = leads.filter((l) => l.contactNum && l.region).length
  const linkHealth       = leads.length ? Math.round((linkedLeadCount / leads.length) * 100) : 100
  const averageDealSize  = activeDeals.length ? Math.round(pipelineValue / activeDeals.length) : 0

  const stageSummary = DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    return { stage, count: stageDeals.length, value: stageDeals.reduce((sum, d) => sum + d.value, 0) }
  })

  const stageBreakdown = stageSummary
    .map((s) => `${shortStageLabel(s.stage)} ${s.count}`)
    .join(' | ')

  const topKpis = useMemo(() => [
    { label: 'New Customers',   value: newLeads.length.toLocaleString(),    meta: 'Customers added this month',                                   accent: 'accent'  },
    { label: 'Active Deals',    value: activeDeals.length.toLocaleString(), meta: 'Open opportunities being worked',                              accent: 'surface' },
    { label: 'Deals per Stage', value: `${stageSummary.filter((s) => s.count > 0).length} stages`, meta: stageBreakdown,                         accent: 'alt'     },
    { label: 'Conversion Rate', value: `${conversionRate}%`,                meta: `${convertedLeads.length} of ${leads.length} customers converted`,  accent: 'surface' },
    { label: 'Pipeline Value',  value: formatCurrencyCompact(pipelineValue), meta: 'Expected revenue across active deals',                        accent: 'accent'  },
  ], [newLeads.length, activeDeals.length, stageSummary, stageBreakdown, conversionRate, convertedLeads.length, leads.length, pipelineValue])

  // ─── Filtered lists ─────────────────────────────────────────────────────────

  const filteredLeads = useMemo(() => leads.filter((l) =>
    matchesSearch(searchQuery, [l.customerName, l.contactNum, l.address, l.region, l.sr, l.branch, l.status]),
  ), [leads, searchQuery])

  const filteredContacts = useMemo(() => contacts.filter((c) =>
    matchesSearch(searchQuery, [c.name, companyMap[c.companyId]?.name, c.role, c.owner, c.email]),
  ), [contacts, searchQuery, companyMap])

  const filteredCompanies = useMemo(() => companies.filter((c) =>
    matchesSearch(searchQuery, [c.name, c.industry, c.city ?? c.website, c.owner, c.status]),
  ), [companies, searchQuery])

  const filteredDeals = useMemo(() => deals.filter(
    (d) =>
      (stageFilter === 'all' || d.stage === stageFilter) &&
      matchesSearch(searchQuery, [d.name, companyMap[d.companyId]?.name, contactMap[d.contactId]?.name, d.owner, d.stage]),
  ), [deals, stageFilter, searchQuery, companyMap, contactMap])

  const filteredTasks = useMemo(() => tasks.filter(
    (t) =>
      (taskFilter === 'all' || (taskFilter === 'open' && t.status === 'Open') || (taskFilter === 'completed' && t.status === 'Completed')) &&
      matchesSearch(searchQuery, [t.title, t.type, t.owner, deals.find((d) => d.id === t.dealId)?.name]),
  ), [tasks, taskFilter, searchQuery, deals])

  // ─── Actions Wrapper ─────────────────────────────────────────────────────────

  const handleCreateLead = async (form) => {
    const newLead = await actions.createLead(form);
    setSelectedLeadId(newLead.id)
    setDatabaseTab('leads')
  }

  const handleCreateDeal = async (form) => {
    await actions.createDeal(form);
  }

  const handleCreateTask = async (form) => {
    await actions.createTask(form, DEAL_STAGES);
  }

  // ─── Navigation helpers ─────────────────────────────────────────────────────

  function focusSection(viewId, sectionId, message) {
    setActiveView(viewId)
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
    setActiveView(viewId)
    setSearchQuery('')
    setShowLeadForm(false)
    setShowDealForm(false)
    setShowTaskForm(false)
    setNotice(`${VIEW_META[viewId].title} is active.`)
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
    if (activeView === 'pipeline') {
      setShowDealForm(true)
      return focusSection('pipeline', 'deal-form', 'Deal entry is ready.')
    }
    setShowTaskForm(true)
    focusSection('tasks', 'task-form', 'Task entry is ready.')
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
    activeView === 'pipeline' ? 'New deal'
    : activeView === 'tasks' ? 'Add task'
    : activeView === 'database' ? 'New customer'
    : 'New lead'

  const navItems = NAV_CONFIG.map((item) => ({
    ...item,
    badge: item.id === 'dashboard' ? '05'
      : item.id === 'database'  ? `${leads.length}`
      : item.id === 'pipeline'  ? `${activeDeals.length}`
      : `${openTasks.length}`,
  }))

  const currentMeta = VIEW_META[activeView]

  // ─── View routing ────────────────────────────────────────────────────────────

  function renderView() {
    if (activeView === 'dashboard') {
      return (
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
      )
    }

    if (activeView === 'database') {
      return (
        <DatabaseView
          setNotice={setNotice}
          filteredLeads={filteredLeads}
          leads={leads}
          teamMembers={teamMembers}
          selectedLeadId={selectedLeadId}
          setSelectedLeadId={setSelectedLeadId}
          leadStatuses={LEAD_STATUSES}
          onCreateLead={handleCreateLead}
          handleLeadStatusChange={actions.updateLeadStatus}
          linkHealth={linkHealth}
          showLeadForm={showLeadForm}
          setShowLeadForm={setShowLeadForm}
          currentUser={currentUser}
        />
      )
    }

    if (activeView === 'pipeline') {
      return (
        <PipelineView
          filteredDeals={filteredDeals}
          deals={deals}
          leads={leads}
          contacts={contacts}
          companies={companies}
          teamMembers={teamMembers}
          activeDeals={activeDeals}
          pipelineValue={pipelineValue}
          averageDealSize={averageDealSize}
          dealStages={DEAL_STAGES}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          setNotice={setNotice}
          companyMap={companyMap}
          onCreateDeal={handleCreateDeal}
          handleDealStageChange={actions.updateDealStage}
          showDealForm={showDealForm}
          setShowDealForm={setShowDealForm}
        />
      )
    }

    return (
      <TasksView
        filteredTasks={filteredTasks}
        tasks={tasks}
        openTasks={openTasks}
        dueToday={dueToday}
        deals={deals}
        companyMap={companyMap}
        taskTypes={TASK_TYPES}
        taskPriorities={TASK_PRIORITIES}
        teamMembers={teamMembers}
        taskFilter={taskFilter}
        setTaskFilter={setTaskFilter}
        onCreateTask={handleCreateTask}
        handleTaskStatusToggle={actions.toggleTaskStatus}
        showTaskForm={showTaskForm}
        setShowTaskForm={setShowTaskForm}
      />
    )
  }

  // ─── Guard: show login if not authenticated ──────────────────────────────────
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  // ─── Shell ──────────────────────────────────────────────────────────────────

  return (
    <div className="crm-shell">
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand-block">
          <img src="/tdt-powersteel-logo.png" alt="TDT Powersteel" className="brand-logo" />
          <p className="brand-name">Sales CRM</p>
          <div className="brand-branch-badge">{currentUser.branch}</div>
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
            <span className="sidebar-user__name">{currentUser.name}</span>
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
          <div className="mobile-brand">
            <img src="/tdt-powersteel-logo.png" alt="TDT" />
            <span>Sales CRM</span>
          </div>
          <div className="top-bar-title">
            <p className="eyebrow">{currentMeta.eyebrow}</p>
            <h2 className="page-title">{currentMeta.title}</h2>
            <p className="page-description">{currentMeta.description}</p>
          </div>
          <div className="top-bar-actions">
            <label className="search-field">
              <span className="search-icon" aria-hidden="true">Search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={currentMeta.searchPlaceholder}
                aria-label={currentMeta.searchPlaceholder}
              />
            </label>
            <button type="button" className="secondary-button" onClick={handleShareCurrentView}>Share view</button>
            <button type="button" className="primary-button" onClick={handlePrimaryAction}>{primaryActionLabel}</button>
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
            {renderView()}
          </div>
        )}
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
