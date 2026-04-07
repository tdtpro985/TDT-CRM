import { useState, useEffect } from 'react'
import './App.css'
import { formatCurrencyCompact, matchesSearch, createRecordId } from './utils'
import DashboardView from './views/DashboardView'
import DatabaseView  from './views/DatabaseView'
import PipelineView  from './views/PipelineView'
import TasksView     from './views/TasksView'

const API_BASE    = 'http://localhost:5000'
const CURRENT_DATE = new Date().toISOString().split('T')[0]

const LEAD_STATUSES  = ['New', 'Working', 'Qualified', 'Converted']
const DEAL_STAGES    = ['New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won']
const TASK_TYPES     = ['Call', 'Follow-up', 'Meeting', 'Email']
const TASK_PRIORITIES = ['Low', 'Medium', 'High']
const LEAD_SOURCES   = ['Website', 'Referral', 'Outbound', 'Event', 'Email']

const STAGE_PROBABILITY = {
  'New Opportunity': 20,
  Qualified: 40,
  Proposal: 60,
  Negotiation: 80,
  'Closed Won': 100,
}

const SHORT_STAGE_LABEL = { 'New Opportunity': 'New', 'Closed Won': 'Won' }

const NAV_CONFIG = [
  { id: 'dashboard', label: 'Dashboard',         description: '5 KPI overview' },
  { id: 'database',  label: 'Customer Database',  description: 'Leads, contacts, and companies' },
  { id: 'pipeline',  label: 'Pipeline',           description: 'Opportunity visibility' },
  { id: 'tasks',     label: 'Tasks',              description: 'Follow-ups and activity log' },
]

const VIEW_META = {
  dashboard: { eyebrow: 'In-house CRM prototype', title: 'TDT Powersteel CRM dashboard built around clean data and visibility', description: 'Track leads, deals, and sales activities efficiently while keeping the first release focused on the essentials.', searchPlaceholder: 'Search leads, deals, tasks, or companies' },
  database:  { eyebrow: 'Clean data', title: 'One record per lead, contact, and company', description: 'Keep customer data linked properly so follow-ups, deal ownership, and reporting stay reliable.', searchPlaceholder: 'Search leads, contacts, companies, or owners' },
  pipeline:  { eyebrow: 'Pipeline visibility', title: 'See every opportunity and expected revenue clearly', description: 'Track stages, expected close dates, and pipeline value in one simple view.', searchPlaceholder: 'Search deal, company, stage, or owner' },
  tasks:     { eyebrow: 'Activity tracking', title: 'Keep follow-ups, calls, and next actions on schedule', description: 'Simple task tracking keeps sales activity visible and fast to update.', searchPlaceholder: 'Search tasks, deals, owners, or due dates' },
}

