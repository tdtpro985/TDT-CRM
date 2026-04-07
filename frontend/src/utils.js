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
