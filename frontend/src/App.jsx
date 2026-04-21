import { useState, useMemo } from 'react'
import './App.css'
import { formatCurrencyCompact, matchesSearch } from './utils'
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
  { id: 'database',  label: 'Customer Database',  description: 'Leads, contacts, and companies' },
  { id: 'pipeline',  label: 'Pipeline',           description: 'Opportunity visibility' },
  { id: 'tasks',     label: 'Tasks',              description: 'Follow-ups and activity log' },
]

const VIEW_META = {
  dashboard: { eyebrow: 'In-house CRM prototype', title: 'Dashboard', description: '', searchPlaceholder: 'Search leads, deals, tasks, or companies' },
  database:  { eyebrow: 'Clean data', title: 'Customer Database', description: '', searchPlaceholder: 'Search leads, contacts, companies, or owners' },
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
  const [showContactForm, setShowContactForm] = useState(false)
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  function handleLogin(user) {
    setCurrentUser(user)
    setNotice(`Welcome back, ${user.name}! You are logged in to the ${user.branch} branch.`)
  }

  function handleLogout() {
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

  const topKpis = [
    { label: 'New Customers',   value: newLeads.length.toLocaleString(),    meta: 'Customers added this month',                                   accent: 'accent'  },
    { label: 'Active Deals',    value: activeDeals.length.toLocaleString(), meta: 'Open opportunities being worked',                              accent: 'surface' },
    { label: 'Deals per Stage', value: `${stageSummary.filter((s) => s.count > 0).length} stages`, meta: stageBreakdown,                         accent: 'alt'     },
    { label: 'Conversion Rate', value: `${conversionRate}%`,                meta: `${convertedLeads.length} of ${leads.length} customers converted`,  accent: 'surface' },
    { label: 'Pipeline Value',  value: formatCurrencyCompact(pipelineValue), meta: 'Expected revenue across active deals',                        accent: 'accent'  },
  ]

  // ─── Filtered lists ─────────────────────────────────────────────────────────

  const filteredLeads = leads.filter((l) =>
    matchesSearch(searchQuery, [l.customerName, l.contactNum, l.address, l.region, l.sr, l.branch, l.status]),
  )
  const filteredContacts = contacts.filter((c) =>
    matchesSearch(searchQuery, [c.name, companyMap[c.companyId]?.name, c.role, c.owner, c.email]),
  )
  const filteredCompanies = companies.filter((c) =>
    matchesSearch(searchQuery, [c.name, c.industry, c.city ?? c.website, c.owner, c.status]),
  )
  const filteredDeals = deals.filter(
    (d) =>
      (stageFilter === 'all' || d.stage === stageFilter) &&
      matchesSearch(searchQuery, [d.name, companyMap[d.companyId]?.name, contactMap[d.contactId]?.name, d.owner, d.stage]),
  )
  const filteredTasks = tasks.filter(
    (t) =>
      (taskFilter === 'all' || (taskFilter === 'open' && t.status === 'Open') || (taskFilter === 'completed' && t.status === 'Completed')) &&
      matchesSearch(searchQuery, [t.title, t.type, t.owner, deals.find((d) => d.id === t.dealId)?.name]),
  )

  // ─── Actions Wrapper ─────────────────────────────────────────────────────────

  const handleCreateLead = async (form) => {
    const newLead = await actions.createLead(form);
    setSelectedLeadId(newLead.id)
    setDatabaseTab('leads')
  }

  const handleCreateContact = async (form) => {
    const newContact = await actions.createContact(form);
    setSelectedContactId(newContact.id)
    setDatabaseTab('contacts')
  }

  const handleCreateCompany = async (form) => {
    const newCompany = await actions.createCompany(form);
    setSelectedCompanyId(newCompany.id)
    setDatabaseTab('companies')
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
    setShowContactForm(false)
    setShowCompanyForm(false)
    setShowDealForm(false)
    setShowTaskForm(false)
    setNotice(`${VIEW_META[viewId].title} is active.`)
  }

  function handlePrimaryAction() {
    if (activeView === 'dashboard') {
      setShowLeadForm(true)
      return focusSection('database', 'lead-form', 'Fast lead entry is ready.')
    }
    if (activeView === 'database') {
      if (databaseTab === 'contacts') {
        setShowContactForm(true)
        return setNotice('New contact form is ready.')
      }
      if (databaseTab === 'companies') {
        setShowCompanyForm(true)
        return setNotice('New company form is ready.')
      }
      setShowLeadForm(true)
      return setNotice('Fast lead entry is ready.')
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
    : activeView === 'database' && databaseTab === 'contacts' ? 'New contact'
    : activeView === 'database' && databaseTab === 'companies' ? 'New company'
    : 'New lead'

  const navItems = NAV_CONFIG.map((item) => ({
    ...item,
    badge: item.id === 'dashboard' ? '05'
      : item.id === 'database'  ? `${leads.length + contacts.length + companies.length}`
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
          databaseTab={databaseTab}
          setDatabaseTab={setDatabaseTab}
          setNotice={setNotice}
          filteredLeads={filteredLeads}
          filteredContacts={filteredContacts}
          filteredCompanies={filteredCompanies}
          leads={leads}
          contacts={contacts}
          companies={companies}
          deals={deals}
          teamMembers={teamMembers}
          selectedLeadId={selectedLeadId}
          setSelectedLeadId={setSelectedLeadId}
          selectedContactId={selectedContactId}
          setSelectedContactId={setSelectedContactId}
          selectedCompanyId={selectedCompanyId}
          setSelectedCompanyId={setSelectedCompanyId}
          companyMap={companyMap}
          contactMap={contactMap}
          leadStatuses={LEAD_STATUSES}
          leadSources={LEAD_SOURCES}
          onCreateLead={handleCreateLead}
          handleLeadStatusChange={actions.updateLeadStatus}
          linkHealth={linkHealth}
          showLeadForm={showLeadForm}
          setShowLeadForm={setShowLeadForm}
          showContactForm={showContactForm}
          setShowContactForm={setShowContactForm}
          showCompanyForm={showCompanyForm}
          setShowCompanyForm={setShowCompanyForm}
          onCreateContact={handleCreateContact}
          onCreateCompany={handleCreateCompany}
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
      <aside className="sidebar">
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
          <div>
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
