export const ITEMS_PER_PAGE = 20

export const LEAD_STATUSES = ['New', 'Working', 'Qualified', 'Unqualified', 'Converted']
export const CUSTOMER_STATUSES = ['New', 'Prospect', 'Negotiation', 'Converted']
export const TASK_TYPES = ['Call', 'Meeting', 'Email', 'Internal']
export const TASK_PRIORITIES = ['Low', 'Medium', 'High']
export const LEAD_SOURCES = ['Website', 'Referral', 'Outbound', 'Event', 'Email']

export const STAGE_WORKFLOW = {
  'Qualified':       { 
    probability: 20, 
    activityType: 'Call',    
    hint: 'Verify company exists in the customer database.'
  },
  'New Opportunity': { 
    probability: 40, 
    activityType: 'Call',    
    hint: 'Client has requested a quotation. Gather scope requirements.'
  },
  'Proposal':        { 
    probability: 60, 
    activityType: 'Email', 
    hint: 'Formalize and present the proposal document.'
  },
  'Negotiation':     { 
    probability: 80, 
    activityType: 'Meeting', 
    hint: 'Adjust terms. Resolve to Closed Won or Closed Lost.'
  },
  'Closed Won':      { probability: 100, activityType: null,     hint: 'Deal signed and closed.' },
  'Closed Lost':     { probability: 0,   activityType: null,     hint: 'Deal lost. Capture reason before closing.' },
}
export const DEAL_STAGES = Object.keys(STAGE_WORKFLOW)
export const SHORT_STAGE_LABEL = { 'New Opportunity': 'New Opp', 'Closed Won': 'Won', 'Closed Lost': 'Lost' }

export const STAGE_COLORS = {
  'Qualified':       'var(--accent-strong)',
  'New Opportunity': '#38bdf8',
  'Proposal':        '#34d399',
  'Negotiation':     '#fb7185',
  'Closed Won':      '#34d399',
  'Closed Lost':     '#666666',
}

export const REGION_BRANCHES = {
  'Central':     ['Manila', 'Palawan', 'Legazpi', 'Cavite', 'Batangas'],
  'North Luzon': ['Ilocos', 'Isabela'],
  'Vis&Min':     ['Gensan', 'Iloilo', 'Cebu', 'Davao', 'CDO'],
}

export const LOST_REASONS = ['Price', 'Competitor', 'Budget', 'Timeline', 'No response', 'Other']

export const HEALTH_LABELS = ['Critical', 'At Risk', 'Healthy']
export const HEALTH_COLORS = { Critical: '#fb7185', 'At Risk': 'var(--warning)', Healthy: '#34d399' }
export const HEALTH_MAP = { Overdue: 'Critical', 'High Priority': 'At Risk', 'Due Today': 'Healthy' }

export const NAV_CONFIG = [
  { id: 'dashboard', label: 'Dashboard',         description: '5 KPI overview' },
  { id: 'database',  label: 'Customer Database',  description: 'Customer records and registry' },
  { id: 'pipeline',  label: 'Pipeline',           description: 'Opportunity visibility' },
  { id: 'tasks',     label: 'Tasks',              description: 'Follow-ups and activity log' },
]

export const VIEW_META = {
  dashboard: { eyebrow: 'In-house CRM prototype', title: 'Dashboard', description: '', searchPlaceholder: 'Search leads, deals, tasks, or companies' },
  database:  { eyebrow: 'Transaction history', title: 'Customer Database', description: '', searchPlaceholder: 'Search customer name, region, SR, or branch' },
  pipeline:  { eyebrow: 'Pipeline visibility', title: 'Pipeline', description: '', searchPlaceholder: 'Search deal, company, stage, or owner' },
  tasks:     { eyebrow: 'Activity tracking', title: 'Tasks', description: '', searchPlaceholder: 'Search tasks, deals, owners, or due dates' },
}
