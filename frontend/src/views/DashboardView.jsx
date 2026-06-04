import { useRef, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, isSrRole } from '../utils'
import { ITEMS_PER_PAGE } from '../constants'

function WonOverTimeChart({ data, type }) {
  if (data.length === 0) {
    return <div className="dashboard-chart-empty">No deals won in this period.</div>
  }

  const maxValue = Math.max(...data.map(d => type === 'revenue' ? d.value : d.count), 1)

  return (
    <div className="dashboard-chart">
      {data.map(d => {
        const val = type === 'revenue' ? d.value : d.count
        const height = (val / maxValue) * 100
        return (
          <div key={d.month} className="chart-bar-container">
            <div 
              className="chart-bar" 
              style={{ height: `${height}%` }}
              title={`${d.month}: ${type === 'revenue' ? formatCurrencyCompact(d.value) : d.count + ' deals'}`}
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
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
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
            <div key={s.reason} className="legend-item">
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
              <div key={d.reason} className="lrb-bar-row">
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
}) {
  const navigate = useNavigate()
  const isSr = isSrRole(currentUser?.role)
  const stageListRef = useRef(null)
  const healthRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [healthVisible, setHealthVisible] = useState(false)

  // Chart state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 5)
    return d.toISOString().slice(0, 7) // Last 6 months
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 7))
  const [chartType, setChartType] = useState('revenue')

  const chartData = useMemo(() => {
    const wonDeals = deals.filter(d => {
      if (d.stage !== 'Closed Won') return false
      const date = d.closeDate || d.createdAt
      if (!date) return false
      const month = date.slice(0, 7)
      return (!startDate || month >= startDate) && (!endDate || month <= endDate)
    })

    const groups = {}
    
    // Fill in all months in range
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

    wonDeals.forEach(d => {
      const month = (d.closeDate || d.createdAt).slice(0, 7)
      if (!groups[month]) groups[month] = { month, count: 0, value: 0 }
      groups[month].count++
      groups[month].value += Number(d.value || 0)
    })

    return Object.values(groups).sort((a, b) => a.month.localeCompare(b.month))
  }, [deals, startDate, endDate])

  // Won/Lost Metrics
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

  const recentWins = useMemo(() => {
    return deals
      .filter(d => d.stage === 'Closed Won')
      .sort((a, b) => new Date(b.closeDate || b.createdAt) - new Date(a.closeDate || a.createdAt))
      .slice(0, 5)
  }, [deals])

  const recentLosses = useMemo(() => {
    return deals
      .filter(d => d.stage === 'Closed Lost')
      .sort((a, b) => new Date(b.closeDate || b.createdAt) - new Date(a.closeDate || a.createdAt))
      .slice(0, 5)
  }, [deals])

  const lostReasonData = useMemo(() => {
    const lost = deals.filter(d => d.stage === 'Closed Lost')
    const counts = {}
    lost.forEach(d => {
      const reason = d.lostReason || 'Unspecified'
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
      const reason = d.lostReason || 'Unspecified'
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
    const el = stageListRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
        .history-table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding-bottom: 4px;
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
      `}</style>

      <section className="metrics-grid metrics-grid--five" aria-label="Core KPIs">
        {topKpis.map((kpi) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            meta={kpi.meta}
            accent={kpi.accent}
            route={kpi.route}
          />
        ))}
      </section>

      <section className="content-grid content-grid--2">
        <Panel
          kicker="Performance"
          title="Deals Won Over Time"
          detail="Growth tracking for successfully closed opportunities."
          action={
            <div className="chart-filters">
              <div className="chart-type-toggle">
                <button 
                  className={`chart-type-btn ${chartType === 'revenue' ? 'is-active' : ''}`}
                  onClick={() => setChartType('revenue')}
                >
                  Value
                </button>
                <button 
                  className={`chart-type-btn ${chartType === 'count' ? 'is-active' : ''}`}
                  onClick={() => setChartType('count')}
                >
                  Count
                </button>
              </div>
              <input 
                type="month" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="chart-filter-input"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>to</span>
              <input 
                type="month" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="chart-filter-input"
              />
            </div>
          }
        >
          <div className="dashboard-chart-container">
            <WonOverTimeChart data={chartData} type={chartType} />
          </div>
        </Panel>

        <Panel
          kicker="Pipeline snapshot"
          title="Deals by stage with expected revenue"
          detail="This keeps opportunity movement visible without leaving the dashboard."
        >
          <div ref={stageListRef} className="stage-list">
            {stageSummary.map((stage, i) => (
              <div key={stage.stage} className="stage-row">
                <div className="stage-meta">
                  <div>
                    <strong>{stage.stage}</strong>
                    <span> - {stage.count} deals tracked</span>
                  </div>
                  <span>{formatCurrencyCompact(stage.value)}</span>
                </div>
                {stage.stage !== 'Closed Won' && stage.stage !== 'Closed Lost' && (
                  <div className="stage-track">
                    <div
                      className={`stage-fill${visible ? ' visible' : ''}`}
                      style={{
                        width: `${stage.count > 0
                          ? Math.min(Math.round((stage.count / ITEMS_PER_PAGE) * 100), 100)
                          : 0}%`,
                        animationDelay: visible ? `${i * 0.1}s` : undefined,
                      }}
                    />
                  </div>
                )}

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
          <div ref={healthRef} className="stage-list">
            <div className="stage-row">
              <div className="stage-meta">
                <div>
                  <strong>{leads.length} leads</strong>
                  <span> - Lead records ready for qualification tracking</span>
                </div>
                <span className="status-text is-warning">{linkHealth}% linked</span>
              </div>
              <div className="stage-track">
                <div
                  className={`stage-fill${healthVisible ? ' visible' : ''}`}
                  style={{
                    width: `${linkHealth}%`,
                    animationDelay: healthVisible ? '0s' : undefined,
                  }}
                />
              </div>
            </div>
            <div className="stage-row">
              <div className="stage-meta">
                <div>
                  <strong>{contacts.length} contacts</strong>
                  <span> - Decision makers and buying contacts tied to companies</span>
                </div>
                <span className="status-text is-neutral">Directory</span>
              </div>
              <div className="stage-track">
                <div
                  className={`stage-fill${healthVisible ? ' visible' : ''}`}
                  style={{
                    width: `${Math.min(Math.round((contacts.length / ITEMS_PER_PAGE) * 100), 100)}%`,
                    animationDelay: healthVisible ? '0.1s' : undefined,
                  }}
                />
              </div>
            </div>
            <div className="stage-row">
              <div className="stage-meta">
                <div>
                  <strong>{companies.length} companies</strong>
                  <span> - Accounts organized with owners and status</span>
                </div>
                <span className="status-text is-positive">Clean structure</span>
              </div>
              <div className="stage-track">
                <div
                  className={`stage-fill${healthVisible ? ' visible' : ''}`}
                  style={{
                    width: `${Math.min(Math.round((companies.length / ITEMS_PER_PAGE) * 100), 100)}%`,
                    animationDelay: healthVisible ? '0.2s' : undefined,
                  }}
                />
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          kicker="Task focus"
          title="Priority follow-ups"
          detail="Open work is visible from the dashboard so reps always know what is next."
          action={
            <div className="priority-indicators">
              <span className="priority-indicator">
                <span className="priority-dot is-high" />
                <span>{priorityCounts.High}</span>
              </span>
              <span className="priority-indicator">
                <span className="priority-dot is-medium" />
                <span>{priorityCounts.Medium}</span>
              </span>
              <span className="priority-indicator">
                <span className="priority-dot is-low" />
                <span>{priorityCounts.Low}</span>
              </span>
            </div>
          }
        >
          <div className="simple-list">
            {focusTasks.map((task) => {
              const priorityClass = `is-priority-${task.priority.toLowerCase()}`
              return (
                <article
                  key={task.id}
                  className={`simple-list__item ${priorityClass} u-border-l-3-transparent u-cursor-pointer`}
                  onClick={() => navigate('/tasks', { state: { highlightTaskId: task.id } })}
                >
                  <div className="u-flex-1 u-min-w-0">
                    <strong className="u-truncate u-block">
                      {task.title}
                    </strong>
                    <p className="u-margin-t-4 u-fs-11 u-text-muted">
                      {!isSr ? `${task.owner} | ` : ''}due {formatDateLabel(task.dueDate)}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>
      </section>

      <section className="content-grid content-grid--2">
        <MetricCard 
          label="Deals Won (Total)" 
          value={wonStats.count} 
          meta={formatCurrencyCompact(wonStats.value)} 
          accent="accent" 
        />
        <MetricCard 
          label="Deals Lost (Total)" 
          value={lostStats.count} 
          meta={formatCurrencyCompact(lostStats.value)} 
          accent="alt" 
        />
      </section>

      <section className="content-grid content-grid--2">
        <Panel kicker="History" title="Recent Wins" detail="Latest closed won opportunities.">
          <div className="history-table-container">
            <div className="history-list wins-list">
              <div className="history-list-header">
                <span>Deal Title</span>
                <span>Won Date</span>
                <span>Owner</span>
                <span style={{ textAlign: 'right' }}>Value</span>
              </div>
              {recentWins.length === 0 ? (
                <p className="u-pad-16 u-text-muted u-fs-sm">No recent wins.</p>
              ) : (
                recentWins.map(d => (
                  <div key={d.id} className="history-list-row is-won">
                    <strong>{d.name}</strong>
                    <span className="u-text-muted">{formatDateLabel(d.closeDate || d.createdAt)}</span>
                    <span className="u-text-muted">{!isSr ? d.owner : 'Me'}</span>
                    <strong style={{ textAlign: 'right' }}>{formatCurrencyCompact(d.value)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>

        <Panel kicker="History" title="Recent Losses" detail="Latest closed lost opportunities.">
          <div className="history-table-container">
            <div className="history-list losses-list">
              <div className="history-list-header lost-header">
                <span>Deal Title</span>
                <span>Lost Date</span>
                <span>Owner</span>
                <span>Reason</span>
                <span style={{ textAlign: 'right' }}>Value</span>
              </div>
              {recentLosses.length === 0 ? (
                <p className="u-pad-16 u-text-muted u-fs-sm">No recent losses.</p>
              ) : (
                recentLosses.map(d => (
                  <div key={d.id} className="history-list-row is-lost">
                    <strong>{d.name}</strong>
                    <span className="u-text-muted">{formatDateLabel(d.closeDate || d.createdAt)}</span>
                    <span className="u-text-muted">{!isSr ? d.owner : 'Me'}</span>
                    <span className="status-text is-warning" style={{ width: 'fit-content' }}>{d.lostReason || 'Unspecified'}</span>
                    <strong style={{ textAlign: 'right' }}>{formatCurrencyCompact(d.value)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>
      </section>

      <section className="content-grid">
        <Panel
          kicker="Loss Analysis"
          title="Why we lost"
          detail="Distribution of reasons for closed lost deals. Captured from pipeline data."
        >
          <LostReasonBreakdown countData={lostReasonData} valueData={lostValueData} />
        </Panel>
      </section>
    </>
  )
}
