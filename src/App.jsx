import { useState } from 'react'
import './App.css'

const navigationConfig = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview and readiness' },
  { id: 'sales-workspace', label: 'Sales Workspace', description: 'Team command center' },
  { id: 'deals', label: 'Deals', description: 'Pipeline and quick create' },
  { id: 'contacts', label: 'Contacts', description: 'Directory and account owners' },
  { id: 'activities', label: 'Activities', description: 'Agenda and follow-ups' },
  { id: 'reports', label: 'Reports', description: 'Preview and delivery setup' },
]

const salesTeam = [
  {
    id: 'rep-angela',
    name: 'Angela Santos',
    role: 'Senior Account Executive',
    focus: 'Structural steel packages',
    quota: 92,
    closeRate: 35,
  },
  {
    id: 'rep-marco',
    name: 'Marco Reyes',
    role: 'Account Manager',
    focus: 'Industrial accounts',
    quota: 88,
    closeRate: 32,
  },
  {
    id: 'rep-diana',
    name: 'Diana Cruz',
    role: 'Relationship Executive',
    focus: 'Contractor renewals',
    quota: 84,
    closeRate: 29,
  },
]

const reportCatalog = [
  {
    id: 'team-activities-date',
    title: 'Team activities by activity date',
    description: 'Track daily calls, meetings, and follow-ups to keep outreach consistent.',
    chip: 'Daily cadence',
    metricLabel: 'Completed activities',
    metricType: 'number',
    forecast: 428,
    goal: 480,
    change: '+14%',
    series: [
      { label: 'Mon', value: 74 },
      { label: 'Tue', value: 96 },
      { label: 'Wed', value: 82 },
      { label: 'Thu', value: 101 },
      { label: 'Fri', value: 75 },
    ],
    insight:
      'Tuesday and Thursday are carrying the week. Friday follow-through is the biggest opportunity.',
  },
  {
    id: 'contacts-created-worked',
    title: 'Contacts created and worked totals with deals created and won totals',
    description: 'Connect contact creation with deal movement so reps can see if top-of-funnel activity is healthy.',
    chip: 'Pipeline flow',
    metricLabel: 'Qualified contacts',
    metricType: 'number',
    forecast: 142,
    goal: 160,
    change: '+11%',
    series: [
      { label: 'Week 1', value: 26 },
      { label: 'Week 2', value: 28 },
      { label: 'Week 3', value: 31 },
      { label: 'Week 4', value: 34 },
      { label: 'Week 5', value: 23 },
    ],
    insight:
      'New contacts are trending up, but conversion will depend on how quickly the team works Week 5 handoffs.',
  },
  {
    id: 'team-activity-totals',
    title: 'Team activity totals',
    description: 'Measure the mix of calls, emails, quotes, and site visits across the sales floor.',
    chip: 'Effort mix',
    metricLabel: 'Touches logged',
    metricType: 'number',
    forecast: 892,
    goal: 950,
    change: '+8%',
    series: [
      { label: 'Calls', value: 236 },
      { label: 'Emails', value: 194 },
      { label: 'Quotes', value: 168 },
      { label: 'Visits', value: 122 },
      { label: 'Tasks', value: 172 },
    ],
    insight:
      'Call volume is strong. Quotes and site visits need more balance if we want a steadier close rate.',
  },
  {
    id: 'deal-closed-vs-goal',
    title: 'Deal closed totals vs goal',
    description: 'Compare closed-won deals against the monthly target and spot pacing risks early.',
    chip: 'Quota view',
    metricLabel: 'Closed won deals',
    metricType: 'number',
    forecast: 36,
    goal: 42,
    change: '+6%',
    series: [
      { label: 'Jan', value: 29 },
      { label: 'Feb', value: 31 },
      { label: 'Mar', value: 34 },
      { label: 'Apr', value: 36 },
      { label: 'Goal', value: 42 },
    ],
    insight:
      'The team is ahead of last month, but four more wins are still needed to land the target comfortably.',
  },
  {
    id: 'deal-revenue-forecast',
    title: 'Deal revenue forecast by stage',
    description: 'See how much revenue is sitting in each stage and where the next push should happen.',
    chip: 'Revenue view',
    metricLabel: 'Forecasted revenue',
    metricType: 'currency',
    forecast: 12850000,
    goal: 14600000,
    change: '+9%',
    series: [
      { label: 'Qualify', value: 2100000 },
      { label: 'Proposal', value: 3600000 },
      { label: 'Negotiate', value: 2800000 },
      { label: 'Verbal', value: 1950000 },
      { label: 'Won', value: 2400000 },
    ],
    insight:
      'Proposal and negotiation hold the largest value. Faster quote turnaround should unlock the next revenue jump.',
  },
]

const initialDeals = [
  {
    id: 'deal-001',
    name: 'Northpoint Fabrication Upgrade',
    company: 'Northpoint Fabrication',
    owner: 'Angela Santos',
    stage: 'Negotiation',
    value: 2400000,
    closeDate: '2026-03-28',
    priority: 'High',
    contact: 'Luis Navarro',
    source: 'Referral',
    lastTouch: '2026-03-22',
  },
  {
    id: 'deal-002',
    name: 'Cebu Builders Rebar Package',
    company: 'Cebu Builders',
    owner: 'Diana Cruz',
    stage: 'Proposal',
    value: 1750000,
    closeDate: '2026-04-04',
    priority: 'High',
    contact: 'Mika dela Torre',
    source: 'Inbound',
    lastTouch: '2026-03-23',
  },
  {
    id: 'deal-003',
    name: 'MetroSpan Expansion',
    company: 'MetroSpan Industrial',
    owner: 'Marco Reyes',
    stage: 'Qualified',
    value: 980000,
    closeDate: '2026-04-16',
    priority: 'Medium',
    contact: 'Jorge Ramirez',
    source: 'Outbound',
    lastTouch: '2026-03-20',
  },
  {
    id: 'deal-004',
    name: 'Skyline Contractors Renewal',
    company: 'Skyline Contractors',
    owner: 'Diana Cruz',
    stage: 'Closed Won',
    value: 3150000,
    closeDate: '2026-03-18',
    priority: 'High',
    contact: 'Patricia Ocampo',
    source: 'Renewal',
    lastTouch: '2026-03-18',
  },
  {
    id: 'deal-005',
    name: 'Harborline Sheet Pile Supply',
    company: 'Harborline Projects',
    owner: 'Angela Santos',
    stage: 'Lead',
    value: 650000,
    closeDate: '2026-04-24',
    priority: 'Low',
    contact: 'Gerard Tan',
    source: 'Partner',
    lastTouch: '2026-03-17',
  },
  {
    id: 'deal-006',
    name: 'PrimeCore Warehouse Fitout',
    company: 'PrimeCore Logistics',
    owner: 'Marco Reyes',
    stage: 'Proposal',
    value: 1380000,
    closeDate: '2026-04-11',
    priority: 'Medium',
    contact: 'Anika Flores',
    source: 'Inbound',
    lastTouch: '2026-03-21',
  },
]

