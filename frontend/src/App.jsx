import { useState } from 'react'
import './App.css'

const CURRENT_DATE = '2026-04-07'

const navigationConfig = [
  { id: 'dashboard', label: 'Dashboard', description: '5 KPI overview' },
  {
    id: 'database',
    label: 'Customer Database',
    description: 'Leads, contacts, and companies',
  },
  { id: 'pipeline', label: 'Pipeline', description: 'Opportunity visibility' },
  { id: 'tasks', label: 'Tasks', description: 'Follow-ups and activity log' },
]

const teamMembers = ['Alicia Mendoza', 'Carlo Reyes', 'Mina Velasco']

const leadStatuses = ['New', 'Working', 'Qualified', 'Converted']
const dealStages = [
  'New Opportunity',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed Won',
]
const taskTypes = ['Call', 'Follow-up', 'Meeting', 'Email']
const taskPriorities = ['Low', 'Medium', 'High']
const leadSources = ['Website', 'Referral', 'Outbound', 'Event', 'Email']

const initialCompanies = [
  {
    id: 'company-001',
    name: 'Arcwell Builders',
    industry: 'Construction',
    city: 'Quezon City',
    owner: 'Alicia Mendoza',
    status: 'Prospect',
  },
  {
    id: 'company-002',
    name: 'Northgate Fabrication',
    industry: 'Manufacturing',
    city: 'Caloocan',
    owner: 'Carlo Reyes',
    status: 'Active Account',
  },
  {
    id: 'company-003',
    name: 'Summit Retail Group',
    industry: 'Retail',
    city: 'Pasig',
    owner: 'Mina Velasco',
    status: 'Active Account',
  },
  {
    id: 'company-004',
    name: 'Blue Harbor Logistics',
    industry: 'Logistics',
    city: 'Paranaque',
    owner: 'Alicia Mendoza',
    status: 'Prospect',
  },
  {
    id: 'company-005',
    name: 'Vertex Engineering',
    industry: 'Engineering',
    city: 'Makati',
    owner: 'Carlo Reyes',
    status: 'Strategic Account',
  },
]

const initialContacts = [
  {
    id: 'contact-001',
    name: 'Maya Flores',
    companyId: 'company-001',
    role: 'Procurement Supervisor',
    owner: 'Alicia Mendoza',
    email: 'maya.flores@arcwell.example',
    phone: '+63 917 555 1201',
    lastActivity: '2026-04-06',
  },
  {
    id: 'contact-002',
    name: 'Ethan Cruz',
    companyId: 'company-002',
    role: 'Plant Operations Lead',
    owner: 'Carlo Reyes',
    email: 'ethan.cruz@northgate.example',
    phone: '+63 917 555 1202',
    lastActivity: '2026-04-04',
  },
  {
    id: 'contact-003',
    name: 'Lara Mendoza',
    companyId: 'company-003',
    role: 'Store Development Manager',
    owner: 'Mina Velasco',
    email: 'lara.mendoza@summit.example',
    phone: '+63 917 555 1203',
    lastActivity: '2026-04-03',
  },
  {
    id: 'contact-004',
    name: 'Jonas Reyes',
    companyId: 'company-004',
    role: 'Warehouse Director',
    owner: 'Alicia Mendoza',
    email: 'jonas.reyes@blueharbor.example',
    phone: '+63 917 555 1204',
    lastActivity: '2026-04-07',
  },
  {
    id: 'contact-005',
    name: 'Camille Santos',
    companyId: 'company-005',
    role: 'Commercial Manager',
    owner: 'Carlo Reyes',
    email: 'camille.santos@vertex.example',
    phone: '+63 917 555 1205',
    lastActivity: '2026-04-01',
  },
  {
    id: 'contact-006',
    name: 'Noel Javier',
    companyId: 'company-001',
    role: 'Project Engineer',
    owner: 'Mina Velasco',
    email: 'noel.javier@arcwell.example',
    phone: '+63 917 555 1206',
    lastActivity: '2026-04-05',
  },
]

const initialLeads = [
  {
    id: 'lead-001',
    name: 'Maya Flores',
    companyId: 'company-001',
    contactId: 'contact-001',
    source: 'Website',
    status: 'New',
    owner: 'Alicia Mendoza',
    createdAt: '2026-04-05',
    nextStep: 'Confirm budget and first delivery date',
  },
  {
    id: 'lead-002',
    name: 'Ethan Cruz',
    companyId: 'company-002',
    contactId: 'contact-002',
    source: 'Referral',
    status: 'Working',
    owner: 'Carlo Reyes',
    createdAt: '2026-04-02',
    nextStep: 'Log discovery notes and schedule plant visit',
  },
  {
    id: 'lead-003',
    name: 'Lara Mendoza',
    companyId: 'company-003',
    contactId: 'contact-003',
    source: 'Event',
    status: 'Qualified',
    owner: 'Mina Velasco',
    createdAt: '2026-04-01',
    nextStep: 'Send proposal draft for branch rollout package',
  },
  {
    id: 'lead-004',
    name: 'Jonas Reyes',
    companyId: 'company-004',
    contactId: 'contact-004',
    source: 'Outbound',
    status: 'Converted',
    owner: 'Alicia Mendoza',
    createdAt: '2026-03-25',
    nextStep: 'Move into negotiation with finance team',
  },
  {
    id: 'lead-005',
    name: 'Camille Santos',
    companyId: 'company-005',
    contactId: 'contact-005',
    source: 'Email',
    status: 'Converted',
    owner: 'Carlo Reyes',
    createdAt: '2026-03-22',
    nextStep: 'Prepare final contract turnover',
  },
  {
    id: 'lead-006',
    name: 'Noel Javier',
    companyId: 'company-001',
    contactId: 'contact-006',
    source: 'Website',
    status: 'Working',
    owner: 'Mina Velasco',
    createdAt: '2026-03-29',
    nextStep: 'Validate quantity changes before qualification',
  },
]

