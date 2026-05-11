export function formatPercentage(value) {
  const rounded = Math.round(value * 10) / 10
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
}

export function formatCurrencyCompact(value) {
  if (value >= 1000000) {
    return `PHP ${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `PHP ${(value / 1000).toFixed(0)}K`
  }
  return `PHP ${value.toLocaleString()}`
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
  if (diffDays === 1) return '1 day ago'
  if (diffDays > 1) return `${diffDays} days ago`
  if (diffDays === -1) return 'in 1 day'
  return `in ${Math.abs(diffDays)} days`
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

  if (normalizedValue.includes('unqualified')
  ) {
    return 'is-neutral'
  }

  if (
    normalizedValue.includes('won') ||
    normalizedValue.includes('customer') ||
    normalizedValue.includes('completed') ||
    normalizedValue.includes('qualified') ||
    normalizedValue.includes('low')
  ) {
    return 'is-positive'
  }

  if (
    normalizedValue.includes('proposal') ||
    normalizedValue.includes('negotiation') ||
    normalizedValue.includes('in progress') ||
    normalizedValue.includes('new') ||
    normalizedValue.includes('medium') ||
    normalizedValue.includes('open')
  ) {
    return 'is-warning'
  }

  if (
    normalizedValue.includes('high')|| 
    normalizedValue.includes('working') 
  ) {
    return 'is-alert'
  }

  if (
    normalizedValue.includes('converted') ||
    normalizedValue.includes('reopened')
  ) {
    return 'is-converted'
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
