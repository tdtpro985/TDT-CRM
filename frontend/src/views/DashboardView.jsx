import { useRef, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, isSrRole, getInitials } from '../utils'
import { API_BASE } from '../api'
import { ITEMS_PER_PAGE, REGION_BRANCHES } from '../constants'
import Pagination from '../components/Pagination'

function WonOverTimeChart({ data, type, mode }) {
  const label = mode === 'won' ? 'won' : 'lost'
  if (data.length === 0) {
    return <div className="dashboard-chart-empty">No deals {label} in this period.</div>
  }

  const maxValue = Math.max(...data.map(d => type === 'revenue' ? d.value : d.count), 1)

  return (
    <div className={`dashboard-chart ${mode === 'lost' ? 'dashboard-chart--lost' : ''}`}>
      {data.map(d => {
        const val = type === 'revenue' ? d.value : d.count
        const height = (val / maxValue) * 100
        return (
          <div key={d.month} className="chart-bar-container">
            <div 
              className={`chart-bar ${mode === 'lost' ? 'chart-bar--lost' : ''}`}
              style={{ height: `${height}%` }}
              title={`${d.month}: ${type === 'revenue' ? formatCurrencyCompact(d.value) : d.count + ' deals'} (${label})`}
            >
              <span className="chart-bar__value">
                {type === 'revenue' ? formatCurrencyCompact(val) : val}
              </span>
            </div>
            <span className="chart-label">{d.month}</span>
          </div>
        )
      })}
    </div>
  )
}