const initialDeals = [
  {
    id: 'deal-001',
    name: 'Arcwell Roofing Package',
    companyId: 'company-001',
    contactId: 'contact-001',
    leadId: 'lead-001',
    owner: 'Alicia Mendoza',
    stage: 'New Opportunity',
    value: 680000,
    expectedClose: '2026-04-22',
    probability: 20,
  },
  {
    id: 'deal-002',
    name: 'Northgate Fabrication Reorder',
    companyId: 'company-002',
    contactId: 'contact-002',
    leadId: 'lead-002',
    owner: 'Carlo Reyes',
    stage: 'Qualified',
    value: 940000,
    expectedClose: '2026-04-25',
    probability: 40,
  },
  {
    id: 'deal-003',
    name: 'Summit Retail Fitout Program',
    companyId: 'company-003',
    contactId: 'contact-003',
    leadId: 'lead-003',
    owner: 'Mina Velasco',
    stage: 'Proposal',
    value: 1250000,
    expectedClose: '2026-04-19',
    probability: 60,
  },
  {
    id: 'deal-004',
    name: 'Blue Harbor Warehouse Expansion',
    companyId: 'company-004',
    contactId: 'contact-004',
    leadId: 'lead-004',
    owner: 'Alicia Mendoza',
    stage: 'Negotiation',
    value: 2100000,
    expectedClose: '2026-04-15',
    probability: 80,
  },
  {
    id: 'deal-005',
    name: 'Vertex Annual Supply Contract',
    companyId: 'company-005',
    contactId: 'contact-005',
    leadId: 'lead-005',
    owner: 'Carlo Reyes',
    stage: 'Closed Won',
    value: 3100000,
    expectedClose: '2026-04-03',
    probability: 100,
  },
  {
    id: 'deal-006',
    name: 'Arcwell Spare Inventory Program',
    companyId: 'company-001',
    contactId: 'contact-006',
    leadId: 'lead-006',
    owner: 'Mina Velasco',
    stage: 'Qualified',
    value: 860000,
    expectedClose: '2026-05-02',
    probability: 40,
  },
]

const initialTasks = [
  {
    id: 'task-001',
    title: 'Call Blue Harbor for negotiation notes',
    type: 'Call',
    owner: 'Alicia Mendoza',
    dealId: 'deal-004',
    dueDate: CURRENT_DATE,
    priority: 'High',
    status: 'Open',
  },
  {
    id: 'task-002',
    title: 'Update Summit proposal with revised quantities',
    type: 'Follow-up',
    owner: 'Mina Velasco',
    dealId: 'deal-003',
    dueDate: '2026-04-08',
    priority: 'High',
    status: 'Open',
  },
  {
    id: 'task-003',
    title: 'Confirm signed PO for Vertex contract',
    type: 'Email',
    owner: 'Carlo Reyes',
    dealId: 'deal-005',
    dueDate: CURRENT_DATE,
    priority: 'Medium',
    status: 'Completed',
  },
  {
    id: 'task-004',
    title: 'Schedule plant walk-through with Northgate',
    type: 'Meeting',
    owner: 'Carlo Reyes',
    dealId: 'deal-002',
    dueDate: '2026-04-09',
    priority: 'Medium',
    status: 'Open',
  },
  {
    id: 'task-005',
    title: 'Verify Arcwell contact details before qualification',
    type: 'Follow-up',
    owner: 'Mina Velasco',
    dealId: 'deal-006',
    dueDate: '2026-04-10',
    priority: 'Low',
    status: 'Open',
  },
  {
    id: 'task-006',
    title: 'Log discovery notes for new Arcwell opportunity',
    type: 'Email',
    owner: 'Alicia Mendoza',
    dealId: 'deal-001',
    dueDate: '2026-04-08',
    priority: 'Medium',
    status: 'Open',
  },
]

const companyMap = Object.fromEntries(
  initialCompanies.map((company) => [company.id, company]),
)
const contactMap = Object.fromEntries(
  initialContacts.map((contact) => [contact.id, contact]),
)

const defaultLeadForm = {
  name: '',
  companyId: initialCompanies[0].id,
  contactId: initialContacts[0].id,
  source: leadSources[0],
  owner: teamMembers[0],
  nextStep: '',
}

const defaultDealForm = {
  name: '',
  companyId: initialCompanies[0].id,
  contactId: initialContacts[0].id,
  leadId: initialLeads[0].id,
  stage: dealStages[0],
  value: '',
  expectedClose: '2026-04-30',
  owner: teamMembers[0],
}

const defaultTaskForm = {
  title: '',
  type: taskTypes[1],
  owner: teamMembers[0],
  dealId: initialDeals[0].id,
  dueDate: '2026-04-09',
  priority: 'Medium',
}

const viewMeta = {
  dashboard: {
    eyebrow: 'In-house CRM prototype',
    title: 'TDT Powersteel CRM dashboard built around clean data and visibility',
    description:
      'Track leads, deals, and sales activities efficiently while keeping the first release focused on the essentials.',
    searchPlaceholder: 'Search leads, deals, tasks, or companies',
  },
  database: {
    eyebrow: 'Clean data',
    title: 'One record per lead, contact, and company',
    description:
      'Keep customer data linked properly so follow-ups, deal ownership, and reporting stay reliable.',
    searchPlaceholder: 'Search leads, contacts, companies, or owners',
  },
  pipeline: {
    eyebrow: 'Pipeline visibility',
    title: 'See every opportunity and expected revenue clearly',
    description:
      'Track stages, expected close dates, and pipeline value in one simple view.',
    searchPlaceholder: 'Search deal, company, stage, or owner',
  },
  tasks: {
    eyebrow: 'Activity tracking',
    title: 'Keep follow-ups, calls, and next actions on schedule',
    description:
      'Simple task tracking keeps sales activity visible and fast to update.',
    searchPlaceholder: 'Search tasks, deals, owners, or due dates',
  },
}

