export function formatPercentage(value) {
  const rounded = Math.round(value * 10) / 10
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
}

export function formatCurrencyCompact(value) {
  const num = Number(value)
  if (isNaN(num)) return 'PHP 0'
  
  const formatShort = (v, suffix) => {
    const val = Math.round(v * 10) / 10
    // If it's a whole number after rounding, don't show .0
    const str = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)
    return `PHP ${str}${suffix}`
  }

  if (num >= 1000000000) return formatShort(num / 1000000000, 'B')
  if (num >= 1000000) return formatShort(num / 1000000, 'M')
  if (num >= 1000) return formatShort(num / 1000, 'K')
  
  return `PHP ${num.toLocaleString('en-PH')}`
}

export function formatCurrencyFull(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDateLabel(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTimePHT(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(d)
}

export function formatRelativeDays(value) {
  if (!value) return ''
  const dateValue = new Date(value)
  if (Number.isNaN(dateValue.getTime())) return ''
  const today = new Date()
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const normalizedValue = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())
  const diffMs = normalizedToday - normalizedValue
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays > 1) return `${diffDays} days ago`
  if (diffDays === -1) return 'tomorrow'
  return `in ${Math.abs(diffDays)} days`
}

export function formatDueDate(value) {
  if (!value) return ''
  const dateValue = new Date(value)
  if (Number.isNaN(dateValue.getTime())) return ''
  const today = new Date()
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const normalizedValue = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate())
  const diffMs = normalizedToday - normalizedValue
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Due Today'
  if (diffDays === -1) return 'Due Tomorrow'
  if (diffDays > 0) return `Due ${formatDateLabel(value)}` // Past
  return `Due ${formatDateLabel(value)}` // Future
}

export function formatMetricValue(value, metricType) {
  if (metricType === 'currency') {
    return formatCurrencyCompact(value)
  }
  return value.toLocaleString()
}

export function matchesSearch(query, values) {
  if (!query.trim()) {
    return true
  }
  const normalizedQuery = query.trim().toLowerCase()
  return values.some((value) =>
    String(value).toLowerCase().includes(normalizedQuery),
  )
}

export function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export function getToneClass(value) {
  if (!value) return 'is-neutral'
  const normalizedValue = String(value).toLowerCase()

  // Exact stage matches (synchronize with kanban board colors)
  if (normalizedValue === 'qualified') return 'is-warning'        // Orange
  if (normalizedValue === 'new opportunity') return 'is-open'     // Blue
  if (normalizedValue === 'proposal') return 'is-positive'        // Green
  if (normalizedValue === 'negotiation') return 'is-alert'        // Red/Pink
  if (normalizedValue === 'closed won') return 'is-positive'      // Green
  if (normalizedValue === 'closed lost') return 'is-neutral'      // Gray

  if (normalizedValue.includes('unqualified')
  ) {
    return 'is-neutral'
  }

  if (
    normalizedValue.includes('won') ||
    normalizedValue.includes('customer') ||
    normalizedValue.includes('completed') ||
    normalizedValue.includes('low')
  ) {
    return 'is-positive'
  }

  if (
    normalizedValue.includes('converted') ||
    normalizedValue.includes('reopened')
  ) {
    return 'is-converted'
  }

  if (
    normalizedValue.includes('open')
  ) {
    return 'is-open'
  }

  if (
    normalizedValue.includes('proposal') ||
    normalizedValue.includes('negotiation') ||
    normalizedValue.includes('in progress') ||
    normalizedValue.includes('new') ||
    normalizedValue.includes('medium')
  ) {
    return 'is-warning'
  }

  if (
    normalizedValue.includes('high')|| 
    normalizedValue.includes('working') 
  ) {
    return 'is-alert'
  }

  return 'is-neutral'
}

export function focusSection(setActiveView, setNotice, viewId, sectionId, message) {
  setActiveView(viewId)
  setNotice(message)

  window.setTimeout(() => {
    const section = document.getElementById(sectionId)
    if (!section) return

    section.scrollIntoView({ behavior: 'smooth', block: 'start' })

    const focusTarget = section.querySelector(
      'input, select, textarea, button',
    )
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus()
    }
  }, 80)
}

export function getTodayISO() {
  return new Date().toISOString().split('T')[0]
}

export function getCurrentMonthISO() {
  return new Date().toISOString().slice(0, 7)
}

export function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function getPaginatedData(data, page, pageSize) {
  const pageNum = page === '' || isNaN(page) ? 1 : parseInt(page, 10)
  const startIndex = (pageNum - 1) * pageSize
  return data.slice(startIndex, startIndex + pageSize)
}

export function displayRole(role) {
  if (role === 'Branch Account' || role === 'Sales Rep' || role === 'Sales Manager') return 'Branch Account'
  return role
}

export function isSrRole(role) {
  return role === 'Branch Account' || role === 'Sales Rep' || role === 'Sales Representative'
}

const ROLE_ABBR = {
  'Head of Sales': 'HoS',
  'Regional Sales Manager': 'RSM',
  'Branch Account': 'Branch',
  'Admin': 'Admin',
}

// Short role tag used in the manager "mine" filter label, e.g. "Marky (RSM)".
export function roleAbbr(role) {
  return ROLE_ABBR[role] ?? role
}

export function shortStageLabel(stage, SHORT_STAGE_LABEL) {
  return SHORT_STAGE_LABEL[stage] ?? stage
}

export function parseAuditValue(val) {
  if (!val) return null
  try {
    return JSON.parse(val)
  } catch {
    try {
      return JSON.parse(val.replace(/'/g, '"'))
    } catch {
      return val
    }
  }
}

export function isValidPhone(val) {
  const digits = (val || '').replace(/[\s\-+().]/g, '')
  return /^\d{7,}$/.test(digits)
}

export function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val || '')
}