function getProbabilityForStage(stage) { return STAGE_PROBABILITY[stage] ?? 100 }
function shortStageLabel(stage)        { return SHORT_STAGE_LABEL[stage] ?? stage }

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeView, setActiveView]         = useState('dashboard')
  const [searchQuery, setSearchQuery]       = useState('')
  const [databaseTab, setDatabaseTab]       = useState('leads')
  const [stageFilter, setStageFilter]       = useState('all')
  const [taskFilter, setTaskFilter]         = useState('open')

  const [companies,    setCompanies]    = useState([])
  const [contacts,     setContacts]     = useState([])
  const [leads,        setLeads]        = useState([])
  const [deals,        setDeals]        = useState([])
  const [tasks,        setTasks]        = useState([])
  const [teamMembers,  setTeamMembers]  = useState([])
  const [loading,      setLoading]      = useState(true)

  const [selectedLeadId,    setSelectedLeadId]    = useState(null)
  const [selectedContactId, setSelectedContactId] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)

  const [leadForm, setLeadForm] = useState({ name: '', companyId: '', phone: '', source: LEAD_SOURCES[0], owner: '', nextStep: '' })
  const [dealForm, setDealForm] = useState({ name: '', companyId: '', contactId: '', leadId: '', stage: DEAL_STAGES[0], value: '', expectedClose: '', owner: teamMembers[0] ?? '' })
  const [taskForm, setTaskForm] = useState({ title: '', type: TASK_TYPES[1], owner: '', dealId: '', dueDate: '', priority: 'Medium' })

  const [notice, setNotice] = useState('TDT Powersteel CRM is focused on clean data, pipeline visibility, activity tracking, and a 5 KPI dashboard.')

  // ─── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadAll() {
      try {
        const [companiesRes, contactsRes, leadsRes, dealsRes, activitiesRes, teamRes] =
          await Promise.all([
            fetch(`${API_BASE}/api/companies`),
            fetch(`${API_BASE}/api/contacts`),
            fetch(`${API_BASE}/api/leads`),
            fetch(`${API_BASE}/api/deals`),
            fetch(`${API_BASE}/api/activities`),
            fetch(`${API_BASE}/api/team`),
          ])

        setCompanies(await companiesRes.json())
        setContacts(
          (await contactsRes.json()).map((c) => ({ ...c, lastActivity: c.lastTouch ?? '' })),
        )
        setLeads(await leadsRes.json())
        setDeals(
          (await dealsRes.json()).map((d) => ({
            ...d,
            expectedClose: d.closeDate ?? '',
            probability: d.probability ?? getProbabilityForStage(d.stage),
          })),
        )
        setTasks(
          (await activitiesRes.json()).map((a) => ({
            ...a,
            title: a.subject ?? a.title ?? '',
            priority: a.priority ?? 'Medium',
            status: ['Completed', 'Open'].includes(a.status) ? a.status : 'Open',
          })),
        )
        setTeamMembers((await teamRes.json()).map((u) => u.name))
      } catch {
        setNotice('Backend is not reachable. Start the Flask server to load live data.')
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  // Auto-select first record when data loads
  useEffect(() => { if (leads.length    && !selectedLeadId)    setSelectedLeadId(leads[0].id)        }, [leads])
  useEffect(() => { if (contacts.length && !selectedContactId) setSelectedContactId(contacts[0].id)  }, [contacts])
  useEffect(() => { if (companies.length && !selectedCompanyId) setSelectedCompanyId(companies[0].id) }, [companies])

  // Pre-fill form defaults once data loads
  useEffect(() => {
    if (teamMembers.length && !leadForm.owner) {
      setLeadForm((f) => ({ ...f, owner: teamMembers[0] }))
    }
  }, [teamMembers])

  useEffect(() => {
    if (teamMembers.length && !dealForm.owner) {
      setDealForm((f) => ({ ...f, owner: teamMembers[0] }))
    }
  }, [teamMembers])

  useEffect(() => {
    if (deals.length && !taskForm.dealId) {
      setTaskForm((f) => ({ ...f, dealId: deals[0].id, owner: teamMembers[0] ?? '' }))
    }
  }, [deals, teamMembers])

  // ─── Derived data ───────────────────────────────────────────────────────────

  const companyMap   = Object.fromEntries(companies.map((c) => [c.id, c]))
  const contactMap   = Object.fromEntries(contacts.map((c) => [c.id, c]))
  const activeDeals  = deals.filter((d) => d.stage !== 'Closed Won')
  const pipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0)
  const openTasks    = tasks.filter((t) => t.status !== 'Completed')
  const dueToday     = openTasks.filter((t) => t.dueDate === CURRENT_DATE)

  const currentMonth     = CURRENT_DATE.slice(0, 7)
  const newLeads         = leads.filter((l) => l.createdAt?.startsWith(currentMonth))
  const convertedLeads   = leads.filter((l) => l.status === 'Converted')
  const conversionRate   = leads.length ? Math.round((convertedLeads.length / leads.length) * 100) : 0
  const linkedLeadCount  = leads.filter((l) => l.companyId && l.phone).length
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
    { label: 'New Leads',       value: newLeads.length.toLocaleString(),    meta: 'Leads created this month',                                    accent: 'accent'  },
    { label: 'Active Deals',    value: activeDeals.length.toLocaleString(), meta: 'Open opportunities being worked',                              accent: 'surface' },
    { label: 'Deals per Stage', value: `${stageSummary.filter((s) => s.count > 0).length} stages`, meta: stageBreakdown,                         accent: 'alt'     },
    { label: 'Conversion Rate', value: `${conversionRate}%`,                meta: `${convertedLeads.length} of ${leads.length} leads converted`,  accent: 'surface' },
    { label: 'Pipeline Value',  value: formatCurrencyCompact(pipelineValue), meta: 'Expected revenue across active deals',                        accent: 'accent'  },
  ]

  // ─── Filtered lists ─────────────────────────────────────────────────────────

  const filteredLeads = leads.filter((l) =>
    matchesSearch(searchQuery, [l.name, companyMap[l.companyId]?.name, l.phone, l.source, l.owner, l.status, l.nextStep]),
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

  // ─── Form change handlers ───────────────────────────────────────────────────

  function handleLeadFormChange(e) {
    const { name, value } = e.target
    setLeadForm((current) => ({ ...current, [name]: value }))
  }

  function handleDealFormChange(e) {
    const { name, value } = e.target
    setDealForm((current) => ({ ...current, [name]: value }))
  }

  function handleTaskFormChange(e) {
    const { name, value } = e.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  // ─── Create handlers ────────────────────────────────────────────────────────

  async function handleCreateLead(e) {
    e.preventDefault()
    const newLead = { id: createRecordId('lead'), ...leadForm, name: leadForm.name.trim(), status: 'New', createdAt: CURRENT_DATE, nextStep: leadForm.nextStep.trim() }

    setLeads((current) => [newLead, ...current])
    setSelectedLeadId(newLead.id)
    setSelectedContactId(null)
    setSelectedCompanyId(newLead.companyId)
    setDatabaseTab('leads')
    setLeadForm({ name: '', companyId: '', phone: '', source: LEAD_SOURCES[0], owner: teamMembers[0] ?? '', nextStep: '' })

    try {
      await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      })
      setNotice(`${newLead.name} was saved to the database.`)
    } catch {
      setNotice(`${newLead.name} was added locally — backend not reachable.`)
    }
  }

  async function handleCreateDeal(e) {
    e.preventDefault()
    const newDeal = { id: createRecordId('deal'), ...dealForm, name: dealForm.name.trim(), value: Number(dealForm.value), probability: getProbabilityForStage(dealForm.stage) }

    setDeals((current) => [newDeal, ...current])
    setDealForm({ name: '', companyId: '', contactId: '', leadId: '', stage: DEAL_STAGES[0], value: '', expectedClose: '', owner: teamMembers[0] ?? '' })

    try {
      await fetch(`${API_BASE}/api/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newDeal, closeDate: newDeal.expectedClose }),
      })
      setNotice(`${newDeal.name} was saved to the database.`)
    } catch {
      setNotice(`${newDeal.name} was added locally — backend not reachable.`)
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault()
    const newTask = { id: createRecordId('task'), ...taskForm, title: taskForm.title.trim(), status: 'Open' }

    setTasks((current) => [newTask, ...current])
    setTaskForm({ title: '', type: TASK_TYPES[1], owner: teamMembers[0] ?? '', dealId: deals[0]?.id ?? '', dueDate: '', priority: 'Medium' })

    try {
      await fetch(`${API_BASE}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTask, subject: newTask.title }),
      })
      setNotice(`${newTask.title} was saved to the database.`)
    } catch {
      setNotice(`${newTask.title} was added locally — backend not reachable.`)
    }
  }

  // ─── Status / stage update handlers ────────────────────────────────────────

  function handleLeadStatusChange(leadId, nextStatus) {
    setLeads((current) => current.map((l) => l.id === leadId ? { ...l, status: nextStatus } : l))
    setNotice('Lead status updated in the clean-data registry.')
  }

  function handleDealStageChange(dealId, nextStage) {
    setDeals((current) =>
      current.map((d) => d.id === dealId ? { ...d, stage: nextStage, probability: getProbabilityForStage(nextStage) } : d),
    )
    setNotice('Pipeline stage updated successfully.')
  }

  function handleTaskStatusToggle(taskId) {
    setTasks((current) =>
      current.map((t) => t.id === taskId ? { ...t, status: t.status === 'Completed' ? 'Open' : 'Completed' } : t),
    )
    setNotice('Task status updated in the activity tracker.')
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
    setNotice(`${VIEW_META[viewId].title} is active.`)
  }

  function handlePrimaryAction() {
    if (activeView === 'dashboard' || activeView === 'database') return focusSection('database', 'lead-form', 'Fast lead entry is ready.')
    if (activeView === 'pipeline') return focusSection('pipeline', 'deal-form', 'Deal entry is ready.')
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

  const primaryActionLabel = activeView === 'pipeline' ? 'New deal' : activeView === 'tasks' ? 'Add task' : 'New lead'

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
          leadForm={leadForm}
          handleLeadFormChange={handleLeadFormChange}
          handleCreateLead={handleCreateLead}
          handleLeadStatusChange={handleLeadStatusChange}
          linkHealth={linkHealth}
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
          dealForm={dealForm}
          handleDealFormChange={handleDealFormChange}
          handleCreateDeal={handleCreateDeal}
          handleDealStageChange={handleDealStageChange}
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
        taskForm={taskForm}
        handleTaskFormChange={handleTaskFormChange}
        handleCreateTask={handleCreateTask}
        handleTaskStatusToggle={handleTaskStatusToggle}
      />
    )
  }

  // ─── Shell ──────────────────────────────────────────────────────────────────

  return (
    <div className="crm-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-head">
            <img src="/tdt-powersteel-logo.png" alt="TDT Powersteel" className="brand-logo" />
            <div className="brand-copy">
              <p className="brand-kicker"></p>
              <h1 className="brand-title">TDT Powersteel</h1>
              <p className="brand-name">In-house customer relationship management</p>
            </div>
          </div>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-label">Workspace status</p>
          <strong>Built for lead, deal, and activity tracking</strong>
          <span>Focused on clean customer data, pipeline visibility, task tracking, and a five-KPI dashboard for the first three-month prototype.</span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary CRM navigation">
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
          <p className="sidebar-label">Today&apos;s pulse</p>
          <div className="sidebar-stat">
            <strong>{newLeads.length}</strong>
            <span>New leads logged for the current month</span>
          </div>
          <div className="sidebar-stat">
            <strong>{openTasks.length}</strong>
            <span>Open tasks still waiting on follow-through</span>
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

        {loading ? <p style={{ padding: '2rem' }}>Loading data…</p> : renderView()}
      </main>
    </div>
  )
}