function formatCurrencyCompact(value) {
  if (value >= 1000000) {
    return `PHP ${(value / 1000000).toFixed(1)}M`
  }

  if (value >= 1000) {
    return `PHP ${(value / 1000).toFixed(0)}K`
  }

  return `PHP ${value.toLocaleString()}`
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function matchesSearch(query, values) {
  if (!query.trim()) {
    return true
  }

  const normalized = query.trim().toLowerCase()
  return values.some((value) =>
    String(value).toLowerCase().includes(normalized),
  )
}

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function getToneClass(value) {
  const normalized = String(value).toLowerCase()

  if (
    normalized.includes('won') ||
    normalized.includes('completed') ||
    normalized.includes('strategic')
  ) {
    return 'is-positive'
  }

  if (
    normalized.includes('qualified') ||
    normalized.includes('proposal') ||
    normalized.includes('negotiation') ||
    normalized.includes('working')
  ) {
    return 'is-warning'
  }

  if (normalized.includes('high') || normalized.includes('new opportunity')) {
    return 'is-alert'
  }

  return 'is-neutral'
}

function shortStageLabel(stage) {
  if (stage === 'New Opportunity') {
    return 'New'
  }

  if (stage === 'Closed Won') {
    return 'Won'
  }

  return stage
}

function getProbabilityForStage(stage) {
  if (stage === 'New Opportunity') {
    return 20
  }

  if (stage === 'Qualified') {
    return 40
  }

  if (stage === 'Proposal') {
    return 60
  }

  if (stage === 'Negotiation') {
    return 80
  }

  return 100
}

function Panel({ kicker, title, detail, action, id, children }) {
  return (
    <article id={id} className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{kicker}</p>
          <h3>{title}</h3>
        </div>
        {action ? <div className="panel-action">{action}</div> : null}
      </div>
      {detail ? <p className="panel-copy">{detail}</p> : null}
      {children}
    </article>
  )
}

function MetricCard({ label, value, meta, accent = 'surface' }) {
  return (
    <article className={`metric-card metric-card--${accent}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{meta}</span>
    </article>
  )
}

function EmptyState({ title, copy }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [databaseTab, setDatabaseTab] = useState('leads')
  const [stageFilter, setStageFilter] = useState('all')
  const [taskFilter, setTaskFilter] = useState('open')
  const [leads, setLeads] = useState(initialLeads)
  const [deals, setDeals] = useState(initialDeals)
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeads[0].id)
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0].id)
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanies[0].id)
  const [leadForm, setLeadForm] = useState(defaultLeadForm)
  const [dealForm, setDealForm] = useState(defaultDealForm)
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [notice, setNotice] = useState(
    'TDT Powersteel CRM is focused on clean data, pipeline visibility, activity tracking, and a 5 KPI dashboard.',
  )

  const activeDeals = deals.filter((deal) => deal.stage !== 'Closed Won')
  const pipelineValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0)
  const newLeads = leads.filter((lead) => lead.createdAt.startsWith('2026-04'))
  const convertedLeads = leads.filter((lead) => lead.status === 'Converted')
  const conversionRate = leads.length
    ? Math.round((convertedLeads.length / leads.length) * 100)
    : 0
  const stageSummary = dealStages.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage)
    const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0)

    return { stage, count: stageDeals.length, value: stageValue }
  })
  const stageBreakdown = stageSummary
    .map((stage) => `${shortStageLabel(stage.stage)} ${stage.count}`)
    .join(' | ')
  const openTasks = tasks.filter((task) => task.status !== 'Completed')
  const dueToday = openTasks.filter((task) => task.dueDate === CURRENT_DATE)
  const linkedLeadCount = leads.filter(
    (lead) => lead.companyId && lead.contactId,
  ).length
  const linkHealth = leads.length
    ? Math.round((linkedLeadCount / leads.length) * 100)
    : 100
  const averageDealSize = activeDeals.length
    ? Math.round(pipelineValue / activeDeals.length)
    : 0

  const navigationItems = navigationConfig.map((item) => {
    if (item.id === 'dashboard') {
      return { ...item, badge: '05' }
    }

    if (item.id === 'database') {
      return {
        ...item,
        badge: `${leads.length + initialContacts.length + initialCompanies.length}`,
      }
    }

    if (item.id === 'pipeline') {
      return { ...item, badge: `${activeDeals.length}` }
    }

    return { ...item, badge: `${openTasks.length}` }
  })

  const filteredLeads = leads.filter((lead) =>
    matchesSearch(searchQuery, [
      lead.name,
      companyMap[lead.companyId]?.name,
      contactMap[lead.contactId]?.name,
      lead.source,
      lead.owner,
      lead.status,
      lead.nextStep,
    ]),
  )

  const filteredContacts = initialContacts.filter((contact) =>
    matchesSearch(searchQuery, [
      contact.name,
      companyMap[contact.companyId]?.name,
      contact.role,
      contact.owner,
      contact.email,
    ]),
  )

  const filteredCompanies = initialCompanies.filter((company) =>
    matchesSearch(searchQuery, [
      company.name,
      company.industry,
      company.city,
      company.owner,
      company.status,
    ]),
  )

  const filteredDeals = deals.filter(
    (deal) =>
      (stageFilter === 'all' || deal.stage === stageFilter) &&
      matchesSearch(searchQuery, [
        deal.name,
        companyMap[deal.companyId]?.name,
        contactMap[deal.contactId]?.name,
        deal.owner,
        deal.stage,
      ]),
  )

  const filteredTasks = tasks.filter(
    (task) =>
      (taskFilter === 'all' ||
        (taskFilter === 'open' && task.status === 'Open') ||
        (taskFilter === 'completed' && task.status === 'Completed')) &&
      matchesSearch(searchQuery, [
        task.title,
        task.type,
        task.owner,
        deals.find((deal) => deal.id === task.dealId)?.name,
      ]),
  )

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? leads[0]
  const selectedContact =
    initialContacts.find((contact) => contact.id === selectedContactId) ??
    initialContacts[0]
  const selectedCompany =
    initialCompanies.find((company) => company.id === selectedCompanyId) ??
    initialCompanies[0]
  const currentViewMeta = viewMeta[activeView]
  const topKpis = [
    {
      label: 'New Leads',
      value: newLeads.length.toLocaleString(),
      meta: 'Leads created this month',
      accent: 'accent',
    },
    {
      label: 'Active Deals',
      value: activeDeals.length.toLocaleString(),
      meta: 'Open opportunities being worked',
      accent: 'surface',
    },
    {
      label: 'Deals per Stage',
      value: `${stageSummary.filter((stage) => stage.count > 0).length} stages`,
      meta: stageBreakdown,
      accent: 'alt',
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      meta: `${convertedLeads.length} of ${leads.length} leads are converted`,
      accent: 'surface',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrencyCompact(pipelineValue),
      meta: 'Expected revenue across active deals',
      accent: 'accent',
    },
  ]

  function handleViewChange(viewId) {
    setActiveView(viewId)
    setSearchQuery('')
    setNotice(`${viewMeta[viewId].title} is active and aligned to the updated TDT Powersteel CRM outline.`)
  }

  function focusSection(viewId, sectionId, message) {
    setActiveView(viewId)
    setNotice(message)

    window.setTimeout(() => {
      const section = document.getElementById(sectionId)

      if (!section) {
        return
      }

      section.scrollIntoView({ behavior: 'smooth', block: 'start' })

      const focusTarget = section.querySelector(
        'input, select, textarea, button',
      )

      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus()
      }
    }, 80)
  }

  async function handleShareCurrentView() {
    const summary = `${currentViewMeta.title} | new leads ${newLeads.length}, active deals ${activeDeals.length}, conversion ${conversionRate}%, pipeline ${formatCurrencyCompact(pipelineValue)}`

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary)
        setNotice('Current TDT Powersteel CRM view summary copied to clipboard.')
        return
      }
    } catch {
      setNotice('Clipboard access was blocked, but the summary is ready to share manually.')
      return
    }

    setNotice('Clipboard is not available in this browser.')
  }

  function handlePrimaryAction() {
    if (activeView === 'dashboard' || activeView === 'database') {
      focusSection(
        'database',
        'lead-form',
        'Fast lead entry is ready for quick customer data capture.',
      )
      return
    }

    if (activeView === 'pipeline') {
      focusSection(
        'pipeline',
        'deal-form',
        'Deal entry is ready so you can add a new opportunity quickly.',
      )
      return
    }

    focusSection(
      'tasks',
      'task-form',
      'Task entry is ready so follow-ups can be logged immediately.',
    )
  }

  function getPrimaryActionLabel() {
    if (activeView === 'pipeline') {
      return 'New deal'
    }

    if (activeView === 'tasks') {
      return 'Add task'
    }

    return 'New lead'
  }

  function handleLeadFormChange(event) {
    const { name, value } = event.target
    setLeadForm((current) => {
      if (name === 'companyId') {
        const matchingContacts = initialContacts.filter(
          (contact) => contact.companyId === value,
        )
        const nextContactId = matchingContacts.some(
          (contact) => contact.id === current.contactId,
        )
          ? current.contactId
          : (matchingContacts[0]?.id ?? current.contactId)

        return {
          ...current,
          companyId: value,
          contactId: nextContactId,
        }
      }

      if (name === 'contactId') {
        const nextContact = initialContacts.find((contact) => contact.id === value)

        return {
          ...current,
          contactId: value,
          companyId: nextContact?.companyId ?? current.companyId,
        }
      }

      return { ...current, [name]: value }
    })
  }

  function handleDealFormChange(event) {
    const { name, value } = event.target
    setDealForm((current) => {
      if (name === 'companyId') {
        const matchingContacts = initialContacts.filter(
          (contact) => contact.companyId === value,
        )
        const nextContactId = matchingContacts.some(
          (contact) => contact.id === current.contactId,
        )
          ? current.contactId
          : (matchingContacts[0]?.id ?? current.contactId)
        const matchingLeads = leads.filter(
          (lead) => lead.companyId === value && lead.contactId === nextContactId,
        )

        return {
          ...current,
          companyId: value,
          contactId: nextContactId,
          leadId: matchingLeads.some((lead) => lead.id === current.leadId)
            ? current.leadId
            : (matchingLeads[0]?.id ?? leads[0]?.id ?? ''),
        }
      }

      if (name === 'contactId') {
        const nextContact = initialContacts.find((contact) => contact.id === value)
        const nextCompanyId = nextContact?.companyId ?? current.companyId
        const matchingLeads = leads.filter(
          (lead) => lead.companyId === nextCompanyId && lead.contactId === value,
        )

        return {
          ...current,
          contactId: value,
          companyId: nextCompanyId,
          leadId: matchingLeads.some((lead) => lead.id === current.leadId)
            ? current.leadId
            : (matchingLeads[0]?.id ?? leads[0]?.id ?? ''),
        }
      }

      return { ...current, [name]: value }
    })
  }

  function handleTaskFormChange(event) {
    const { name, value } = event.target
    setTaskForm((current) => ({ ...current, [name]: value }))
  }

  function handleCreateLead(event) {
    event.preventDefault()

    const newLead = {
      id: createRecordId('lead'),
      ...leadForm,
      name: leadForm.name.trim(),
      status: 'New',
      createdAt: CURRENT_DATE,
      nextStep: leadForm.nextStep.trim(),
    }

    setLeads((current) => [newLead, ...current])
    setSelectedLeadId(newLead.id)
    setSelectedContactId(newLead.contactId)
    setSelectedCompanyId(newLead.companyId)
    setDatabaseTab('leads')
    setLeadForm(defaultLeadForm)
    setNotice(
      `${newLead.name} was added to the lead registry with linked contact and company references.`,
    )
  }

  function handleCreateDeal(event) {
    event.preventDefault()

    const newDeal = {
      id: createRecordId('deal'),
      ...dealForm,
      name: dealForm.name.trim(),
      value: Number(dealForm.value),
      probability: getProbabilityForStage(dealForm.stage),
    }

    setDeals((current) => [newDeal, ...current])
    setDealForm(defaultDealForm)
    setNotice(
      `${newDeal.name} was added to the pipeline and is ready for backend persistence later.`,
    )
  }

  function handleCreateTask(event) {
    event.preventDefault()

    const newTask = {
      id: createRecordId('task'),
      ...taskForm,
      title: taskForm.title.trim(),
      status: 'Open',
    }

    setTasks((current) => [newTask, ...current])
    setTaskForm(defaultTaskForm)
    setNotice(
      `${newTask.title} was added to task tracking and is now part of the activity queue.`,
    )
  }

  function handleLeadStatusChange(leadId, nextStatus) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, status: nextStatus } : lead,
      ),
    )
    setNotice('Lead status updated in the clean-data registry.')
  }

  function handleDealStageChange(dealId, nextStage) {
    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              stage: nextStage,
              probability: getProbabilityForStage(nextStage),
            }
          : deal,
      ),
    )
    setNotice('Pipeline stage updated successfully.')
  }

  function handleTaskStatusToggle(taskId) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === 'Completed' ? 'Open' : 'Completed',
            }
          : task,
      ),
    )
    setNotice('Task status updated in the activity tracker.')
  }

  function renderDashboardView() {
    const focusTasks = [...openTasks]
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 4)

    return (
      <>
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="status-badge">Build target: 3 months</span>
            <p className="hero-text">
              TDT Powersteel CRM is a HubSpot-inspired in-house prototype
              designed to track leads, deals, and sales activities efficiently
              while making the pipeline easy to understand and the data easy to
              trust.
            </p>

            <div className="hero-highlights">
              <div className="highlight-pill">
                <span className="highlight-label">Purpose</span>
                <strong>Track leads, deals, and sales activity efficiently</strong>
              </div>
              <div className="highlight-pill">
                <span className="highlight-label">Decision support</span>
                <strong>See pipeline clearly and improve follow-ups</strong>
              </div>
              <div className="highlight-pill">
                <span className="highlight-label">Focused scope</span>
                <strong>Database, pipeline, tasks, and 5 KPI dashboard</strong>
              </div>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview__card">
              <p className="sidebar-label">Current pipeline value</p>
              <strong>{formatCurrencyCompact(pipelineValue)}</strong>
              <span>
                Active opportunities are spread across new, qualified, proposal,
                and negotiation stages with a clean expected-revenue view.
              </span>
            </div>

            <div className="hero-preview__bands">
              <div className="hero-band">
                <span>Customer Database</span>
              </div>
              <div className="hero-band">
                <span>Deal Pipeline Visualization</span>
              </div>
              <div className="hero-band">
                <span>Task Tracking</span>
              </div>
              <div className="hero-band">
                <span>Dashboard with 5 KPIs</span>
              </div>
            </div>
          </div>
        </section>

        <section className="metrics-grid metrics-grid--five" aria-label="Core KPIs">
          {topKpis.map((kpi) => (
            <MetricCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              meta={kpi.meta}
              accent={kpi.accent}
            />
          ))}
        </section>

        <section className="content-grid content-grid--2">
          <Panel
            kicker="Core principles"
            title="The prototype is centered on what matters first"
            detail="These principles guide the front-end structure and later database design."
          >
            <div className="principles-grid">
              <article className="principle-card">
                <strong>Clean Data</strong>
                <p>One record per lead, contact, and company with clear links.</p>
              </article>
              <article className="principle-card">
                <strong>Pipeline Visibility</strong>
                <p>Every deal stage shows count, expected revenue, and ownership.</p>
              </article>
              <article className="principle-card">
                <strong>Activity Tracking</strong>
                <p>Calls, follow-ups, and tasks are easy to log and update.</p>
              </article>
              <article className="principle-card">
                <strong>5 KPI Dashboard</strong>
                <p>New leads, active deals, deals per stage, conversion rate, and pipeline value.</p>
              </article>
              <article className="principle-card">
                <strong>Ease of Use</strong>
                <p>Simple layout, fast entry forms, and minimal friction for reps.</p>
              </article>
            </div>
          </Panel>

          <Panel
            kicker="Pipeline snapshot"
            title="Deals by stage with expected revenue"
            detail="This keeps opportunity movement visible without leaving the dashboard."
          >
            <div className="stage-list">
              {stageSummary.map((stage) => (
                <div key={stage.stage} className="stage-row">
                  <div className="stage-meta">
                    <div>
                      <strong>{stage.stage}</strong>
                      <span>{stage.count} deals tracked</span>
                    </div>
                    <span>{formatCurrencyCompact(stage.value)}</span>
                  </div>
                  <div className="stage-track">
                    <div
                      className="stage-fill"
                      style={{
                        width: `${Math.max(
                          stage.value
                            ? Math.round((stage.value / Math.max(pipelineValue, 1)) * 100)
                            : stage.count * 12,
                          10,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="content-grid content-grid--2">
          <Panel
            kicker="Customer database"
            title="Linked record health"
            detail="Clean links make follow-ups, ownership, and reporting much more reliable."
          >
            <div className="simple-list">
              <article className="simple-list__item">
                <div>
                  <strong>{leads.length} leads</strong>
                  <p>Lead records ready for qualification tracking</p>
                </div>
                <span className="tone-pill is-warning">{linkHealth}% linked</span>
              </article>
              <article className="simple-list__item">
                <div>
                  <strong>{initialContacts.length} contacts</strong>
                  <p>Decision makers and buying contacts tied to companies</p>
                </div>
                <span className="tone-pill is-neutral">Directory</span>
              </article>
              <article className="simple-list__item">
                <div>
                  <strong>{initialCompanies.length} companies</strong>
                  <p>Accounts organized with owners and status</p>
                </div>
                <span className="tone-pill is-positive">Clean structure</span>
              </article>
            </div>
          </Panel>

          <Panel
            kicker="Task focus"
            title="Priority follow-ups"
            detail="Open work is visible from the dashboard so reps always know what is next."
          >
            <div className="simple-list">
              {focusTasks.map((task) => (
                <article key={task.id} className="simple-list__item">
                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {task.owner} | due {formatDateLabel(task.dueDate)}
                    </p>
                  </div>
                  <span className={`tone-pill ${getToneClass(task.priority)}`}>
                    {task.priority}
                  </span>
                </article>
              ))}
            </div>
          </Panel>
        </section>
      </>
    )
  }

  function renderDatabaseView() {
    const recordTitle =
      databaseTab === 'leads'
        ? 'Lead Registry'
        : databaseTab === 'contacts'
          ? 'Contact Directory'
          : 'Company Accounts'
    const selectedLeadCompany = selectedLead
      ? companyMap[selectedLead.companyId]
      : null
    const selectedLeadContact = selectedLead
      ? contactMap[selectedLead.contactId]
      : null
    const selectedLeadDeal = selectedLead
      ? deals.find((deal) => deal.leadId === selectedLead.id)
      : null
    const selectedContactCompany = selectedContact
      ? companyMap[selectedContact.companyId]
      : null
    const selectedContactLeads = leads.filter(
      (lead) => lead.contactId === selectedContact?.id,
    )
    const selectedContactDeals = deals.filter(
      (deal) => deal.contactId === selectedContact?.id,
    )
    const selectedCompanyContacts = initialContacts.filter(
      (contact) => contact.companyId === selectedCompany?.id,
    )
    const selectedCompanyLeads = leads.filter(
      (lead) => lead.companyId === selectedCompany?.id,
    )
    const selectedCompanyDeals = deals.filter(
      (deal) => deal.companyId === selectedCompany?.id,
    )
    const selectedCompanyValue = selectedCompanyDeals.reduce(
      (sum, deal) => sum + deal.value,
      0,
    )
    const leadFormContacts = initialContacts.filter(
      (contact) => contact.companyId === leadForm.companyId,
    )

    return (
      <>
        <section className="metrics-grid metrics-grid--compact">
          <MetricCard
            label="Leads"
            value={leads.length.toLocaleString()}
            meta="Tracked with linked contact and company references"
            accent="accent"
          />
          <MetricCard
            label="Contacts"
            value={initialContacts.length.toLocaleString()}
            meta="Customer-facing records tied to account ownership"
            accent="surface"
          />
          <MetricCard
            label="Companies"
            value={initialCompanies.length.toLocaleString()}
            meta="Accounts organized for cleaner pipeline reporting"
            accent="alt"
          />
          <MetricCard
            label="Link Health"
            value={`${linkHealth}%`}
            meta="Lead records linked to both contact and company"
            accent="surface"
          />
        </section>

        <section className="content-grid content-grid--primary">
          <Panel
            kicker="Clean data"
            title={recordTitle}
            detail="Every record is designed to stay linked properly, which keeps the CRM clean and reporting dependable."
            action={
              <div className="database-tabs" role="tablist" aria-label="Database views">
                {['leads', 'contacts', 'companies'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`tab-button ${databaseTab === tab ? 'is-active' : ''}`}
                    onClick={() => {
                      setDatabaseTab(tab)
                      setNotice(`Customer Database switched to ${tab}.`)
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            }
          >
            {databaseTab === 'leads' ? (
              filteredLeads.length === 0 ? (
                <EmptyState
                  title="No leads match this search"
                  copy="Clear the search box to see the full lead registry."
                />
              ) : (
                <div className="contact-list">
                  {filteredLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className={`contact-card ${selectedLeadId === lead.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedLeadId(lead.id)
                      setSelectedContactId(lead.contactId)
                      setSelectedCompanyId(lead.companyId)
                    }}
                  >
                      <div>
                        <strong>{lead.name}</strong>
                        <span>{companyMap[lead.companyId]?.name}</span>
                      </div>
                      <p>{lead.source} lead owned by {lead.owner}</p>
                      <div className="contact-card__meta">
                        <span>{formatDateLabel(lead.createdAt)}</span>
                        <span className={`tone-pill ${getToneClass(lead.status)}`}>
                          {lead.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : null}

            {databaseTab === 'contacts' ? (
              filteredContacts.length === 0 ? (
                <EmptyState
                  title="No contacts match this search"
                  copy="Clear the search box to see the full contact directory."
                />
              ) : (
                <div className="contact-list">
                  {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={`contact-card ${selectedContactId === contact.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      setSelectedContactId(contact.id)
                      setSelectedCompanyId(contact.companyId)
                    }}
                  >
                      <div>
                        <strong>{contact.name}</strong>
                        <span>{contact.role}</span>
                      </div>
                      <p>{companyMap[contact.companyId]?.name}</p>
                      <div className="contact-card__meta">
                        <span>{contact.owner}</span>
                        <span className="tone-pill is-neutral">Contact</span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : null}

            {databaseTab === 'companies' ? (
              filteredCompanies.length === 0 ? (
                <EmptyState
                  title="No companies match this search"
                  copy="Clear the search box to see all company records."
                />
              ) : (
                <div className="contact-list">
                  {filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      className={`contact-card ${selectedCompanyId === company.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedCompanyId(company.id)}
                    >
                      <div>
                        <strong>{company.name}</strong>
                        <span>{company.industry}</span>
                      </div>
                      <p>{company.city} | owner {company.owner}</p>
                      <div className="contact-card__meta">
                        <span>{company.status}</span>
                        <span className={`tone-pill ${getToneClass(company.status)}`}>
                          {company.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : null}
          </Panel>
          <div className="panel-stack">
            {databaseTab === 'leads' ? (
              <Panel
                kicker="Lead detail"
                title={selectedLead?.name ?? 'Select a lead'}
                detail="Review source, ownership, links, and next step before moving the lead deeper into the pipeline."
                action={
                  selectedLead ? (
                    <label className="filter-wrap">
                      <span>Status</span>
                      <select
                        value={selectedLead.status}
                        onChange={(event) =>
                          handleLeadStatusChange(selectedLead.id, event.target.value)
                        }
                      >
                        {leadStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null
                }
              >
                {selectedLead ? (
                  <>
                    <div className="detail-list">
                      <div>
                        <span>Company</span>
                        <strong>{selectedLeadCompany?.name ?? 'Unlinked company'}</strong>
                      </div>
                      <div>
                        <span>Contact</span>
                        <strong>{selectedLeadContact?.name ?? 'Unlinked contact'}</strong>
                      </div>
                      <div>
                        <span>Source</span>
                        <strong>{selectedLead.source}</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{selectedLead.owner}</strong>
                      </div>
                      <div>
                        <span>Created</span>
                        <strong>{formatDateLabel(selectedLead.createdAt)}</strong>
                      </div>
                      <div>
                        <span>Linked deal</span>
                        <strong>{selectedLeadDeal?.name ?? 'No deal yet'}</strong>
                      </div>
                    </div>

                    <article className="detail-card">
                      <strong>Next step</strong>
                      <p>{selectedLead.nextStep}</p>
                    </article>
                  </>
                ) : (
                  <EmptyState
                    title="No lead selected"
                    copy="Choose a lead from the registry to review its linked customer data."
                  />
                )}
              </Panel>
            ) : null}

            {databaseTab === 'contacts' ? (
              <Panel
                kicker="Contact detail"
                title={selectedContact?.name ?? 'Select a contact'}
                detail="Contact records give the sales team one reliable place for customer-facing information and related activity."
              >
                {selectedContact ? (
                  <>
                    <div className="detail-list">
                      <div>
                        <span>Company</span>
                        <strong>{selectedContactCompany?.name ?? 'No company'}</strong>
                      </div>
                      <div>
                        <span>Role</span>
                        <strong>{selectedContact.role}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{selectedContact.email}</strong>
                      </div>
                      <div>
                        <span>Phone</span>
                        <strong>{selectedContact.phone}</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{selectedContact.owner}</strong>
                      </div>
                      <div>
                        <span>Last activity</span>
                        <strong>{formatDateLabel(selectedContact.lastActivity)}</strong>
                      </div>
                    </div>

                    <article className="detail-card">
                      <strong>Related pipeline context</strong>
                      <p>
                        {selectedContactLeads.length} linked leads and{' '}
                        {selectedContactDeals.length} deals are tied to this contact.
                      </p>
                    </article>
                  </>
                ) : (
                  <EmptyState
                    title="No contact selected"
                    copy="Choose a contact to review ownership and relationship details."
                  />
                )}
              </Panel>
            ) : null}

            {databaseTab === 'companies' ? (
              <Panel
                kicker="Company detail"
                title={selectedCompany?.name ?? 'Select a company'}
                detail="Account records keep companies, key contacts, and pipeline value visible in one place."
              >
                {selectedCompany ? (
                  <>
                    <div className="detail-list">
                      <div>
                        <span>Industry</span>
                        <strong>{selectedCompany.industry}</strong>
                      </div>
                      <div>
                        <span>City</span>
                        <strong>{selectedCompany.city}</strong>
                      </div>
                      <div>
                        <span>Owner</span>
                        <strong>{selectedCompany.owner}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{selectedCompany.status}</strong>
                      </div>
                      <div>
                        <span>Linked contacts</span>
                        <strong>{selectedCompanyContacts.length}</strong>
                      </div>
                      <div>
                        <span>Pipeline value</span>
                        <strong>{formatCurrencyCompact(selectedCompanyValue)}</strong>
                      </div>
                    </div>

                    <article className="detail-card">
                      <strong>Relationship summary</strong>
                      <p>
                        {selectedCompanyLeads.length} leads and {selectedCompanyDeals.length}{' '}
                        deals are currently linked to this account.
                      </p>
                    </article>
                  </>
                ) : (
                  <EmptyState
                    title="No company selected"
                    copy="Choose a company to review its account status and related pipeline."
                  />
                )}
              </Panel>
            ) : null}

            <Panel
              id="lead-form"
              kicker="Fast entry"
              title="Add a new lead"
              detail="Quick lead capture keeps the customer database usable and ready for backend persistence later."
            >
              <form className="form-grid" onSubmit={handleCreateLead}>
                <label className="field field--span-2">
                  <span>Lead name</span>
                  <input
                    name="name"
                    value={leadForm.name}
                    onChange={handleLeadFormChange}
                    placeholder="Enter lead name"
                    required
                  />
                </label>

                <label className="field">
                  <span>Company</span>
                  <select
                    name="companyId"
                    value={leadForm.companyId}
                    onChange={handleLeadFormChange}
                  >
                    {initialCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Contact</span>
                  <select
                    name="contactId"
                    value={leadForm.contactId}
                    onChange={handleLeadFormChange}
                  >
                    {leadFormContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Source</span>
                  <select
                    name="source"
                    value={leadForm.source}
                    onChange={handleLeadFormChange}
                  >
                    {leadSources.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Owner</span>
                  <select
                    name="owner"
                    value={leadForm.owner}
                    onChange={handleLeadFormChange}
                  >
                    {teamMembers.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field--span-2">
                  <span>Next step</span>
                  <textarea
                    name="nextStep"
                    value={leadForm.nextStep}
                    onChange={handleLeadFormChange}
                    placeholder="Add the next action for the sales team"
                    required
                  />
                </label>

                <button type="submit" className="primary-button field--span-2">
                  Save lead locally
                </button>
              </form>
            </Panel>
          </div>
        </section>
      </>
    )
  }

  function renderPipelineView() {
    const closingThisMonth = activeDeals.filter((deal) =>
      deal.expectedClose.startsWith('2026-04'),
    ).length
    const pipelineStageSummary = dealStages.map((stage) => {
      const stageDeals = filteredDeals.filter((deal) => deal.stage === stage)
      const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0)

      return { stage, count: stageDeals.length, value: stageValue }
    })
    const dealFormContacts = initialContacts.filter(
      (contact) => contact.companyId === dealForm.companyId,
    )
    const dealFormLeads = leads.filter(
      (lead) =>
        lead.companyId === dealForm.companyId &&
        lead.contactId === dealForm.contactId,
    )

    return (
      <>
        <section className="metrics-grid metrics-grid--compact">
          <MetricCard
            label="Active deals"
            value={activeDeals.length.toLocaleString()}
            meta="Open opportunities being managed across the sales pipeline"
            accent="accent"
          />
          <MetricCard
            label="Pipeline value"
            value={formatCurrencyCompact(pipelineValue)}
            meta="Expected revenue across all active opportunities"
            accent="surface"
          />
          <MetricCard
            label="Average deal size"
            value={formatCurrencyCompact(averageDealSize)}
            meta="Average value of open deals"
            accent="alt"
          />
          <MetricCard
            label="Closing this month"
            value={closingThisMonth.toLocaleString()}
            meta="Open deals with an April 2026 expected close"
            accent="surface"
          />
        </section>

        <section className="content-grid content-grid--primary">
          <Panel
            kicker="Deal pipeline visualization"
            title="Track every opportunity by stage"
            detail="This board is designed for quick visibility, simple updates, and a cleaner handoff to a future backend."
            action={
              <div className="panel-inline-controls">
                <label className="filter-wrap">
                  <span>Stage filter</span>
                  <select
                    value={stageFilter}
                    onChange={(event) => {
                      setStageFilter(event.target.value)
                      setNotice('Pipeline filter updated for the current opportunity view.')
                    }}
                  >
                    <option value="all">All stages</option>
                    {dealStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            }
          >
            <div className="pipeline-board">
              {dealStages.map((stage) => {
                const stageDeals = filteredDeals.filter((deal) => deal.stage === stage)
                const stageValue = stageDeals.reduce(
                  (sum, deal) => sum + deal.value,
                  0,
                )

                return (
                  <article key={stage} className="pipeline-lane">
                    <div className="pipeline-lane__header">
                      <div>
                        <strong>{stage}</strong>
                        <span>{stageDeals.length} deals</span>
                      </div>
                      <span className="tone-pill is-neutral">
                        {formatCurrencyCompact(stageValue)}
                      </span>
                    </div>

                    <div className="pipeline-lane__cards">
                      {stageDeals.length === 0 ? (
                        <div className="pipeline-card pipeline-card--empty">
                          No deals in this stage for the current filter.
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <article key={deal.id} className="pipeline-card">
                            <div className="pipeline-card__top">
                              <strong>{deal.name}</strong>
                              <span className="tone-pill is-warning">
                                {deal.probability}%
                              </span>
                            </div>

                            <p>
                              {companyMap[deal.companyId]?.name} | {deal.owner}
                            </p>

                            <div className="pipeline-card__meta">
                              <span>{formatCurrencyCompact(deal.value)}</span>
                              <span>Close {formatDateLabel(deal.expectedClose)}</span>
                            </div>

                            <label className="field field--compact">
                              <span>Update stage</span>
                              <select
                                value={deal.stage}
                                onChange={(event) =>
                                  handleDealStageChange(deal.id, event.target.value)
                                }
                              >
                                {dealStages.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </article>
                        ))
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </Panel>

          <div className="panel-stack">
            <Panel
              kicker="Stage totals"
              title="Expected revenue by stage"
              detail="Stage totals make it easier to see where the pipeline is healthy and where follow-through is needed."
            >
              <div className="simple-list">
                {pipelineStageSummary.map((stage) => (
                  <article key={stage.stage} className="simple-list__item">
                    <div>
                      <strong>{stage.stage}</strong>
                      <p>{stage.count} deals in this stage</p>
                    </div>
                    <span className="tone-pill is-neutral">
                      {formatCurrencyCompact(stage.value)}
                    </span>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel
              id="deal-form"
              kicker="Fast entry"
              title="Add a new opportunity"
              detail="Simple deal entry keeps pipeline visibility current and easy to maintain."
            >
              <form className="form-grid" onSubmit={handleCreateDeal}>
                <label className="field field--span-2">
                  <span>Deal name</span>
                  <input
                    name="name"
                    value={dealForm.name}
                    onChange={handleDealFormChange}
                    placeholder="Enter opportunity name"
                    required
                  />
                </label>

                <label className="field">
                  <span>Company</span>
                  <select
                    name="companyId"
                    value={dealForm.companyId}
                    onChange={handleDealFormChange}
                  >
                    {initialCompanies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Contact</span>
                  <select
                    name="contactId"
                    value={dealForm.contactId}
                    onChange={handleDealFormChange}
                  >
                    {dealFormContacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Linked lead</span>
                  <select
                    name="leadId"
                    value={dealForm.leadId}
                    onChange={handleDealFormChange}
                  >
                    {(dealFormLeads.length ? dealFormLeads : leads).map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Stage</span>
                  <select
                    name="stage"
                    value={dealForm.stage}
                    onChange={handleDealFormChange}
                  >
                    {dealStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Value</span>
                  <input
                    name="value"
                    type="number"
                    min="0"
                    value={dealForm.value}
                    onChange={handleDealFormChange}
                    placeholder="Enter value"
                    required
                  />
                </label>

                <label className="field">
                  <span>Expected close</span>
                  <input
                    name="expectedClose"
                    type="date"
                    value={dealForm.expectedClose}
                    onChange={handleDealFormChange}
                    required
                  />
                </label>

                <label className="field field--span-2">
                  <span>Owner</span>
                  <select
                    name="owner"
                    value={dealForm.owner}
                    onChange={handleDealFormChange}
                  >
                    {teamMembers.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" className="primary-button field--span-2">
                  Save deal locally
                </button>
              </form>
            </Panel>
          </div>
        </section>
      </>
    )
  }

  function renderTasksView() {
    const focusQueue = [...openTasks]
      .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
      .slice(0, 4)

    return (
      <>
        <section className="metrics-grid metrics-grid--compact">
          <MetricCard
            label="Open tasks"
            value={openTasks.length.toLocaleString()}
            meta="Work still in progress for sales follow-through"
            accent="accent"
          />
          <MetricCard
            label="Due today"
            value={dueToday.length.toLocaleString()}
            meta="Tasks that need action today"
            accent="surface"
          />
          <MetricCard
            label="Completed"
            value={tasks.filter((task) => task.status === 'Completed').length.toLocaleString()}
            meta="Closed activities already logged"
            accent="alt"
          />
          <MetricCard
            label="High priority"
            value={openTasks.filter((task) => task.priority === 'High').length.toLocaleString()}
            meta="Urgent follow-ups across open work"
            accent="surface"
          />
        </section>

        <section className="content-grid content-grid--primary">
          <Panel
            kicker="Task tracking"
            title="Calls, follow-ups, meetings, and emails"
            detail="Activity tracking stays simple so updates are fast and the team sees the next action clearly."
            action={
              <div className="panel-inline-controls">
                <label className="filter-wrap">
                  <span>Status</span>
                  <select
                    value={taskFilter}
                    onChange={(event) => setTaskFilter(event.target.value)}
                  >
                    <option value="all">All tasks</option>
                    <option value="open">Open</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </div>
            }
          >
            {filteredTasks.length === 0 ? (
              <EmptyState
                title="No tasks match this filter"
                copy="Try a different search term or status filter."
              />
            ) : (
              <div className="activity-list">
                {filteredTasks.map((task) => {
                  const linkedDeal = deals.find((deal) => deal.id === task.dealId)

                  return (
                    <article key={task.id} className="activity-card">
                      <div className="activity-card__header">
                        <div>
                          <strong>{task.title}</strong>
                          <p>
                            {task.type} | {task.owner}
                          </p>
                        </div>
                        <div className="activity-card__badges">
                          <span className={`tone-pill ${getToneClass(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`tone-pill ${getToneClass(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                      <p className="activity-notes">
                        Linked to {linkedDeal?.name ?? 'manual task'} for{' '}
                        {linkedDeal ? companyMap[linkedDeal.companyId]?.name : 'general CRM work'}.
                      </p>
                      <div className="activity-card__footer">
                        <span>Due {formatDateLabel(task.dueDate)}</span>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleTaskStatusToggle(task.id)}
                        >
                          {task.status === 'Completed' ? 'Reopen task' : 'Mark complete'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </Panel>

          <div className="panel-stack">
            <Panel
              kicker="Focus queue"
              title="Most urgent follow-ups"
              detail="Use this queue to keep daily activity aligned with the pipeline."
            >
              <div className="simple-list">
                {focusQueue.map((task) => (
                  <article key={task.id} className="simple-list__item">
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        {task.owner} | due {formatDateLabel(task.dueDate)}
                      </p>
                    </div>
                    <span className={`tone-pill ${getToneClass(task.priority)}`}>
                      {task.priority}
                    </span>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel
              id="task-form"
              kicker="Fast entry"
              title="Log a task quickly"
              detail="Fast task entry supports the ease-of-use principle from the updated outline."
            >
              <form className="form-grid" onSubmit={handleCreateTask}>
                <label className="field field--span-2">
                  <span>Task title</span>
                  <input
                    name="title"
                    value={taskForm.title}
                    onChange={handleTaskFormChange}
                    placeholder="Enter task title"
                    required
                  />
                </label>

                <label className="field">
                  <span>Type</span>
                  <select
                    name="type"
                    value={taskForm.type}
                    onChange={handleTaskFormChange}
                  >
                    {taskTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Owner</span>
                  <select
                    name="owner"
                    value={taskForm.owner}
                    onChange={handleTaskFormChange}
                  >
                    {teamMembers.map((member) => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field field--span-2">
                  <span>Linked deal</span>
                  <select
                    name="dealId"
                    value={taskForm.dealId}
                    onChange={handleTaskFormChange}
                  >
                    {deals.map((deal) => (
                      <option key={deal.id} value={deal.id}>
                        {deal.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Due date</span>
                  <input
                    name="dueDate"
                    type="date"
                    value={taskForm.dueDate}
                    onChange={handleTaskFormChange}
                    required
                  />
                </label>

                <label className="field">
                  <span>Priority</span>
                  <select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskFormChange}
                  >
                    {taskPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" className="primary-button field--span-2">
                  Save task locally
                </button>
              </form>
            </Panel>
          </div>
        </section>
      </>
    )
  }

  function renderMainContent() {
    if (activeView === 'dashboard') {
      return renderDashboardView()
    }

    if (activeView === 'database') {
      return renderDatabaseView()
    }

    if (activeView === 'pipeline') {
      return renderPipelineView()
    }

    return renderTasksView()
  }

  return (
    <div className="crm-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-head">
            <img
              src="/tdt-powersteel-logo.png"
              alt="TDT Powersteel"
              className="brand-logo"
            />
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
          <span>
            Focused on clean customer data, pipeline visibility, task tracking,
            and a five-KPI dashboard for the first three-month prototype.
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Primary CRM navigation">
          {navigationItems.map((item) => (
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
            <p className="eyebrow">{currentViewMeta.eyebrow}</p>
            <h2 className="page-title">{currentViewMeta.title}</h2>
            <p className="page-description">{currentViewMeta.description}</p>
          </div>

          <div className="top-bar-actions">
            <label className="search-field">
              <span className="search-icon" aria-hidden="true">
                Search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={currentViewMeta.searchPlaceholder}
                aria-label={currentViewMeta.searchPlaceholder}
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              onClick={handleShareCurrentView}
            >
              Share view
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handlePrimaryAction}
            >
              {getPrimaryActionLabel()}
            </button>
          </div>
        </header>

        <div className="notice-bar" aria-live="polite">
          <strong>Live state</strong>
          <span>{notice}</span>
        </div>

        {renderMainContent()}
      </main>
    </div>
  )
}

export default App