const initialContacts = [
  {
    id: 'contact-001',
    name: 'Luis Navarro',
    company: 'Northpoint Fabrication',
    role: 'Procurement Head',
    owner: 'Angela Santos',
    email: 'luis.navarro@northpoint.example',
    phone: '+63 917 555 0101',
    status: 'Qualified',
    lastTouch: '2026-03-22',
  },
  {
    id: 'contact-002',
    name: 'Mika dela Torre',
    company: 'Cebu Builders',
    role: 'Project Buyer',
    owner: 'Diana Cruz',
    email: 'mika.delatorre@cebu-builders.example',
    phone: '+63 917 555 0102',
    status: 'Qualified',
    lastTouch: '2026-03-23',
  },
  {
    id: 'contact-003',
    name: 'Jorge Ramirez',
    company: 'MetroSpan Industrial',
    role: 'Operations Lead',
    owner: 'Marco Reyes',
    email: 'jorge.ramirez@metrospan.example',
    phone: '+63 917 555 0103',
    status: 'Lead',
    lastTouch: '2026-03-20',
  },
  {
    id: 'contact-004',
    name: 'Patricia Ocampo',
    company: 'Skyline Contractors',
    role: 'Managing Partner',
    owner: 'Diana Cruz',
    email: 'patricia.ocampo@skyline.example',
    phone: '+63 917 555 0104',
    status: 'Customer',
    lastTouch: '2026-03-18',
  },
  {
    id: 'contact-005',
    name: 'Gerard Tan',
    company: 'Harborline Projects',
    role: 'Site Engineer',
    owner: 'Angela Santos',
    email: 'gerard.tan@harborline.example',
    phone: '+63 917 555 0105',
    status: 'Lead',
    lastTouch: '2026-03-17',
  },
  {
    id: 'contact-006',
    name: 'Anika Flores',
    company: 'PrimeCore Logistics',
    role: 'Supply Chain Manager',
    owner: 'Marco Reyes',
    email: 'anika.flores@primecore.example',
    phone: '+63 917 555 0106',
    status: 'Qualified',
    lastTouch: '2026-03-21',
  },
]

const initialActivities = [
  {
    id: 'activity-001',
    type: 'Call',
    subject: 'Finalize pricing adjustments for Northpoint',
    owner: 'Angela Santos',
    dueDate: '2026-03-23',
    status: 'In Progress',
    deal: 'Northpoint Fabrication Upgrade',
    notes: 'Client asked for delivery spread over two batches.',
  },
  {
    id: 'activity-002',
    type: 'Meeting',
    subject: 'Proposal walk-through with Cebu Builders',
    owner: 'Diana Cruz',
    dueDate: '2026-03-24',
    status: 'Scheduled',
    deal: 'Cebu Builders Rebar Package',
    notes: 'Coordinate revised quantity summary before the meeting.',
  },
  {
    id: 'activity-003',
    type: 'Email',
    subject: 'Send updated catalog to MetroSpan',
    owner: 'Marco Reyes',
    dueDate: '2026-03-23',
    status: 'Completed',
    deal: 'MetroSpan Expansion',
    notes: 'Catalog and application notes were sent this morning.',
  },
  {
    id: 'activity-004',
    type: 'Site Visit',
    subject: 'Inspect Harborline staging area',
    owner: 'Angela Santos',
    dueDate: '2026-03-26',
    status: 'Scheduled',
    deal: 'Harborline Sheet Pile Supply',
    notes: 'Validate unloading access and crane clearance.',
  },
  {
    id: 'activity-005',
    type: 'Quote',
    subject: 'Issue revised quotation for PrimeCore',
    owner: 'Marco Reyes',
    dueDate: '2026-03-25',
    status: 'In Progress',
    deal: 'PrimeCore Warehouse Fitout',
    notes: 'Waiting on galvanization cost confirmation.',
  },
]

const stageOrder = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won']
const contactStatuses = ['Lead', 'Qualified', 'Customer']
const activityStatuses = ['Scheduled', 'In Progress', 'Completed']
const deliveryCadences = ['Daily', 'Weekly', 'Monthly']
const deliveryFormats = ['Dashboard link', 'PDF', 'CSV']
const recipientGroups = ['Sales leadership', 'Regional managers', 'Account executives']
const stageProbability = {
  Lead: 0.15,
  Qualified: 0.35,
  Proposal: 0.6,
  Negotiation: 0.8,
  'Closed Won': 1,
}

const defaultDealForm = {
  name: '',
  company: '',
  owner: salesTeam[0].name,
  stage: 'Lead',
  value: '',
  closeDate: '2026-04-30',
  priority: 'Medium',
  contact: '',
}

const defaultContactForm = {
  name: '',
  company: '',
  role: '',
  owner: salesTeam[0].name,
  email: '',
  phone: '',
  status: 'Lead',
}

const defaultActivityForm = {
  type: 'Call',
  subject: '',
  owner: salesTeam[0].name,
  dueDate: '2026-03-30',
  status: 'Scheduled',
  deal: initialDeals[0].name,
  notes: '',
}

const defaultDeliverySettings = {
  cadence: 'Weekly',
  format: 'Dashboard link',
  recipientGroup: 'Sales leadership',
  includeSummary: true,
}

