export const navigationConfig = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview and readiness' },
  { id: 'sales-workspace', label: 'Sales Workspace', description: 'Team command center' },
  { id: 'companies', label: 'Companies', description: 'Account directory' },
  { id: 'deals', label: 'Deals', description: 'Pipeline and quick create' },
  { id: 'contacts', label: 'Contacts', description: 'Directory and account owners' },
  { id: 'activities', label: 'Activities', description: 'Agenda and follow-ups' },
  { id: 'reports', label: 'Reports', description: 'Preview and delivery setup' },
]

export const salesTeam = []
export const reportCatalog = []

export const initialDeals = []
export const initialContacts = []
export const initialActivities = []

export const stageOrder = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won']
export const contactStatuses = ['Lead', 'Qualified', 'Customer']
export const activityStatuses = ['Scheduled', 'In Progress', 'Completed']
export const deliveryCadences = ['Daily', 'Weekly', 'Monthly']
export const deliveryFormats = ['Dashboard link', 'PDF', 'CSV']
export const recipientGroups = ['Sales leadership', 'Regional managers', 'Account executives']
export const stageProbability = {
  Lead: 0.15,
  Qualified: 0.35,
  Proposal: 0.6,
  Negotiation: 0.8,
  'Closed Won': 1,
}

export const defaultCompanyForm = {
  name: '',
  industry: 'Manufacturing',
  website: '',
  owner: 'Unassigned',
}

export const defaultDealForm = {
  name: '',
  companyId: '',
  owner: 'Unassigned',
  stage: 'Lead',
  value: '',
  closeDate: '2026-04-30',
  priority: 'Medium',
  contactId: '',
}

export const defaultContactForm = {
  name: '',
  companyId: '',
  role: '',
  owner: 'Unassigned',
  email: '',
  phone: '',
  status: 'Lead',
}

export const defaultActivityForm = {
  type: 'Call',
  subject: '',
  owner: 'Unassigned',
  dueDate: '2026-04-30',
  status: 'Scheduled',
  dealId: '',
  notes: '',
}

export const defaultDeliverySettings = {
  cadence: 'Weekly',
  format: 'Dashboard link',
  recipientGroup: 'Sales leadership',
  includeSummary: true,
}

export const viewMeta = {
  dashboard: {
    eyebrow: 'Command center',
    title: 'A sales front end ready for real records',
    description: 'Monitor pipeline health, next actions, and database-ready modules from one place.',
    searchPlaceholder: 'Search deals, stages, owners, or contacts',
  },
  'sales-workspace': {
    eyebrow: 'Sales workspace',
    title: 'Choose the reports you want to see',
    description: 'Mirror the HubSpot sales experience while keeping the theme aligned to TDT Powersteel CRM.',
    searchPlaceholder: 'Search reports, insights, and report tags',
  },
  companies: {
    eyebrow: 'Accounts',
    title: 'Manage companies and account relationships',
    description: 'Track industry, website, and ownership for the organizations you do business with.',
    searchPlaceholder: 'Search company, industry, or owner',
  },
  deals: {
    eyebrow: 'Pipeline',
    title: 'Manage deals and keep the pipeline moving',
    description: 'Track value, stages, close dates, and high-priority accounts in a front end that is ready to receive database records.',
    searchPlaceholder: 'Search deal, company, owner, or contact',
  },
  contacts: {
    eyebrow: 'Contact directory',
    title: 'Keep buyers, owners, and champions organized',
    description: 'Review contact ownership, communication health, and account relationships before wiring in customer data.',
    searchPlaceholder: 'Search contact, company, role, or owner',
  },
  activities: {
    eyebrow: 'Follow-through',
    title: 'Log the work that keeps revenue moving',
    description: 'Give sales reps a focused view of calls, meetings, quotes, and site visits with accessible actions.',
    searchPlaceholder: 'Search activity, deal, owner, or notes',
  },
  reports: {
    eyebrow: 'Reporting',
    title: 'Prepare report delivery and dashboard outputs',
    description: 'Set which reports are active, preview them, and define delivery settings that can later be saved to the database.',
    searchPlaceholder: 'Search reports, goals, or delivery content',
  },
}