function LostReasonBreakdown({ countData, valueData }) {
  const r = 65, cx = 85, cy = 85, sw = 22
  const circumference = 2 * Math.PI * r
  const [hoveredReason, setHoveredReason] = useState(null)
  const total = countData.reduce((sum, d) => sum + d.count, 0)
  const { slices } = countData.reduce(
    ({ slices: acc, cum }, s) => {
      const pct = total ? s.count / total : 0
      return { slices: [...acc, { ...s, pct, startPct: cum }], cum: cum + pct }
    },
    { slices: [], cum: 0 }
  )

  const maxValue = Math.max(...valueData.map(d => d.value), 1)
  const totalLostValue = valueData.reduce((sum, d) => sum + d.value, 0)

  const COLORS = {
    'Price': '#fb7185',
    'Competitor': '#f59e0b',
    'Budget': '#38bdf8',
    'Timeline': '#c084fc',
    'No response': '#94a3b8',
    'Other': '#475569',
    'Unspecified': '#334155'
  }

  if (total === 0) {
    return <div className="u-text-muted u-fs-sm u-margin-t-16">No lost deals to analyze.</div>
  }

  return (
    <div className="lost-reason-breakdown">
      <div className="lrb-donut-col">
        <svg viewBox="0 0 170 170" className="donut-svg">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
          {slices.map((s) => s.pct > 0 && (
              <circle
              key={s.reason}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={COLORS[s.reason] || '#64748b'}
              strokeWidth={sw}
              strokeDasharray={`${s.pct * circumference} ${circumference}`}
              transform={`rotate(${s.startPct * 360 - 90}, ${cx}, ${cy})`}
              style={{
                transition: 'stroke-dasharray 0.5s ease, opacity 0.25s ease',
                opacity: hoveredReason === null || hoveredReason === s.reason ? 1 : 0.12
              }}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-strong)" fontSize="22" fontWeight="800" fontFamily="inherit">
            {total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="inherit">
            Lost Deals
          </text>
        </svg>
        <div className="donut-legend">
          {slices.map((s) => (
            <div key={s.reason} className="legend-item"
              onMouseEnter={() => setHoveredReason(s.reason)}
              onMouseLeave={() => setHoveredReason(null)}>
              <span className="legend-dot" style={{ background: COLORS[s.reason] || '#64748b' }} />
              <span className="legend-label">{s.reason}</span>
              <span className="legend-count">{s.count.toLocaleString()}</span>
              <span className="legend-pct">{Math.round(s.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lrb-bars-col">
        <div className="lrb-bars-header">
          <svg className="lrb-bars-icon" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="11" width="4" height="7" rx="1" fill="var(--text-muted)" opacity="0.5"/>
            <rect x="8" y="7" width="4" height="11" rx="1" fill="var(--text-muted)" opacity="0.65"/>
            <rect x="14" y="3" width="4" height="15" rx="1" fill="var(--text-strong)" opacity="0.8"/>
          </svg>
          <span className="lrb-bars-title">Value Lost</span>
          <span className="lrb-bars-total">{formatCurrencyCompact(totalLostValue)}</span>
        </div>
        <div className="lrb-bars-list">
          {valueData.map(d => {
            const pct = maxValue > 0 ? (d.value / maxValue) * 100 : 0
            return (
              <div key={d.reason} className="lrb-bar-row"
                onMouseEnter={() => setHoveredReason(d.reason)}
                onMouseLeave={() => setHoveredReason(null)}>
                <span className="lrb-bar-dot" style={{ background: COLORS[d.reason] || '#64748b' }} />
                <span className="lrb-bar-label">{d.reason}</span>
                <div className="lrb-bar-track">
                  <div className="lrb-bar-fill" style={{ width: `${pct}%`, background: COLORS[d.reason] || '#64748b' }} />
                </div>
                <span className="lrb-bar-value">{formatCurrencyCompact(d.value)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StageDonutChart({ data, hovered, onHover }) {
  const r = 65, cx = 85, cy = 85, sw = 22
  const circumference = 2 * Math.PI * r

  const activeStages = data.filter(s => s.stage !== 'Closed Won' && s.stage !== 'Closed Lost' && s.count > 0)
  const total = activeStages.reduce((sum, s) => sum + s.count, 0)

  const STAGE_COLORS = {
    'New Opportunity': '#38bdf8',
    'Proposal':        '#34d399',
    'Negotiation':     '#fb7185',
  }

  const slices = activeStages.reduce((acc, s) => {
    const pct = total ? s.count / total : 0
    const startPct = acc.length ? acc[acc.length - 1].startPct + acc[acc.length - 1].pct : 0
    return [...acc, { ...s, pct, startPct }]
  }, [])

  if (total === 0) {
    return <div className="u-text-muted u-fs-sm u-margin-t-16">No deals in pipeline.</div>
  }

  return (
    <div className="donut-wrapper">
      <svg viewBox="0 0 170 170" className="donut-svg">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
        {slices.map((s) => s.pct > 0 && (
          <circle
            key={s.stage}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={STAGE_COLORS[s.stage] || '#64748b'}
            strokeWidth={sw}
            strokeDasharray={`${s.pct * circumference} ${circumference}`}
            transform={`rotate(${s.startPct * 360 - 90}, ${cx}, ${cy})`}
            style={{
              transition: 'stroke-dasharray 0.5s ease, opacity 0.25s ease',
              opacity: hovered === null || hovered === s.stage ? 1 : 0.12
            }}
          />
        ))}
        <text x={cx} y={cy + 4} textAnchor="middle" fill="var(--text-strong)" fontSize="24" fontWeight="800" fontFamily="inherit">
          {total.toLocaleString()}
        </text>
      </svg>
      <div className="donut-legend">
        {slices.map((s) => (
          <div key={s.stage} className="legend-item"
            onMouseEnter={() => onHover(s.stage)}
            onMouseLeave={() => onHover(null)}>
            <span className="legend-dot" style={{ background: STAGE_COLORS[s.stage] || '#64748b' }} />
            <span className="legend-label">{s.stage}</span>
            <span className="legend-count">{s.count.toLocaleString()}</span>
            <span className="legend-pct">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEFAULT_LAYOUT = [
  { id: 'kpi_metrics',    enabled: true },
  { id: 'announcements',  enabled: true },
  { id: 'branch_overview', enabled: true },
  { id: 'top_srs',        enabled: true },
  { id: 'deals_chart',    enabled: true },
  { id: 'stage_donut',    enabled: true },
  { id: 'record_health',  enabled: true },
  { id: 'priority_tasks', enabled: true },
  { id: 'totals',         enabled: true },
  { id: 'recent_wins',    enabled: true },
  { id: 'recent_losses',  enabled: true },
  { id: 'loss_analysis',  enabled: true },
]

const WIDGET_LABELS = {
  kpi_metrics:     'KPI Metrics',
  announcements:   'Announcements',
  top_srs:         'Top Sales Reps',
  branch_overview: 'Branch Overview',
  deals_chart:     'Deals Won/Lost Chart',
  stage_donut:     'Deals by Stage',
  record_health:   'Record Health',
  priority_tasks:  'Priority Follow-ups',
  totals:          'Won/Lost Totals',
  recent_wins:     'Recent Wins',
  recent_losses:   'Recent Losses',
  loss_analysis:   'Loss Analysis',
}

const HALF_WIDTH = new Set(['deals_chart','stage_donut','record_health','priority_tasks','recent_wins','recent_losses','top_srs','branch_overview','announcements'])
const HISTORY_PAGE_SIZE = 5
// Approximate per-row height (px). This reserves space for HISTORY_PAGE_SIZE rows
// so the Prev/Next controls remain at a consistent position below the 5th item.
const HISTORY_ROW_PX = 56

function loadLayout(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key))
    if (!raw) return DEFAULT_LAYOUT
    if (Array.isArray(raw)) {
      const knownIds = new Set(raw.map(w => w.id))
      const missing = DEFAULT_LAYOUT.filter(w => !knownIds.has(w.id))
      return [...raw, ...missing]
    }
    // Migrate old object format
    return DEFAULT_LAYOUT.map(w => ({ ...w, enabled: raw[w.id] ?? true }))
  } catch { return DEFAULT_LAYOUT }
}

function SortableWidgetRow({ widget, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="customize-widget-row">
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <span className="customize-widget-label">{WIDGET_LABELS[widget.id]}</span>
      <label className="toggle-switch">
        <input type="checkbox" checked={widget.enabled} onChange={onToggle} />
        <span className="toggle-track" />
      </label>
    </div>
  )
}

export default function DashboardView({
  topKpis,
  stageSummary,
  deals,
  leads,
  contacts,
  companies,
  openTasks,
  linkHealth,
  currentUser,
  teamMembers,
  showCustomize,
  setShowCustomize,
  announcements,
}) {
  const navigate = useNavigate()
  const isSr = isSrRole(currentUser?.role)
  const stageListRef = useRef(null)
  const healthRef = useRef(null)
  const [healthVisible, setHealthVisible] = useState(false)
  const [announcementPage, setAnnouncementPage] = useState(1)

  // Layout customization
  const layoutKey = `dashboard_layout_${currentUser?.id}`
  const [layout, setLayout] = useState(() => loadLayout(`dashboard_layout_${currentUser?.id}`))
  const [draftLayout, setDraftLayout] = useState(layout)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setDraftLayout(prev => {
      const from = prev.findIndex(w => w.id === active.id)
      const to = prev.findIndex(w => w.id === over.id)
      return arrayMove(prev, from, to)
    })
  }

  function cancelCustomize() {
    setDraftLayout(layout)
    setShowCustomize(false)
  }

  function saveLayout() {
    setLayout(draftLayout)
    try { localStorage.setItem(layoutKey, JSON.stringify(draftLayout)) } catch { /* ignore */ }
    setShowCustomize(false)
  }

  // Chart state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 5)
    return d.toISOString().slice(0, 7) // Last 6 months
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 7))
  const [chartType, setChartType] = useState('revenue')
  const [chartMode, setChartMode] = useState('won')
  const [hoveredStage, setHoveredStage] = useState(null)
  const [srSort, setSrSort] = useState('dealsWon')
  const [winsPage, setWinsPage] = useState(1)
  const [lossesPage, setLossesPage] = useState(1)

  function handleSrSort(key) {
    setSrSort(key)
  }

  const isHosOrAdmin = currentUser?.role === 'Head of Sales' || currentUser?.role === 'Admin'
  const isRsm = currentUser?.role === 'Regional Sales Manager'

  const topSRs = useMemo(() => {
    if (!isHosOrAdmin && !isRsm) return []

    const stats = {}

    deals.forEach(d => {
      const owner = d.owner || 'Unassigned'
      if (!stats[owner]) {
        stats[owner] = { name: owner, dealsWon: 0, dealsLost: 0, pipelineValue: 0, branch: d.branch || '' }
      }
      if (d.stage === 'Closed Won') stats[owner].dealsWon++
      if (d.stage === 'Closed Lost') stats[owner].dealsLost++
      if (d.stage !== 'Closed Won' && d.stage !== 'Closed Lost') {
        stats[owner].pipelineValue += Number(d.value || 0)
      }
    })

    leads.forEach(l => {
      const owner = l.sr || l.ownerName || 'Unassigned'
      if (!stats[owner]) {
        stats[owner] = { name: owner, dealsWon: 0, dealsLost: 0, pipelineValue: 0, branch: l.branch || '', leadsCount: 0, converted: 0 }
      }
      stats[owner].leadsCount = (stats[owner].leadsCount || 0) + 1
      if (l.status === 'Converted') stats[owner].converted = (stats[owner].converted || 0) + 1
    })

    teamMembers.forEach(m => {
      if (isSrRole(m.role) && !stats[m.name]) {
        stats[m.name] = { name: m.name, dealsWon: 0, dealsLost: 0, pipelineValue: 0, branch: m.branch || '', leadsCount: 0, converted: 0 }
      }
    })

    const memberPic = {}
    teamMembers.forEach(m => {
      if (isSrRole(m.role)) memberPic[m.name] = m.profilePic || ''
    })

    return Object.values(stats)
      .filter(s => s.name !== 'Unassigned')
      .map(s => ({ ...s, profilePic: memberPic[s.name] || '' }))
      .sort((a, b) => (b[srSort] || 0) - (a[srSort] || 0))
  }, [deals, leads, srSort, isHosOrAdmin, isRsm, teamMembers])

  const branchStats = useMemo(() => {
    const stats = {}
    teamMembers.forEach(m => {
      if (!isSrRole(m.role)) return
      const b = m.branch || 'Unknown'
      if (!stats[b]) stats[b] = { branch: b, srs: 0, activeDeals: 0, pipelineValue: 0, won: 0 }
      stats[b].srs++
    })
    deals.forEach(d => {
      const b = d.branch || 'Unknown'
      if (!stats[b]) stats[b] = { branch: b, srs: 0, activeDeals: 0, pipelineValue: 0, won: 0 }
      if (d.stage !== 'Closed Won' && d.stage !== 'Closed Lost') {
        stats[b].activeDeals++
        stats[b].pipelineValue += Number(d.value || 0)
      }
      if (d.stage === 'Closed Won') stats[b].won++
    })
    return Object.values(stats).sort((a, b) => a.branch.localeCompare(b.branch))
  }, [deals, teamMembers])

  const PIPELINE_STAGE_COLORS = {
    'New Opportunity': '#38bdf8',
    'Proposal':        '#34d399',
    'Negotiation':     '#fb7185',
  }

  const chartData = useMemo(() => {
    const targetStage = chartMode === 'won' ? 'Closed Won' : 'Closed Lost'
    const filteredDeals = deals.filter(d => {
      if (d.stage !== targetStage) return false
      const date = d.closeDate || d.created_at
      if (!date) return false
      const month = date.slice(0, 7)
      return (!startDate || month >= startDate) && (!endDate || month <= endDate)
    })

    const groups = {}

    if (startDate && endDate) {
      let [y, m] = startDate.split('-').map(Number)
      let curr = `${y}-${String(m).padStart(2, '0')}`
      while (curr <= endDate) {
        groups[curr] = { month: curr, count: 0, value: 0 }
        m++
        if (m > 12) {
          m = 1
          y++
        }
        curr = `${y}-${String(m).padStart(2, '0')}`
      }
    }

    filteredDeals.forEach(d => {
      const month = (d.closeDate || d.created_at).slice(0, 7)
      if (!groups[month]) groups[month] = { month, count: 0, value: 0 }
      groups[month].count++
      groups[month].value += Number(d.value || 0)
    })

    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month))
  }, [deals, startDate, endDate, chartMode])

  const wonStats = useMemo(() => {
    const won = deals.filter(d => d.stage === 'Closed Won')
    return {
      count: won.length,
      value: won.reduce((sum, d) => sum + Number(d.value || 0), 0)
    }
  }, [deals])

  const lostStats = useMemo(() => {
    const lost = deals.filter(d => d.stage === 'Closed Lost')
    return {
      count: lost.length,
      value: lost.reduce((sum, d) => sum + Number(d.value || 0), 0)
    }
  }, [deals])

  // full sorted lists (pagination applied later)
  const recentWinsAll = useMemo(() => {
    return deals
      .filter(d => d.stage === 'Closed Won')
      .sort((a, b) => new Date(b.closeDate || b.created_at) - new Date(a.closeDate || a.created_at))
  }, [deals])

  const recentLossesAll = useMemo(() => {
    return deals
      .filter(d => d.stage === 'Closed Lost')
      .sort((a, b) => new Date(b.closeDate || b.created_at) - new Date(a.closeDate || a.created_at))
  }, [deals])

  const winsTotalPages = Math.max(1, Math.ceil(recentWinsAll.length / HISTORY_PAGE_SIZE))
  const lossesTotalPages = Math.max(1, Math.ceil(recentLossesAll.length / HISTORY_PAGE_SIZE))

  // Display page values should be clamped to available totals to avoid forcing state updates inside effects
  const displayedWinsPage = Math.min(winsPage, winsTotalPages)
  const displayedLossesPage = Math.min(lossesPage, lossesTotalPages)

  // Visible slices for current pages (use clamped display pages)
  const recentWins = recentWinsAll.slice((displayedWinsPage - 1) * HISTORY_PAGE_SIZE, displayedWinsPage * HISTORY_PAGE_SIZE)
  const recentLosses = recentLossesAll.slice((displayedLossesPage - 1) * HISTORY_PAGE_SIZE, displayedLossesPage * HISTORY_PAGE_SIZE)

  const lostReasonData = useMemo(() => {
    const lost = deals.filter(d => d.stage === 'Closed Lost')
    const counts = {}
    lost.forEach(d => {
      const reason = (d.lostReason || 'Unspecified').split(':')[0].trim()
      counts[reason] = (counts[reason] || 0) + 1
    })
    return Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
  }, [deals])

  const lostValueData = useMemo(() => {
    const lost = deals.filter(d => d.stage === 'Closed Lost')
    const sums = {}
    lost.forEach(d => {
      const reason = (d.lostReason || 'Unspecified').split(':')[0].trim()
      sums[reason] = (sums[reason] || 0) + (parseFloat(d.value) || 0)
    })
    return Object.entries(sums)
      .map(([reason, value]) => ({ reason, value }))
      .sort((a, b) => b.value - a.value)
  }, [deals])

  const priorityCounts = {
    High: openTasks.filter(t => t.priority === 'High').length,
    Medium: openTasks.filter(t => t.priority === 'Medium').length,
    Low: openTasks.filter(t => t.priority === 'Low').length,
  }

  useEffect(() => {
    const el = healthRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHealthVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Note: we avoid calling setState inside effects. Rendering clamps page numbers to available totals

  const focusTasks = (() => {
    const high = openTasks.filter(t => t.priority === 'High')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    if (high.length > 0) return high.slice(0, 5)

    const medium = openTasks.filter(t => t.priority === 'Medium')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    if (medium.length > 0) return medium.slice(0, 5)

    const low = openTasks.filter(t => t.priority === 'Low')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    return low.slice(0, 5)
  })()

  // Build ordered render rows from layout array (smart 2-col pairing)
  const renderRows = useMemo(() => {
    const enabled = layout.filter(w => w.enabled).map(w => w.id)
    const rows = []
    let i = 0
    while (i < enabled.length) {
      const cur = enabled[i]
      const nxt = enabled[i + 1]
      const curHalf = HALF_WIDTH.has(cur) && !(isHosOrAdmin && cur === 'branch_overview')
      const nxtHalf = nxt && HALF_WIDTH.has(nxt) && !(isHosOrAdmin && nxt === 'branch_overview')
      if (curHalf && nxt && nxtHalf) {
        rows.push({ type: 'pair', a: cur, b: nxt })
        i += 2
      } else {
        rows.push({ type: 'single', id: cur })
        i++
      }
    }
    return rows
  }, [layout, isHosOrAdmin])

  function renderWidget(id) {
    switch (id) {
      case 'kpi_metrics': return (
        <section key="kpi_metrics" className="metrics-grid metrics-grid--five" aria-label="Core KPIs">
          {topKpis.map((kpi) => (
            <MetricCard key={kpi.label} label={kpi.label} value={kpi.value} meta={kpi.meta} accent={kpi.accent} route={kpi.route} />
          ))}
        </section>
      )
      case 'top_srs': {
        if (isSr) return null
        const showScroll = topSRs.length >= 3
        const duration = Math.max(15, Math.min(60, topSRs.length * 2))
        return (
          <Panel key="top_srs" kicker="Rankings" title="Top Sales Reps"
            action={
              <div className="dashboard-sr-sort">
                {[['Won', 'dealsWon'], ['Leads', 'leadsCount'], ['Value', 'pipelineValue']].map(([label, key]) => (
                  <button key={key} type="button" className={`dashboard-sr-sort-btn${srSort === key ? ' is-active' : ''}`}
                    onClick={() => handleSrSort(key)}>{label}</button>
                ))}
              </div>
            }
          >
            <div className="dashboard-sr-panel-content">
              {topSRs.length === 0 ? (
                <p className="u-pad-16 u-text-muted u-fs-sm">No SR data available for the current scope.</p>
              ) : (
                <div className={showScroll ? 'sr-rank-list-infinite' : ''}>
                  <div className={showScroll ? 'sr-rank-list-track' : 'sr-rank-list'}
                    style={showScroll ? { '--rank-scroll-duration': `${duration}s` } : undefined}>
                    {(showScroll ? [...topSRs, ...topSRs] : topSRs).map((sr, i) => (
                      <div key={`${sr.name}-${i}`} className="sr-rank-item">
                        <div className="sr-rank-badge">{(i % topSRs.length) + 1}</div>
                        <div className="sr-rank-avatar">
                          {sr.profilePic ? (
                            <img className="sr-rank-avatar-img" src={`${API_BASE}${sr.profilePic}`} alt="" />
                          ) : (
                            <span>{getInitials(sr.name)}</span>
                          )}
                        </div>
                        <div className="sr-rank-info">
                          <div className="sr-rank-name">{sr.name}</div>
                          <div className="sr-rank-branch">{sr.branch}</div>
                        </div>
                        <div className="sr-rank-stats">
                          {srSort === 'dealsWon' && (
                            <span className="admin-role-pill admin-role-pill--accent">{sr.dealsWon} won</span>
                          )}
                          {srSort === 'leadsCount' && (
                            <span className="admin-role-pill admin-role-pill--alt">{sr.leadsCount} leads</span>
                          )}
                          {srSort === 'pipelineValue' && (
                            <span className="admin-role-pill admin-role-pill--surface">{formatCurrencyCompact(sr.pipelineValue)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )
      }
      case 'branch_overview': {
        if (isSr) return null

        const branchToRegion = {}
        Object.entries(REGION_BRANCHES).forEach(([region, branches]) => {
          branches.forEach(b => { branchToRegion[b.toLowerCase()] = region })
        })

        const regionGroups = {}
        branchStats.forEach(s => {
          const region = branchToRegion[s.branch.toLowerCase()] || 'Other'
          if (!regionGroups[region]) regionGroups[region] = { region, branches: [], srs: 0, activeDeals: 0, pipelineValue: 0, won: 0 }
          regionGroups[region].branches.push(s)
          regionGroups[region].srs += s.srs
          regionGroups[region].activeDeals += s.activeDeals
          regionGroups[region].pipelineValue += s.pipelineValue
          regionGroups[region].won += s.won
        })

        const regionOrder = Object.keys(REGION_BRANCHES)
        const sortedRegions = Object.values(regionGroups).sort((a, b) => {
          const ai = regionOrder.indexOf(a.region)
          const bi = regionOrder.indexOf(b.region)
          if (ai === -1 && bi === -1) return 0
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        })

        const hasData = branchStats.length > 0

        if (isHosOrAdmin) {
          const filteredRegions = sortedRegions.filter(g => g.region !== 'Other')
          return (
            <section key="branch_overview" className="content-grid">
              <Panel kicker="Regional Summary"
                title="Branch Overview by Region"
                detail="Active deals, pipeline value, and SR coverage per branch."
              >
                {!hasData ? (
                  <div className="admin-table__muted u-text-center u-pad-16">No data for the selected scope.</div>
                ) : (
                  <div className="region-columns">
                    {filteredRegions.map(grp => (
                      <div key={grp.region} className="region-column">
                        <div className="region-column__header">{grp.region}</div>
                        <div className="region-column__body">
                          <div className="region-column__row region-column__header-row">
                            <span className="region-column__name">Branch</span>
                            <span className="region-column__num">SRs</span>
                            <span className="region-column__num">Active</span>
                            <span className="region-column__num-mono">Pipeline</span>
                            <span className="region-column__num">Won</span>
                          </div>
                          {grp.branches.map(s => (
                            <div key={s.branch} className="region-column__row">
                              <span className="region-column__name">{s.branch}</span>
                              <span className="region-column__num">{s.srs}</span>
                              <span className="region-column__num">{s.activeDeals}</span>
                              <span className="region-column__num-mono">{formatCurrencyCompact(s.pipelineValue)}</span>
                              <span className="region-column__num">{s.won}</span>
                            </div>
                          ))}
                        </div>
                        <div className="region-column__divider" />
                        <div className="region-column__row region-column__row--total">
                          <span className="region-column__name">Total</span>
                          <span className="region-column__num">{grp.srs}</span>
                          <span className="region-column__num">{grp.activeDeals}</span>
                          <span className="region-column__num-mono">{formatCurrencyCompact(grp.pipelineValue)}</span>
                          <span className="region-column__num">{grp.won}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </section>
          )
        }

        return (
          <Panel kicker="Regional Summary"
            title="Branch Overview"
            detail="Active deals, pipeline value, and SR coverage per branch."
          >
            {!hasData ? (
              <div className="admin-table__muted u-text-center u-pad-16">No data for the selected scope.</div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th className="num">SRs</th>
                      <th className="num">Active Deals</th>
                      <th className="num-mono">Pipeline Value</th>
                      <th className="num">Won</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchStats.map(s => (
                      <tr key={s.branch}>
                        <td className="admin-table__name">{s.branch}</td>
                        <td className="num">{s.srs}</td>
                        <td className="num">{s.activeDeals}</td>
                        <td className="num-mono">{formatCurrencyCompact(s.pipelineValue)}</td>
                        <td className="num">{s.won}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )
      }
      case 'deals_chart': return (
        <Panel key="deals_chart"
          kicker="Performance"
          title={`Deals ${chartMode === 'won' ? 'Won' : 'Lost'} Over Time`}
          detail={chartMode === 'won' ? 'Growth tracking for successfully closed opportunities.' : 'Analysis of lost deals and missed opportunities.'}
          action={
            <div className="chart-filters">
              <div className="chart-type-toggle">
                <button className={`chart-mode-btn ${chartMode === 'won' ? 'is-active' : ''}`} onClick={() => setChartMode('won')}>Won</button>
                <button className={`chart-mode-btn ${chartMode === 'lost' ? 'is-active' : ''}`} onClick={() => setChartMode('lost')}>Lost</button>
              </div>
              <div className="chart-type-toggle">
                <button className={`chart-type-btn ${chartType === 'revenue' ? 'is-active' : ''}`} onClick={() => setChartType('revenue')}>Value</button>
                <button className={`chart-type-btn ${chartType === 'count' ? 'is-active' : ''}`} onClick={() => setChartType('count')}>Count</button>
              </div>
              <input type="month" value={startDate} onChange={e => setStartDate(e.target.value)} className="chart-filter-input" />
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>to</span>
              <input type="month" value={endDate} onChange={e => setEndDate(e.target.value)} className="chart-filter-input" />
            </div>
          }
        >
          <div className="dashboard-chart-container">
            <WonOverTimeChart data={chartData} type={chartType} mode={chartMode} />
          </div>
        </Panel>
      )
      case 'stage_donut': return (
        <Panel key="stage_donut" kicker="Pipeline snapshot" title="Deals by stage with expected revenue" detail>
          <div className="pipeline-snapshot-layout">
            <div className="pipeline-snapshot-donut">
              <StageDonutChart data={stageSummary.filter(s => s.stage !== 'Closed Won' && s.stage !== 'Closed Lost')} hovered={hoveredStage} onHover={setHoveredStage} />
            </div>
            <div className="pipeline-snapshot-list">
              <div ref={stageListRef} className="stage-list">
                {stageSummary.filter(s => s.stage !== 'Closed Won' && s.stage !== 'Closed Lost' && s.count > 0).map((stage) => (
                  <div key={stage.stage} className={`stage-row${hoveredStage === stage.stage ? ' stage-row--hovered' : ''}`}
                    style={{ borderLeftColor: hoveredStage === stage.stage ? (PIPELINE_STAGE_COLORS[stage.stage] || '#ffb547') : 'transparent' }}
                    onMouseEnter={() => setHoveredStage(stage.stage)} onMouseLeave={() => setHoveredStage(null)}>
                    <div className="stage-meta">
                      <div><strong>{stage.stage}</strong></div>
                      <span>{formatCurrencyCompact(stage.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )
      case 'record_health': return (
        <Panel key="record_health" kicker="Customer database" title="Linked record health" detail="Clean links make follow-ups, ownership, and reporting much more reliable.">
          <div ref={healthRef} className="stage-list">
            <div className="stage-row">
              <div className="stage-meta"><div><strong>{leads.length} leads</strong><span> - Lead records ready for qualification tracking</span></div><span className="status-text is-warning">{linkHealth}% linked</span></div>
              <div className="stage-track"><div className={`stage-fill${healthVisible ? ' visible' : ''}`} style={{ width: `${linkHealth}%`, animationDelay: healthVisible ? '0s' : undefined }} /></div>
            </div>
            <div className="stage-row">
              <div className="stage-meta"><div><strong>{contacts.length} contacts</strong><span> - Decision makers and buying contacts tied to companies</span></div><span className="status-text is-neutral">Directory</span></div>
              <div className="stage-track"><div className={`stage-fill${healthVisible ? ' visible' : ''}`} style={{ width: `${Math.min(Math.round((contacts.length / ITEMS_PER_PAGE) * 100), 100)}%`, animationDelay: healthVisible ? '0.1s' : undefined }} /></div>
            </div>
            <div className="stage-row">
              <div className="stage-meta"><div><strong>{companies.length} companies</strong><span> - Accounts organized with owners and status</span></div><span className="status-text is-positive">Clean structure</span></div>
              <div className="stage-track"><div className={`stage-fill${healthVisible ? ' visible' : ''}`} style={{ width: `${Math.min(Math.round((companies.length / ITEMS_PER_PAGE) * 100), 100)}%`, animationDelay: healthVisible ? '0.2s' : undefined }} /></div>
            </div>
          </div>
        </Panel>
      )
      case 'priority_tasks': return (
        <Panel key="priority_tasks" kicker="Task focus" title="Priority follow-ups" detail="Open work is visible from the dashboard so reps always know what is next."
          action={
            <div className="priority-indicators">
              <span className="priority-indicator"><span className="priority-dot is-high" /><span>{priorityCounts.High}</span></span>
              <span className="priority-indicator"><span className="priority-dot is-medium" /><span>{priorityCounts.Medium}</span></span>
              <span className="priority-indicator"><span className="priority-dot is-low" /><span>{priorityCounts.Low}</span></span>
            </div>
          }
        >
          <div className="simple-list">
            {focusTasks.map((task) => (
              <article key={task.id} className={`simple-list__item is-priority-${task.priority.toLowerCase()} u-border-l-3-transparent u-cursor-pointer`}
                onClick={() => navigate('/tasks', { state: { highlightTaskId: task.id } })}>
                <div className="u-flex-1 u-min-w-0">
                  <strong className="u-truncate u-block">{task.title}</strong>
                  <p className="u-margin-t-4 u-fs-11 u-text-muted">{!isSr ? `${task.owner} | ` : ''}due {formatDateLabel(task.dueDate)}</p>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )
      case 'totals': return (
        <section key="totals" className="content-grid content-grid--2">
          <MetricCard label="Deals Won (Total)" value={wonStats.count} meta={formatCurrencyCompact(wonStats.value)} accent="accent" />
          <MetricCard label="Deals Lost (Total)" value={lostStats.count} meta={formatCurrencyCompact(lostStats.value)} accent="alt" />
        </section>
      )
      case 'recent_wins': return (
        <Panel key="recent_wins" kicker="History" title="Recent Wins" detail="Latest closed won opportunities.">
          <div className="history-table-container">
            <div className="history-list wins-list" style={{ minHeight: `${HISTORY_PAGE_SIZE * HISTORY_ROW_PX}px`, maxHeight: `${HISTORY_PAGE_SIZE * HISTORY_ROW_PX}px`, overflowY: 'auto' }}>
              <div className="history-list-header"><span>Deal Title</span><span>Won Date</span><span>Owner</span><span style={{ textAlign: 'right' }}>Value</span></div>
              {recentWins.length === 0 ? (
                <p className="u-pad-16 u-text-muted u-fs-sm">No recent wins.</p>
              ) : (
                recentWins.map(d => (
                  <div key={d.id} className="history-list-row is-won">
                    <strong>{d.name}</strong>
                    <span className="u-text-muted">{formatDateLabel(d.closeDate || d.created_at)}</span>
                    <span className="u-text-muted">{!isSr ? d.owner : 'Me'}</span>
                    <strong style={{ textAlign: 'right' }}>{formatCurrencyCompact(d.value)}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="history-pagination" role="navigation" aria-label="Wins pagination">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setWinsPage(p => Math.max(1, p - 1))}
                disabled={winsPage === 1}
                aria-label="Previous page"
              >
                Prev
              </button>

              <div className="history-pagination__page-info u-text-muted u-fs-sm" aria-live="polite" style={{ margin: '0 12px' }}>
                Page {winsPage} of {winsTotalPages}
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setWinsPage(p => Math.min(winsTotalPages, p + 1))}
                disabled={winsPage === winsTotalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </Panel>
      )
      case 'recent_losses': return (
        <Panel key="recent_losses" kicker="History" title="Recent Losses" detail="Latest closed lost opportunities.">
          <div className="history-table-container">
            <div className="history-list losses-list" style={{ minHeight: `${HISTORY_PAGE_SIZE * HISTORY_ROW_PX}px`, maxHeight: `${HISTORY_PAGE_SIZE * HISTORY_ROW_PX}px`, overflowY: 'auto' }}>
              <div className="history-list-header lost-header"><span>Deal Title</span><span>Lost Date</span><span>Owner</span><span>Reason</span><span style={{ textAlign: 'right' }}>Value</span></div>
              {recentLosses.length === 0 ? (
                <p className="u-pad-16 u-text-muted u-fs-sm">No recent losses.</p>
              ) : (
                recentLosses.map(d => (
                  <div key={d.id} className="history-list-row is-lost">
                    <strong>{d.name}</strong>
                    <span className="u-text-muted">{formatDateLabel(d.closeDate || d.created_at)}</span>
                    <span className="u-text-muted">{!isSr ? d.owner : 'Me'}</span>
                    <span className="status-text is-warning" style={{ width: 'fit-content' }}>{d.lostReason || 'Unspecified'}</span>
                    <strong style={{ textAlign: 'right' }}>{formatCurrencyCompact(d.value)}</strong>
                  </div>
                ))
              )}
            </div>

            <div className="history-pagination" role="navigation" aria-label="Losses pagination">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setLossesPage(p => Math.max(1, p - 1))}
                disabled={lossesPage === 1}
                aria-label="Previous page"
              >
                Prev
              </button>

              <div className="history-pagination__page-info u-text-muted u-fs-sm" aria-live="polite" style={{ margin: '0 12px' }}>
                Page {lossesPage} of {lossesTotalPages}
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setLossesPage(p => Math.min(lossesTotalPages, p + 1))}
                disabled={lossesPage === lossesTotalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </Panel>
      )
      case 'loss_analysis': return (
        <section key="loss_analysis" className="content-grid">
          <Panel kicker="Loss Analysis" title="Why we lost" detail="Distribution of reasons for closed lost deals. Captured from pipeline data.">
            <LostReasonBreakdown countData={lostReasonData} valueData={lostValueData} />
          </Panel>
        </section>
      )
      case 'announcements': {
        const totalPages = Math.ceil((announcements ?? []).length / 5) || 1
        const safePage = Math.min(announcementPage, totalPages)
        const paged = (announcements ?? []).slice(
          (safePage - 1) * 5,
          safePage * 5
        )
        return (
          <Panel key="announcements" kicker="Updates" title="Announcements" detail="Recent reassignments and pending approvals.">
            {announcements.length === 0 ? (
              <p className="u-pad-16 u-text-muted u-fs-sm">No announcements right now.</p>
            ) : (
              <div className="simple-list">
                {Array.from({ length: 5 }).map((_, i) => {
                  const a = paged[i]
                  return (
                    <div key={i} className="simple-list__item" style={!a ? { opacity: 0.3 } : undefined}>
                      {a ? (
                        <>
                          <span className={`admin-role-pill ${a.type === 'pending' ? 'admin-role-pill--warning' : a.type === 'rejected' ? 'admin-role-pill--alert' : 'admin-role-pill--positive'}`}>
                            {a.type === 'pending' ? 'Pending' : a.type === 'rejected' ? 'Rejected' : a.type === 'approved' ? 'Approved' : 'Reassigned'}
                          </span>
                          <span className="u-fs-sm">{a.label}</span>
                        </>
                      ) : (
                        <span className="u-fs-sm u-text-muted">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {totalPages > 1 && (
              <Pagination
                currentPage={announcementPage}
                totalPages={totalPages}
                onPageChange={setAnnouncementPage}
                prevLabel="←"
                nextLabel="→"
                className="analytics-pagination"
              />
            )}
          </Panel>
        )
      }
      default: return null
    }
  }

  return (
    <>
      <style>{`
        .dashboard-chart-container {
          margin-top: 16px;
          min-height: 240px;
          display: flex;
          flex-direction: column;
        }
        .dashboard-chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 200px;
          padding: 24px 10px 10px;
          position: relative;
          border-bottom: 2px solid var(--border);
          flex: 1;
        }
        .chart-bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          height: 100%;
          justify-content: flex-end;
          min-width: 0;
        }
        .chart-bar {
          width: 100%;
          max-width: 40px;
          background: var(--accent);
          border-radius: 4px 4px 0 0;
          transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          min-height: 2px;
        }
        .chart-bar:hover {
          filter: brightness(1.2);
          box-shadow: 0 0 12px var(--accent);
        }
        .chart-bar__value {
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 800;
          color: var(--text-strong);
          white-space: nowrap;
        }
        .chart-label {
          font-size: 10px;
          color: var(--text-muted);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          font-weight: 600;
        }
        .dashboard-chart-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--text-muted);
          font-size: var(--fs-sm);
          font-style: italic;
          border-bottom: 2px solid var(--border);
        }
        .chart-filters {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .chart-filter-input {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--text-strong);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          outline: none;
        }
        .chart-type-toggle {
          display: flex;
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
          padding: 2px;
          border: 1px solid var(--border);
        }
        .chart-type-btn {
          padding: 2px 8px;
          border-radius: 3px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .chart-type-btn.is-active {
          background: var(--accent);
          color: #10131f;
        }
        .chart-mode-btn {
          padding: 2px 8px;
          border-radius: 3px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .chart-mode-btn.is-active {
          color: #10131f;
        }
        .chart-mode-btn.is-active:first-child {
          background: var(--positive);
        }
        .chart-mode-btn.is-active:last-child {
          background: var(--alert);
        }
        .chart-bar--lost {
          background: var(--alert) !important;
        }
        .dashboard-chart--lost .chart-bar:hover {
          filter: brightness(1.2);
          box-shadow: 0 0 12px var(--alert);
        }
        .lost-reason-breakdown {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          padding: 16px 8px;
        }
        .lrb-donut-col {
          display: flex;
          align-items: center;
          gap: 24px;
          padding-right: 16px;
          border-right: 1px solid var(--border);
        }
        .lrb-bars-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .lrb-bars-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border);
        }
        .lrb-bars-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .lrb-bars-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 600;
          flex: 1;
        }
        .lrb-bars-total {
          font-size: var(--fs-sm);
          font-weight: 700;
          color: var(--text-strong);
        }
        .lrb-bars-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .lrb-bar-row {
          display: grid;
          grid-template-columns: 8px 90px 1fr 80px;
          gap: 8px;
          align-items: center;
        }
        .lrb-bar-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .lrb-bar-label {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lrb-bar-track {
          height: 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
        }
        .lrb-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease;
          min-width: 4px;
        }
        .lrb-bar-value {
          font-size: var(--fs-xs);
          font-weight: 700;
          color: var(--text-strong);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .donut-svg {
          width: 160px;
          height: 160px;
          flex-shrink: 0;
        }
        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
          min-width: 200px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .legend-label {
          font-size: var(--fs-sm);
          color: var(--text-muted);
          flex: 1;
          font-weight: 500;
        }
        .legend-count {
          font-size: var(--fs-sm);
          font-weight: 700;
          color: var(--text-strong);
        }
        .legend-pct {
          font-size: var(--fs-xs);
          color: var(--text-muted);
          min-width: 40px;
          text-align: right;
          font-weight: 600;
        }
        .pipeline-snapshot-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .pipeline-snapshot-donut {
          display: flex;
          align-items: center;
          min-height: 160px;
        }
        .pipeline-snapshot-donut .donut-legend {
          min-width: 140px;
        }
        .pipeline-snapshot-donut .donut-svg {
          width: 150px;
          height: 150px;
        }
        .stage-row--hovered {
          border-left: 3px solid;
          padding-left: 13px;
          background: rgba(255,255,255,0.03);
          border-radius: 0 4px 4px 0;
        }
        .history-table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding-bottom: 4px;
        }
        .history-pagination {
          display: flex;
          align-items: center;
          justify-content: center; /* center Prev - Page - Next */
          padding: 8px 12px;
          gap: 12px;
        }
        .history-pagination .secondary-button[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .history-table-container::-webkit-scrollbar {
          height: 8px;
        }
        .history-table-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          margin: 0 4px;
        }
        .history-table-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .history-table-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .history-list {
          display: flex;
          flex-direction: column;
        }
        .history-list.wins-list {
          min-width: 560px;
        }
        .history-list.losses-list {
          min-width: 700px;
        }
        .history-list-header {
          display: grid;
          grid-template-columns: minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(90px, 1fr);
          gap: 12px;
          padding: 10px 16px;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 600;
        }
        .history-list-header.lost-header {
          grid-template-columns: minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(130px, 1.5fr) minmax(90px, 1fr);
        }
        .history-list-row {
          display: grid;
          grid-template-columns: minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(90px, 1fr);
          gap: 12px;
          padding: 12px 16px;
          align-items: center;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
        }
        .history-list-row:last-child {
          border-bottom: none;
        }
        .history-list-row.is-lost {
          grid-template-columns: minmax(200px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(130px, 1.5fr) minmax(90px, 1fr);
        }
        .history-list-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .history-list-row.is-won {
          border-left: 3px solid #34d399;
        }
        .history-list-row.is-lost {
          border-left: 3px solid #fb7185;
        }
        .customize-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .customize-modal {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 14px;
          width: 100%;
          max-width: 420px;
          padding: 24px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.45);
        }
        .customize-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .customize-modal__title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
        }
        .customize-modal__close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          font-size: 20px;
          line-height: 1;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .customize-modal__close:hover { color: var(--text); }
        .customize-widget-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 24px;
        }
        .customize-widget-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          transition: background 0.15s;
        }
        .customize-widget-row:hover { background: var(--bg-card-alt); }
        .drag-handle {
          cursor: grab;
          color: var(--text-muted);
          font-size: 16px;
          flex-shrink: 0;
          user-select: none;
          line-height: 1;
        }
        .drag-handle:active { cursor: grabbing; }
        .customize-widget-label {
          font-size: 13px;
          color: var(--text);
          flex: 1;
        }
        .toggle-switch {
          position: relative;
          width: 38px;
          height: 22px;
          flex-shrink: 0;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
          position: absolute;
        }
        .toggle-track {
          position: absolute;
          inset: 0;
          background: var(--border-strong);
          border-radius: 99px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .toggle-track::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        .toggle-switch input:checked + .toggle-track {
          background: var(--accent);
        }
        .toggle-switch input:checked + .toggle-track::after {
          transform: translateX(16px);
        }
        .customize-modal__footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .dashboard-sr-sort {
          display: flex;
          gap: 2px;
          background: rgba(255,255,255,0.04);
          border-radius: 4px;
          padding: 2px;
        }
        .dashboard-sr-sort-btn {
          padding: 2px 8px;
          border-radius: 3px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }
        .dashboard-sr-sort-btn.is-active {
          background: var(--accent);
          color: #10131f;
        }
        .dashboard-sr-sort-btn:hover:not(.is-active) {
          background: rgba(255,255,255,0.06);
        }
        .sr-rank-item:hover {
          background: rgba(255,255,255,0.06);
          border-color: var(--border-strong);
        }
        .dashboard-sr-panel-content {
          display: flex;
          flex-direction: column;
          min-height: 380px;
        }
        .dashboard-sr-list-wrap {
          flex: 1;
        }
      `}</style>

      {showCustomize && (
        <div className="customize-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelCustomize() }}>
          <div className="customize-modal">
            <div className="customize-modal__header">
              <span className="customize-modal__title">Customize Layout</span>
              <button className="customize-modal__close" onClick={cancelCustomize}>×</button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draftLayout.map(w => w.id)} strategy={verticalListSortingStrategy}>
                <div className="customize-widget-list">
                  {draftLayout.map((widget) => (
                    <SortableWidgetRow
                      key={widget.id}
                      widget={widget}
                      onToggle={(e) => setDraftLayout(prev =>
                        prev.map(w => w.id === widget.id ? { ...w, enabled: e.target.checked } : w)
                      )}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="customize-modal__footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDraftLayout([...DEFAULT_LAYOUT])}
              >
                Reset to Default
              </button>
              <button type="button" className="primary-button" onClick={saveLayout}>Save</button>
            </div>
          </div>
        </div>
      )}

      {renderRows.map((row, i) => {
        if (row.type === 'pair') {
          return (
            <section key={i} className="content-grid content-grid--2">
              {renderWidget(row.a)}
              {renderWidget(row.b)}
            </section>
          )
        }
        // 'totals', 'kpi_metrics', 'loss_analysis' return their own section wrapper
        const widget = renderWidget(row.id)
        if (['totals', 'kpi_metrics', 'loss_analysis', 'branch_overview'].includes(row.id)) return widget
        // half-width widgets rendered solo get a full-width single-column section
        return (
          <section key={i} className="content-grid content-grid--2">
            {widget}
          </section>
        )
      })}
    </>
  )
}