const viewMeta = {
  dashboard: {
    eyebrow: 'Command center',
    title: 'A sales front end ready for real records',
    description:
      'Monitor pipeline health, next actions, and database-ready modules from one place.',
    searchPlaceholder: 'Search deals, stages, owners, or contacts',
  },
  'sales-workspace': {
    eyebrow: 'Sales workspace',
    title: 'Choose the reports you want to see',
    description:
      'Mirror the HubSpot sales experience while keeping the theme aligned to TDT Powersteel CRM.',
    searchPlaceholder: 'Search reports, insights, and report tags',
  },
  deals: {
    eyebrow: 'Pipeline',
    title: 'Manage deals and keep the pipeline moving',
    description:
      'Track value, stages, close dates, and high-priority accounts in a front end that is ready to receive database records.',
    searchPlaceholder: 'Search deal, company, owner, or contact',
  },
  contacts: {
    eyebrow: 'Contact directory',
    title: 'Keep buyers, owners, and champions organized',
    description:
      'Review contact ownership, communication health, and account relationships before wiring in customer data.',
    searchPlaceholder: 'Search contact, company, role, or owner',
  },
  activities: {
    eyebrow: 'Follow-through',
    title: 'Log the work that keeps revenue moving',
    description:
      'Give sales reps a focused view of calls, meetings, quotes, and site visits with accessible actions.',
    searchPlaceholder: 'Search activity, deal, owner, or notes',
  },
  reports: {
    eyebrow: 'Reporting',
    title: 'Prepare report delivery and dashboard outputs',
    description:
      'Set which reports are active, preview them, and define delivery settings that can later be saved to the database.',
    searchPlaceholder: 'Search reports, goals, or delivery content',
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

function formatCurrencyFull(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatMetricValue(value, metricType) {
  if (metricType === 'currency') {
    return formatCurrencyCompact(value)
  }

  return value.toLocaleString()
}

function matchesSearch(query, values) {
  if (!query.trim()) {
    return true
  }

  const normalizedQuery = query.trim().toLowerCase()
  return values.some((value) =>
    String(value).toLowerCase().includes(normalizedQuery),
  )
}

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function getToneClass(value) {
  const normalizedValue = String(value).toLowerCase()

  if (
    normalizedValue.includes('won') ||
    normalizedValue.includes('customer') ||
    normalizedValue.includes('completed')
  ) {
    return 'is-positive'
  }

  if (
    normalizedValue.includes('proposal') ||
    normalizedValue.includes('negotiation') ||
    normalizedValue.includes('qualified') ||
    normalizedValue.includes('in progress')
  ) {
    return 'is-warning'
  }

  if (normalizedValue.includes('high')) {
    return 'is-alert'
  }

  return 'is-neutral'
}

function Panel({ kicker, title, detail, className = '', id, action, children }) {
  return (
    <article id={id} className={`panel ${className}`.trim()}>
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

function ReportChart({ report }) {
  const previewMax = Math.max(...report.series.map((point) => point.value), 1)

  return (
    <div className="chart-frame">
      {report.series.map((point) => (
        <div key={point.label} className="chart-column">
          <span className="chart-value">
            {formatMetricValue(point.value, report.metricType)}
          </span>
          <div className="chart-track">
            <div
              className="chart-fill"
              style={{
                height: `${Math.max((point.value / previewMax) * 100, 14)}%`,
              }}
            />
          </div>
          <span className="chart-label">{point.label}</span>
        </div>
      ))}
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('sales-workspace')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReports, setSelectedReports] = useState(
    reportCatalog.map((report) => report.id),
  )
  const [activeReportId, setActiveReportId] = useState(reportCatalog[0].id)
  const [deals, setDeals] = useState(initialDeals)
  const [contacts, setContacts] = useState(initialContacts)
  const [activities, setActivities] = useState(initialActivities)
  const [selectedDealId, setSelectedDealId] = useState(initialDeals[0].id)
  const [selectedContactId, setSelectedContactId] = useState(initialContacts[0].id)
  const [stageFilter, setStageFilter] = useState('all')
  const [contactFilter, setContactFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [notice, setNotice] = useState(
    'Front-end state is live. Each module is structured so real API responses can replace the mock records later.',
  )
  const [dealForm, setDealForm] = useState(defaultDealForm)
  const [contactForm, setContactForm] = useState(defaultContactForm)
  const [activityForm, setActivityForm] = useState(defaultActivityForm)
  const [deliverySettings, setDeliverySettings] = useState(defaultDeliverySettings)
  const selectedReportSet = new Set(selectedReports)
  const activeReport =
    reportCatalog.find(
      (report) =>
        report.id === activeReportId && selectedReportSet.has(activeReportId),
    ) ??
    reportCatalog.find((report) => selectedReportSet.has(report.id)) ??
    reportCatalog[0]

  const totalPipelineValue = deals.reduce((sum, deal) => sum + deal.value, 0)
  const weightedForecast = deals.reduce(
    (sum, deal) => sum + deal.value * (stageProbability[deal.stage] ?? 0.1),
    0,
  )
  const closedWonDeals = deals.filter((deal) => deal.stage === 'Closed Won')
  const openActivities = activities.filter(
    (activity) => activity.status !== 'Completed',
  )
  const completedActivities = activities.length - openActivities.length
  const qualifiedContacts = contacts.filter(
    (contact) => contact.status !== 'Lead',
  )
  const highPriorityDeals = deals.filter((deal) => deal.priority === 'High')
  const pipelineSummary = stageOrder.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage)
    const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0)

    return {
      stage,
      count: stageDeals.length,
      value: stageValue,
      share: totalPipelineValue ? Math.round((stageValue / totalPipelineValue) * 100) : 0,
    }
  })

  const navigationItems = navigationConfig.map((item) => {
    let badge = '00'

    if (item.id === 'dashboard') {
      badge = 'Live'
    }

    if (item.id === 'sales-workspace') {
      badge = String(selectedReports.length).padStart(2, '0')
    }

    if (item.id === 'deals') {
      badge = String(deals.length).padStart(2, '0')
    }

    if (item.id === 'contacts') {
      badge = String(contacts.length).padStart(2, '0')
    }

    if (item.id === 'activities') {
      badge = String(openActivities.length).padStart(2, '0')
    }

    if (item.id === 'reports') {
      badge = String(selectedReports.length).padStart(2, '0')
    }

    return { ...item, badge }
  })

  const filteredDeals = deals.filter(
    (deal) =>
      (stageFilter === 'all' || deal.stage === stageFilter) &&
      matchesSearch(searchQuery, [
        deal.name,
        deal.company,
        deal.owner,
        deal.contact,
        deal.stage,
      ]),
  )

  const filteredContacts = contacts.filter(
    (contact) =>
      (contactFilter === 'all' || contact.status === contactFilter) &&
      matchesSearch(searchQuery, [
        contact.name,
        contact.company,
        contact.role,
        contact.owner,
      ]),
  )

  const filteredActivities = activities.filter(
    (activity) =>
      (activityFilter === 'all' || activity.status === activityFilter) &&
      matchesSearch(searchQuery, [
        activity.subject,
        activity.type,
        activity.owner,
        activity.deal,
        activity.notes,
      ]),
  )

  const filteredReports = reportCatalog.filter((report) =>
    matchesSearch(searchQuery, [report.title, report.description, report.chip]),
  )

  const selectedDeal =
    deals.find((deal) => deal.id === selectedDealId) ?? deals[0] ?? null
  const selectedContact =
    contacts.find((contact) => contact.id === selectedContactId) ??
    contacts[0] ??
    null

  const currentViewMeta = viewMeta[activeView]
  const enabledReportsLabel =
    selectedReports.length === 1
      ? '1 report selected'
      : `${selectedReports.length} reports selected`
  const topMetricCards = [
    {
      label: 'Weighted forecast',
      value: formatCurrencyCompact(weightedForecast),
      meta: 'Calculated from live pipeline stage probabilities',
      accent: 'accent',
    },
    {
      label: 'Closed won deals',
      value: closedWonDeals.length.toLocaleString(),
      meta: 'Deals already landed this month',
      accent: 'surface',
    },
    {
      label: 'Qualified contacts',
      value: `${Math.round((qualifiedContacts.length / contacts.length) * 100)}%`,
      meta: `${qualifiedContacts.length} of ${contacts.length} contacts are qualified or active customers`,
      accent: 'alt',
    },
    {
      label: 'Open activities',
      value: openActivities.length.toLocaleString(),
      meta: `${completedActivities} completed tasks already logged`,
      accent: 'surface',
    },
  ]

  function handleViewChange(viewId) {
    setActiveView(viewId)
    setSearchQuery('')
    setNotice(`${viewMeta[viewId].title} is active. This screen is ready for real data bindings later.`)
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
    const summary = `${currentViewMeta.title} | deals: ${deals.length}, contacts: ${contacts.length}, open activities: ${openActivities.length}, selected reports: ${selectedReports.length}`

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary)
        setNotice('Current view summary copied to your clipboard.')
        return
      }
    } catch {
      setNotice('Clipboard access was blocked, but the view summary is ready to share manually.')
      return
    }

    setNotice('Clipboard is not available in this browser, but the view is still active and ready.')
  }

  function handleTopPrimaryAction() {
    if (activeView === 'dashboard' || activeView === 'sales-workspace') {
      focusSection(
        'deals',
        'deal-form',
        'Deal form opened. You can add a new deal entry now.',
      )
      return
    }

    if (activeView === 'deals') {
      focusSection(
        'deals',
        'deal-form',
        'New deal form is ready in the right panel.',
      )
      return
    }

    if (activeView === 'contacts') {
      focusSection(
        'contacts',
        'contact-form',
        'New contact form is ready in the right panel.',
      )
      return
    }

    if (activeView === 'activities') {
      focusSection(
        'activities',
        'activity-form',
        'Activity log form is ready in the right panel.',
      )
      return
    }

    focusSection(
      'reports',
      'report-settings',
      'Report delivery settings are ready for review.',
    )
  }

  function getTopPrimaryLabel() {
    if (activeView === 'dashboard' || activeView === 'sales-workspace') {
      return 'Open deal form'
    }

    if (activeView === 'deals') {
      return 'New deal'
    }

    if (activeView === 'contacts') {
      return 'New contact'
    }

    if (activeView === 'activities') {
      return 'Log activity'
    }

    return 'Delivery settings'
  }

  function toggleReport(reportId) {
    setSelectedReports((current) => {
      if (current.includes(reportId)) {
        if (current.length === 1) {
          return current
        }

        const nextSelection = current.filter((item) => item !== reportId)

        if (activeReportId === reportId) {
          setActiveReportId(nextSelection[0])
        }

        return nextSelection
      }

      setActiveReportId(reportId)
      return [...current, reportId]
    })
  }

  function handleDealFormChange(event) {
    const { name, value } = event.target
    setDealForm((current) => ({ ...current, [name]: value }))
  }

  function handleContactFormChange(event) {
    const { name, value } = event.target
    setContactForm((current) => ({ ...current, [name]: value }))
  }

  function handleActivityFormChange(event) {
    const { name, value } = event.target
    setActivityForm((current) => ({ ...current, [name]: value }))
  }

  function handleDeliverySettingsChange(event) {
    const { name, value, type, checked } = event.target
    setDeliverySettings((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleCreateDeal(event) {
    event.preventDefault()

    const newDeal = {
      id: createRecordId('deal'),
      name: dealForm.name.trim(),
      company: dealForm.company.trim(),
      owner: dealForm.owner,
      stage: dealForm.stage,
      value: Number(dealForm.value),
      closeDate: dealForm.closeDate,
      priority: dealForm.priority,
      contact: dealForm.contact.trim() || 'Unassigned contact',
      source: 'Manual entry',
      lastTouch: new Date().toISOString().slice(0, 10),
    }

    setDeals((current) => [newDeal, ...current])
    setSelectedDealId(newDeal.id)
    setDealForm(defaultDealForm)
    setNotice(
      `${newDeal.name} was added to the front-end store. This is ready to swap with a database create call later.`,
    )
  }

  function handleCreateContact(event) {
    event.preventDefault()

    const newContact = {
      id: createRecordId('contact'),
      ...contactForm,
      name: contactForm.name.trim(),
      company: contactForm.company.trim(),
      role: contactForm.role.trim(),
      email: contactForm.email.trim(),
      phone: contactForm.phone.trim(),
      lastTouch: new Date().toISOString().slice(0, 10),
    }

    setContacts((current) => [newContact, ...current])
    setSelectedContactId(newContact.id)
    setContactForm(defaultContactForm)
    setNotice(
      `${newContact.name} was added to the contact directory and is ready for database persistence later.`,
    )
  }

  function handleCreateActivity(event) {
    event.preventDefault()

    const newActivity = {
      id: createRecordId('activity'),
      ...activityForm,
      subject: activityForm.subject.trim(),
      notes: activityForm.notes.trim(),
    }

    setActivities((current) => [newActivity, ...current])
    setActivityForm({
      ...defaultActivityForm,
      deal: deals[0]?.name ?? defaultActivityForm.deal,
    })
    setNotice(
      `${newActivity.type} logged for ${newActivity.deal}. This can later post directly to your activity table.`,
    )
  }

  function handleDealStageChange(dealId, nextStage) {
    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId ? { ...deal, stage: nextStage } : deal,
      ),
    )
    setNotice('Deal stage updated in the front-end state.')
  }

  function handleContactStatusChange(contactId, nextStatus) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId ? { ...contact, status: nextStatus } : contact,
      ),
    )
    setNotice('Contact status updated in the front-end state.')
  }

  function handleActivityStatusToggle(activityId) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              status:
                activity.status === 'Completed' ? 'In Progress' : 'Completed',
            }
          : activity,
      ),
    )
    setNotice('Activity status updated in the agenda.')
  }

  function handleSaveDeliverySettings(event) {
    event.preventDefault()
    setNotice(
      `Report delivery settings were saved in local state for ${deliverySettings.recipientGroup}.`,
    )
  }

  function renderDashboardView() {
    const readinessRows = [
      {
        entity: 'Deals',
        count: deals.length,
        fields: 'name, company, stage, value, owner, closeDate, priority, source',
      },
      {
        entity: 'Contacts',
        count: contacts.length,
        fields: 'name, company, role, email, phone, owner, status, lastTouch',
      },
      {
        entity: 'Activities',
        count: activities.length,
        fields: 'type, subject, owner, dueDate, deal, status, notes',
      },
      {
        entity: 'Reports',
        count: selectedReports.length,
        fields: 'title, goal, forecast, series, schedule, recipients',
      },
    ]

    return (
      <>
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="status-badge">Palette aligned to TDT Powersteel CRM</span>
            <p className="hero-text">
              The full sales shell now uses your dark palette and every menu
              item leads to an interactive screen. The mock state is shaped to
              mirror the records you can later store in a database.
            </p>

            <div className="hero-highlights">
              <div className="highlight-pill">
                <span className="highlight-label">Forecast</span>
                <strong>{formatCurrencyCompact(weightedForecast)}</strong>
              </div>
              <div className="highlight-pill">
                <span className="highlight-label">Pipeline records</span>
                <strong>{deals.length} live deal objects</strong>
              </div>
              <div className="highlight-pill">
                <span className="highlight-label">Views ready</span>
                <strong>6 accessible CRM sections</strong>
              </div>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview__card">
              <p className="sidebar-label">Revenue readiness</p>
              <strong>{formatCurrencyCompact(totalPipelineValue)}</strong>
              <span>
                Current weighted forecast reflects stage-based probabilities and
                updates as you change live deal stages.
              </span>
            </div>

            <div className="hero-preview__bands" aria-hidden="true">
              {pipelineSummary.map((stage) => (
                <div
                  key={stage.stage}
                  className="hero-band"
                  style={{ width: `${Math.max(stage.share, 26)}%` }}
                >
                  <span>{stage.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Dashboard metrics">
          {topMetricCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              meta={card.meta}
              accent={card.accent}
            />
          ))}
        </section>

        <section className="content-grid content-grid--2">
          <Panel
            kicker="Pipeline health"
            title="Stage mix and current opportunity value"
            detail="Each row reflects the current front-end state, so this list can later be fed directly from the database."
          >
            <div className="stage-list">
              {pipelineSummary.map((stage) => (
                <div key={stage.stage} className="stage-row">
                  <div className="stage-meta">
                    <div>
                      <strong>{stage.stage}</strong>
                      <span>{stage.count} deals in this stage</span>
                    </div>
                    <span>{formatCurrencyCompact(stage.value)}</span>
                  </div>
                  <div className="stage-track">
                    <div
                      className="stage-fill"
                      style={{ width: `${Math.max(stage.share, 8)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            kicker="Database handoff"
            title="Local entities already mapped for backend integration"
            detail="These modules hold clean, structured records so your API or ORM layer can replace the mock arrays with minimal UI refactoring."
          >
            <div className="schema-list">
              {readinessRows.map((row) => (
                <article key={row.entity} className="schema-row">
                  <div>
                    <strong>{row.entity}</strong>
                    <p>{row.fields}</p>
                  </div>
                  <span>{row.count} rows</span>
                </article>
              ))}
            </div>
          </Panel>
        </section>

        <section className="content-grid content-grid--2">
          <Panel
            kicker="Priority focus"
            title="High-value deals that need attention"
            detail="Use this as the handoff list for urgent work each morning."
          >
            <div className="simple-list">
              {highPriorityDeals.map((deal) => (
                <article key={deal.id} className="simple-list__item">
                  <div>
                    <strong>{deal.name}</strong>
                    <p>
                      {deal.company} • {deal.owner} • closes{' '}
                      {formatDateLabel(deal.closeDate)}
                    </p>
                  </div>
                  <span className={`tone-pill ${getToneClass(deal.priority)}`}>
                    {deal.priority}
                  </span>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            kicker="Today&apos;s queue"
            title="Open activities across the sales floor"
            detail="Activities marked complete here update all summaries immediately."
          >
            <div className="simple-list">
              {openActivities.map((activity) => (
                <article key={activity.id} className="simple-list__item">
                  <div>
                    <strong>{activity.subject}</strong>
                    <p>
                      {activity.owner} • {activity.deal} • due{' '}
                      {formatDateLabel(activity.dueDate)}
                    </p>
                  </div>
                  <span className={`tone-pill ${getToneClass(activity.status)}`}>
                    {activity.status}
                  </span>
                </article>
              ))}
            </div>
          </Panel>
        </section>
      </>
    )
  }

  function renderSalesWorkspaceView() {
    const reportList = filteredReports

    return (
      <>
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="status-badge">Initial guide translated into UI</span>
            <p className="hero-text">
              Each dashboard comes with a set of reports that offer more
              detailed analysis and insights into sales performance. Keep the
              right-side preview focused on what matters and use the toggles to
              decide what appears on the dashboard.
            </p>

            <div className="hero-highlights">
              <div className="highlight-pill">
                <span className="highlight-label">Enabled reports</span>
                <strong>{enabledReportsLabel}</strong>
              </div>
              <div className="highlight-pill">
                <span className="highlight-label">Revenue pacing</span>
                <strong>
                  {Math.round(
                    (reportCatalog[4].forecast / reportCatalog[4].goal) * 100,
                  )}
                  % of target
                </strong>
              </div>
              <div className="highlight-pill">
                <span className="highlight-label">Workspace style</span>
                <strong>Dark panels with orange highlights</strong>
              </div>
            </div>
          </div>

          <div className="hero-preview">
            <div className="hero-preview__card">
              <p className="sidebar-label">Forecast snapshot</p>
              <strong>{formatMetricValue(reportCatalog[4].forecast, 'currency')}</strong>
              <span>
                Proposal and negotiation stages still hold the biggest upside
                for the current team.
              </span>
            </div>
            <div className="hero-preview__bands" aria-hidden="true">
              {pipelineSummary.map((stage) => (
                <div
                  key={stage.stage}
                  className="hero-band"
                  style={{ width: `${Math.max(stage.share, 24)}%` }}
                >
                  <span>{stage.stage}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Sales workspace metrics">
          {topMetricCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              meta={card.meta}
              accent={card.accent}
            />
          ))}
        </section>

        <section className="content-grid content-grid--2">
          <Panel
            kicker="Reports library"
            title="Choose your reports"
            detail="Click a report to focus the preview and use the checkbox to include or remove it from the dashboard set."
            action={<span className="selection-pill">{enabledReportsLabel}</span>}
          >
            {reportList.length === 0 ? (
              <EmptyState
                title="No matching reports"
                copy="Try a different search term to see more report options."
              />
            ) : (
              <div className="report-list" role="list">
                {reportList.map((report) => {
                  const isSelected = selectedReportSet.has(report.id)
                  const isActive = activeReport.id === report.id

                  return (
                    <div
                      key={report.id}
                      className={`report-item ${isActive ? 'is-active' : ''} ${
                        !isSelected ? 'is-muted' : ''
                      }`}
                      role="listitem"
                    >
                      <label className="checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleReport(report.id)}
                          aria-label={`Toggle ${report.title}`}
                        />
                        <span className="checkbox-custom" aria-hidden="true" />
                      </label>

                      <button
                        type="button"
                        className="report-content"
                        onClick={() => isSelected && setActiveReportId(report.id)}
                        disabled={!isSelected}
                      >
                        <span className="report-title">{report.title}</span>
                        <span className="report-description">
                          {report.description}
                        </span>
                      </button>

                      <span className="report-chip">{report.chip}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>

          <Panel
            kicker="Live preview"
            title={activeReport.title}
            detail={activeReport.insight}
            action={
              <span className="selection-pill selection-pill--warm">
                {activeReport.change}
              </span>
            }
          >
            <div className="preview-stats">
              <div className="preview-stat">
                <span>{activeReport.metricLabel}</span>
                <strong>
                  {formatMetricValue(
                    activeReport.forecast,
                    activeReport.metricType,
                  )}
                </strong>
              </div>
              <div className="preview-stat">
                <span>Goal</span>
                <strong>
                  {formatMetricValue(activeReport.goal, activeReport.metricType)}
                </strong>
              </div>
              <div className="preview-stat">
                <span>Gap to close</span>
                <strong>
                  {formatMetricValue(
                    Math.max(activeReport.goal - activeReport.forecast, 0),
                    activeReport.metricType,
                  )}
                </strong>
              </div>
            </div>

            <ReportChart report={activeReport} />
          </Panel>
        </section>

        <section className="content-grid content-grid--2">
          <Panel
            kicker="Sales desk"
            title="Rep momentum"
            detail="This section can be wired to performance tables or a leaderboard service later."
          >
            <div className="rep-grid">
              {salesTeam.map((rep) => (
                <article key={rep.id} className="rep-card">
                  <strong>{rep.name}</strong>
                  <span>{rep.role}</span>
                  <p>{rep.focus}</p>
                  <p>Close rate: {rep.closeRate}%</p>
                  <p>Quota attainment: {rep.quota}%</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            kicker="Next follow-ups"
            title="Action queue from live activities"
            detail="The queue below updates from the Activities module."
          >
            <div className="task-list">
              {openActivities.map((activity) => (
                <div key={activity.id} className="task-item">
                  <span className="task-dot" aria-hidden="true" />
                  <p>
                    {activity.subject} • {activity.owner} • due{' '}
                    {formatDateLabel(activity.dueDate)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </>
    )
  }

  function renderDealsView() {
    return (
      <>
        <section className="metrics-grid metrics-grid--compact">
          <MetricCard
            label="Total pipeline value"
            value={formatCurrencyCompact(totalPipelineValue)}
            meta="All active and closed-won deals in the current front-end store"
            accent="accent"
          />
          <MetricCard
            label="High-priority deals"
            value={highPriorityDeals.length.toLocaleString()}
            meta="Deals marked for immediate review"
            accent="surface"
          />
          <MetricCard
            label="Proposal stage deals"
            value={deals
              .filter((deal) => deal.stage === 'Proposal')
              .length.toLocaleString()}
            meta="Strong candidates for revenue acceleration"
            accent="alt"
          />
          <MetricCard
            label="This month closes"
            value={deals
              .filter((deal) => deal.closeDate.startsWith('2026-03'))
              .length.toLocaleString()}
            meta="Opportunities closing inside March 2026"
            accent="surface"
          />
        </section>

        <section className="content-grid content-grid--primary">
          <Panel
            kicker="Pipeline table"
            title="Deal management"
            detail="Select a deal to inspect it. Stage changes update the dashboard and report summaries immediately."
            action={
              <div className="panel-inline-controls">
                <label className="filter-wrap">
                  <span>Stage</span>
                  <select
                    value={stageFilter}
                    onChange={(event) => setStageFilter(event.target.value)}
                  >
                    <option value="all">All stages</option>
                    {stageOrder.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            }
          >
            {filteredDeals.length === 0 ? (
              <EmptyState
                title="No deals match this filter"
                copy="Clear the search or switch the stage filter to see more deals."
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Company</th>
                      <th>Stage</th>
                      <th>Value</th>
                      <th>Owner</th>
                      <th>Close date</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeals.map((deal) => (
                      <tr
                        key={deal.id}
                        className={selectedDealId === deal.id ? 'is-selected' : ''}
                      >
                        <td>
                          <button
                            type="button"
                            className="table-link"
                            onClick={() => setSelectedDealId(deal.id)}
                          >
                            {deal.name}
                          </button>
                        </td>
                        <td>{deal.company}</td>
                        <td>
                          <span className={`tone-pill ${getToneClass(deal.stage)}`}>
                            {deal.stage}
                          </span>
                        </td>
                        <td>{formatCurrencyCompact(deal.value)}</td>
                        <td>{deal.owner}</td>
                        <td>{formatDateLabel(deal.closeDate)}</td>
                        <td>
                          <span
                            className={`tone-pill ${getToneClass(deal.priority)}`}
                          >
                            {deal.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="panel-stack">
            <Panel
              kicker="Selected deal"
              title={selectedDeal?.name ?? 'No deal selected'}
              detail={
                selectedDeal
                  ? 'Adjusting the stage below updates all aggregate metrics in the app.'
                  : 'Select a deal from the table to see its details.'
              }
            >
              {selectedDeal ? (
                <div className="detail-card">
                  <div className="detail-list">
                    <div>
                      <span>Company</span>
                      <strong>{selectedDeal.company}</strong>
                    </div>
                    <div>
                      <span>Owner</span>
                      <strong>{selectedDeal.owner}</strong>
                    </div>
                    <div>
                      <span>Contact</span>
                      <strong>{selectedDeal.contact}</strong>
                    </div>
                    <div>
                      <span>Value</span>
                      <strong>{formatCurrencyFull(selectedDeal.value)}</strong>
                    </div>
                    <div>
                      <span>Close date</span>
                      <strong>{formatDateLabel(selectedDeal.closeDate)}</strong>
                    </div>
                    <div>
                      <span>Source</span>
                      <strong>{selectedDeal.source}</strong>
                    </div>
                  </div>

                  <label className="field">
                    <span>Stage</span>
                    <select
                      value={selectedDeal.stage}
                      onChange={(event) =>
                        handleDealStageChange(selectedDeal.id, event.target.value)
                      }
                    >
                      {stageOrder.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <EmptyState
                  title="Deal details unavailable"
                  copy="Add or select a deal to activate this panel."
                />
              )}
            </Panel>

            <Panel
              id="deal-form"
              kicker="Quick create"
              title="Add a new deal"
              detail="This form updates local state now and is structured to become a database create action later."
            >
              <form className="form-grid" onSubmit={handleCreateDeal}>
                <label className="field field--span-2">
                  <span>Deal name</span>
                  <input
                    name="name"
                    value={dealForm.name}
                    onChange={handleDealFormChange}
                    placeholder="North district steel bundle"
                    required
                  />
                </label>

                <label className="field">
                  <span>Company</span>
                  <input
                    name="company"
                    value={dealForm.company}
                    onChange={handleDealFormChange}
                    placeholder="Client company"
                    required
                  />
                </label>

                <label className="field">
                  <span>Contact</span>
                  <input
                    name="contact"
                    value={dealForm.contact}
                    onChange={handleDealFormChange}
                    placeholder="Primary contact"
                  />
                </label>

                <label className="field">
                  <span>Owner</span>
                  <select
                    name="owner"
                    value={dealForm.owner}
                    onChange={handleDealFormChange}
                  >
                    {salesTeam.map((rep) => (
                      <option key={rep.id} value={rep.name}>
                        {rep.name}
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
                    {stageOrder.map((stage) => (
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
                    placeholder="1250000"
                    required
                  />
                </label>

                <label className="field">
                  <span>Close date</span>
                  <input
                    name="closeDate"
                    type="date"
                    value={dealForm.closeDate}
                    onChange={handleDealFormChange}
                    required
                  />
                </label>

                <label className="field">
                  <span>Priority</span>
                  <select
                    name="priority"
                    value={dealForm.priority}
                    onChange={handleDealFormChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
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

  function renderContactsView() {
    return (
      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Directory"
          title="Contacts and account ownership"
          detail="Select a contact to review details and update status. Search and filter are live."
          action={
            <div className="panel-inline-controls">
              <label className="filter-wrap">
                <span>Status</span>
                <select
                  value={contactFilter}
                  onChange={(event) => setContactFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {contactStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        >
          {filteredContacts.length === 0 ? (
            <EmptyState
              title="No contacts match this filter"
              copy="Clear the search or switch the filter to see more contacts."
            />
          ) : (
            <div className="contact-list">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={`contact-card ${
                    selectedContactId === contact.id ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedContactId(contact.id)}
                >
                  <div>
                    <strong>{contact.name}</strong>
                    <span>{contact.role}</span>
                  </div>
                  <p>{contact.company}</p>
                  <div className="contact-card__meta">
                    <span>{contact.owner}</span>
                    <span className={`tone-pill ${getToneClass(contact.status)}`}>
                      {contact.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Contact profile"
            title={selectedContact?.name ?? 'No contact selected'}
            detail="Status and owner can be updated here before connecting the records to backend services."
          >
            {selectedContact ? (
              <div className="detail-card">
                <div className="detail-list">
                  <div>
                    <span>Company</span>
                    <strong>{selectedContact.company}</strong>
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
                    <span>Last touch</span>
                    <strong>{formatDateLabel(selectedContact.lastTouch)}</strong>
                  </div>
                </div>

                <label className="field">
                  <span>Status</span>
                  <select
                    value={selectedContact.status}
                    onChange={(event) =>
                      handleContactStatusChange(
                        selectedContact.id,
                        event.target.value,
                      )
                    }
                  >
                    {contactStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <EmptyState
                title="Contact details unavailable"
                copy="Add or select a contact to activate this panel."
              />
            )}
          </Panel>

          <Panel
            id="contact-form"
            kicker="Quick create"
            title="Add a new contact"
            detail="This form is already structured like a typical contact create payload."
          >
            <form className="form-grid" onSubmit={handleCreateContact}>
              <label className="field">
                <span>Full name</span>
                <input
                  name="name"
                  value={contactForm.name}
                  onChange={handleContactFormChange}
                  placeholder="Full name"
                  required
                />
              </label>

              <label className="field">
                <span>Company</span>
                <input
                  name="company"
                  value={contactForm.company}
                  onChange={handleContactFormChange}
                  placeholder="Company"
                  required
                />
              </label>

              <label className="field">
                <span>Role</span>
                <input
                  name="role"
                  value={contactForm.role}
                  onChange={handleContactFormChange}
                  placeholder="Job title"
                  required
                />
              </label>

              <label className="field">
                <span>Owner</span>
                <select
                  name="owner"
                  value={contactForm.owner}
                  onChange={handleContactFormChange}
                >
                  {salesTeam.map((rep) => (
                    <option key={rep.id} value={rep.name}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={contactForm.email}
                  onChange={handleContactFormChange}
                  placeholder="name@company.com"
                  required
                />
              </label>

              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  value={contactForm.phone}
                  onChange={handleContactFormChange}
                  placeholder="+63 917 555 0100"
                  required
                />
              </label>

              <label className="field field--span-2">
                <span>Status</span>
                <select
                  name="status"
                  value={contactForm.status}
                  onChange={handleContactFormChange}
                >
                  {contactStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="primary-button field--span-2">
                Save contact locally
              </button>
            </form>
          </Panel>
        </div>
      </section>
    )
  }

  function renderActivitiesView() {
    const todayAgenda = activities
      .filter((activity) => activity.dueDate <= '2026-03-25')
      .slice(0, 4)

    return (
      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Activity board"
          title="Calls, meetings, quotes, and site visits"
          detail="Mark activities complete or reopen them. This changes counts across the entire interface."
          action={
            <div className="panel-inline-controls">
              <label className="filter-wrap">
                <span>Status</span>
                <select
                  value={activityFilter}
                  onChange={(event) => setActivityFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {activityStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        >
          {filteredActivities.length === 0 ? (
            <EmptyState
              title="No activities match this filter"
              copy="Try a different search term or filter to load the board."
            />
          ) : (
            <div className="activity-list">
              {filteredActivities.map((activity) => (
                <article key={activity.id} className="activity-card">
                  <div className="activity-card__header">
                    <div>
                      <strong>{activity.subject}</strong>
                      <p>
                        {activity.owner} • {activity.deal}
                      </p>
                    </div>
                    <div className="activity-card__badges">
                      <span className={`tone-pill ${getToneClass(activity.type)}`}>
                        {activity.type}
                      </span>
                      <span
                        className={`tone-pill ${getToneClass(activity.status)}`}
                      >
                        {activity.status}
                      </span>
                    </div>
                  </div>
                  <p className="activity-notes">{activity.notes}</p>
                  <div className="activity-card__footer">
                    <span>Due {formatDateLabel(activity.dueDate)}</span>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleActivityStatusToggle(activity.id)}
                    >
                      {activity.status === 'Completed'
                        ? 'Reopen activity'
                        : 'Mark complete'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Agenda"
            title="Next follow-ups"
            detail="This small queue gives reps a faster daily scan."
          >
            <div className="simple-list">
              {todayAgenda.map((activity) => (
                <article key={activity.id} className="simple-list__item">
                  <div>
                    <strong>{activity.subject}</strong>
                    <p>
                      {activity.owner} • due {formatDateLabel(activity.dueDate)}
                    </p>
                  </div>
                  <span className={`tone-pill ${getToneClass(activity.status)}`}>
                    {activity.status}
                  </span>
                </article>
              ))}
            </div>
          </Panel>

          <Panel
            id="activity-form"
            kicker="Quick log"
            title="Add a new activity"
            detail="Use this to simulate calls, meetings, and quotes before the live activity API is connected."
          >
            <form className="form-grid" onSubmit={handleCreateActivity}>
              <label className="field">
                <span>Type</span>
                <select
                  name="type"
                  value={activityForm.type}
                  onChange={handleActivityFormChange}
                >
                  <option value="Call">Call</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Quote">Quote</option>
                  <option value="Site Visit">Site Visit</option>
                  <option value="Email">Email</option>
                </select>
              </label>

              <label className="field">
                <span>Owner</span>
                <select
                  name="owner"
                  value={activityForm.owner}
                  onChange={handleActivityFormChange}
                >
                  {salesTeam.map((rep) => (
                    <option key={rep.id} value={rep.name}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--span-2">
                <span>Subject</span>
                <input
                  name="subject"
                  value={activityForm.subject}
                  onChange={handleActivityFormChange}
                  placeholder="Activity subject"
                  required
                />
              </label>

              <label className="field">
                <span>Due date</span>
                <input
                  name="dueDate"
                  type="date"
                  value={activityForm.dueDate}
                  onChange={handleActivityFormChange}
                  required
                />
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  name="status"
                  value={activityForm.status}
                  onChange={handleActivityFormChange}
                >
                  {activityStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--span-2">
                <span>Deal</span>
                <select
                  name="deal"
                  value={activityForm.deal}
                  onChange={handleActivityFormChange}
                >
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.name}>
                      {deal.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--span-2">
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={activityForm.notes}
                  onChange={handleActivityFormChange}
                  placeholder="Activity notes"
                  rows="4"
                />
              </label>

              <button type="submit" className="primary-button field--span-2">
                Save activity locally
              </button>
            </form>
          </Panel>
        </div>
      </section>
    )
  }

  function renderReportsView() {
    const reportList = filteredReports

    return (
      <section className="content-grid content-grid--primary">
        <Panel
          kicker="Library"
          title="Saved reports"
          detail="Report selection here stays in sync with the Sales Workspace page."
          action={<span className="selection-pill">{enabledReportsLabel}</span>}
        >
          {reportList.length === 0 ? (
            <EmptyState
              title="No reports match this search"
              copy="Clear the search to bring the report library back."
            />
          ) : (
            <div className="report-grid">
              {reportList.map((report) => (
                <article
                  key={report.id}
                  className={`report-card ${
                    activeReport.id === report.id ? 'is-selected' : ''
                  }`}
                >
                  <div className="report-card__top">
                    <span className="report-chip">{report.chip}</span>
                    <label className="switch-wrap">
                      <input
                        type="checkbox"
                        checked={selectedReportSet.has(report.id)}
                        onChange={() => toggleReport(report.id)}
                        aria-label={`Toggle ${report.title}`}
                      />
                      <span className="switch-visual" />
                    </label>
                  </div>
                  <strong>{report.title}</strong>
                  <p>{report.description}</p>
                  <div className="report-card__footer">
                    <span>{report.change}</span>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setActiveReportId(report.id)}
                    >
                      Preview report
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Preview"
            title={activeReport.title}
            detail={activeReport.insight}
            action={
              <span className="selection-pill selection-pill--warm">
                {activeReport.change}
              </span>
            }
          >
            <div className="preview-stats">
              <div className="preview-stat">
                <span>{activeReport.metricLabel}</span>
                <strong>
                  {formatMetricValue(
                    activeReport.forecast,
                    activeReport.metricType,
                  )}
                </strong>
              </div>
              <div className="preview-stat">
                <span>Goal</span>
                <strong>
                  {formatMetricValue(activeReport.goal, activeReport.metricType)}
                </strong>
              </div>
              <div className="preview-stat">
                <span>Selected set</span>
                <strong>{enabledReportsLabel}</strong>
              </div>
            </div>

            <ReportChart report={activeReport} />
          </Panel>

          <Panel
            id="report-settings"
            kicker="Delivery setup"
            title="Configure report delivery"
            detail="These settings are stored in local state now and are ready to be persisted later."
          >
            <form className="form-grid" onSubmit={handleSaveDeliverySettings}>
              <label className="field">
                <span>Cadence</span>
                <select
                  name="cadence"
                  value={deliverySettings.cadence}
                  onChange={handleDeliverySettingsChange}
                >
                  {deliveryCadences.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Format</span>
                <select
                  name="format"
                  value={deliverySettings.format}
                  onChange={handleDeliverySettingsChange}
                >
                  {deliveryFormats.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field field--span-2">
                <span>Recipients</span>
                <select
                  name="recipientGroup"
                  value={deliverySettings.recipientGroup}
                  onChange={handleDeliverySettingsChange}
                >
                  {recipientGroups.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="checkbox-line field--span-2">
                <input
                  type="checkbox"
                  name="includeSummary"
                  checked={deliverySettings.includeSummary}
                  onChange={handleDeliverySettingsChange}
                />
                <span>Include a written executive summary with every delivery</span>
              </label>

              <button type="submit" className="primary-button field--span-2">
                Save delivery settings
              </button>
            </form>
          </Panel>
        </div>
      </section>
    )
  }

  function renderMainContent() {
    if (activeView === 'dashboard') {
      return renderDashboardView()
    }

    if (activeView === 'sales-workspace') {
      return renderSalesWorkspaceView()
    }

    if (activeView === 'deals') {
      return renderDealsView()
    }

    if (activeView === 'contacts') {
      return renderContactsView()
    }

    if (activeView === 'activities') {
      return renderActivitiesView()
    }

    return renderReportsView()
  }

  return (
    <div className="crm-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo" aria-label="TDT Powersteel CRM">
            <img
              className="brand-logo-image"
              src="/tdt-powersteel-logo.png"
              alt="TDT Powersteel logo"
            />
            <h1 className="brand-name">Customer Relationship Management</h1>
          </div>
        </div>

        <div className="sidebar-card">
          <p className="sidebar-label">Workspace status</p>
          <strong>Built for TDT Powersteel CRM</strong>
          <span>
            Customer Relationship Management workspace for TDT Powersteel,
            built for sales operations.
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
            <strong>{formatCurrencyCompact(weightedForecast)}</strong>
            <span>Weighted revenue forecast from live deal stages</span>
          </div>
          <div className="sidebar-stat">
            <strong>{openActivities.length}</strong>
            <span>Open activities that still need rep follow-through</span>
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
              onClick={handleTopPrimaryAction}
            >
              {getTopPrimaryLabel()}
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
