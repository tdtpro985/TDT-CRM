import { useState, useEffect, useMemo, useCallback } from 'react'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import { apiFetch } from '../api'
import { formatCurrencyCompact, formatDateTimePHT, getPaginatedData } from '../utils'
import Pagination from '../components/Pagination'

async function downloadCSV(url, filename) {
  try {
    const res = await apiFetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      alert(data?.error || `Export failed (${res.status}). Please try again.`)
      return
    }
    const text = await res.text()
    const blob = new Blob([text], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(link.href), 100)
  } catch {
    alert('Export failed. Please try again.')
  }
}

const PAGE_SIZE = 5
const AUDIT_PAGE_SIZE = 20

const DONUT_COLORS = {
  New: '#7eb8ff',
  Contacted: '#ff9800',
  Converted: '#34d399',
  Lost: '#fb7185',
}

function DonutChart({ data }) {
  const r = 65, cx = 85, cy = 85, sw = 22
  const circumference = 2 * Math.PI * r
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const { slices } = data.reduce(
    ({ slices: acc, cum }, s) => {
      const pct = total ? s.count / total : 0
      return { slices: [...acc, { ...s, pct, startPct: cum }], cum: cum + pct }
    },
    { slices: [], cum: 0 }
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '8px 0 16px' }}>
      <svg viewBox="0 0 170 170" width="150" height="150" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
        {slices.map((s) => s.pct > 0 && (
          <circle
            key={s.status}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={DONUT_COLORS[s.status] || 'rgba(255,255,255,0.2)'}
            strokeWidth={sw}
            strokeDasharray={`${s.pct * circumference} ${circumference}`}
            transform={`rotate(${s.startPct * 360 - 90}, ${cx}, ${cy})`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="20" fontWeight="800" fontFamily="inherit">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(148,163,184,0.9)" fontSize="9.5" fontFamily="inherit">
          Total Leads
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {slices.map((s) => (
          <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: DONUT_COLORS[s.status] || '#888', flexShrink: 0 }} />
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', flex: 1 }}>{s.status}</span>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{s.count.toLocaleString()}</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', minWidth: '30px', textAlign: 'right' }}>
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminAnalyticsView({ activeBranch = '', activeRegion = '', onLoadingChange }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [page, setPage]       = useState(1)

  // Audit log state
  const [auditLogs, setAuditLogs]     = useState([])
  const [auditTotal, setAuditTotal]   = useState(0)
  const [auditPage, setAuditPage]     = useState(1)
  const [auditEntity, setAuditEntity] = useState('')
  const [auditFrom, setAuditFrom]     = useState('')
  const [auditLoading, setAuditLoading] = useState(false)
  const [srSort, setSrSort]           = useState('deals_won')

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let isCurrent = true
    setLoading(true)
    setData(null)
    setError('')
    onLoadingChange?.(true)
    const params = new URLSearchParams()
    if (activeBranch)      params.set('branch', activeBranch)
    else if (activeRegion) params.set('region', activeRegion)
    const qs = params.toString()
    apiFetch(`/api/admin/analytics${qs ? '?' + qs : ''}`)
      .then((r) => r.json())
      .then((d) => { if (isCurrent) { setData(d); setLoading(false); onLoadingChange?.(false) } })
      .catch(() => { if (isCurrent) { setError('Failed to load analytics.'); setLoading(false); onLoadingChange?.(false) } })
    return () => { isCurrent = false }
  }, [activeBranch, activeRegion])
  /* eslint-enable react-hooks/set-state-in-effect */

  const fetchAuditLog = useCallback(() => {
    setAuditLoading(true)
    const params = new URLSearchParams({
      limit:  AUDIT_PAGE_SIZE,
      offset: (auditPage - 1) * AUDIT_PAGE_SIZE,
    })
    if (auditEntity) params.set('entity', auditEntity)
    if (auditFrom)   params.set('from',   auditFrom)
    apiFetch(`/api/admin/audit-log?${params}`)
      .then((r) => r.json())
      .then((d) => { setAuditLogs(d.logs || []); setAuditTotal(d.total || 0); setAuditLoading(false) })
      .catch(() => setAuditLoading(false))
  }, [auditPage, auditEntity, auditFrom])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { fetchAuditLog() }, [fetchAuditLog])
  /* eslint-enable react-hooks/set-state-in-effect */

  const { totals, usersPerBranch, roleDistribution, leadsPerBranch, dealsPerBranch, topSRs, leadStatusDist } = data || {}

  const branchMap = {}
  if (usersPerBranch) {
    usersPerBranch.forEach((r) => {
      branchMap[r.branch] = { branch: r.branch, users: r.count, leads: 0, converted: 0, deals: 0, pipeline: 0, win_rate: null, avg_deal_value: null }
    })
  }
  if (leadsPerBranch) {
    leadsPerBranch.forEach((r) => {
      if (!branchMap[r.branch]) branchMap[r.branch] = { branch: r.branch, users: 0, leads: 0, converted: 0, deals: 0, pipeline: 0, win_rate: null, avg_deal_value: null }
      branchMap[r.branch].leads     = r.total
      branchMap[r.branch].converted = r.converted
    })
  }
  if (dealsPerBranch) {
    dealsPerBranch.forEach((r) => {
      const key = r.branch ?? 'Unknown'
      if (!branchMap[key]) branchMap[key] = { branch: key, users: 0, leads: 0, converted: 0, deals: 0, pipeline: 0, win_rate: null, avg_deal_value: null }
      branchMap[key].deals          = r.deal_count
      branchMap[key].pipeline       = r.pipeline_value
      branchMap[key].win_rate       = r.win_rate
      branchMap[key].avg_deal_value = r.avg_deal_value
    })
  }

  const branchRows   = Object.values(branchMap).sort((a, b) => a.branch?.localeCompare(b.branch))
  const totalPages   = Math.ceil(branchRows.length / PAGE_SIZE)
  const pagedRows    = useMemo(() => getPaginatedData(branchRows, page, PAGE_SIZE), [branchRows, page])
  const auditTotalPages = Math.ceil(auditTotal / AUDIT_PAGE_SIZE)
  const sortedSRs    = useMemo(
    () => (topSRs ? [...topSRs].sort((a, b) => (b[srSort] || 0) - (a[srSort] || 0)).slice(0, 10) : []),
    [topSRs, srSort]
  )

  const ratesWithData = branchRows.filter((r) => r.win_rate != null)
  const overallWinRate = ratesWithData.length
    ? Math.round(ratesWithData.reduce((sum, r) => sum + r.win_rate, 0) / ratesWithData.length)
    : null

  function buildAuditExportUrl() {
    const params = new URLSearchParams()
    if (auditEntity) params.set('entity', auditEntity)
    if (auditFrom)   params.set('from',   auditFrom)
    const qs = params.toString()
    return `/api/admin/export/audit-log${qs ? '?' + qs : ''}`
  }

  if (loading) return (
    <div className="sk-page">
      <div className="sk-metrics-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sk-panel" style={{ padding: 16 }}>
            <div className="sk sk--line-sm u-margin-b-8" style={{ width: '60%' }} />
            <div className="sk sk--value" />
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="sk-panel" style={{ padding: 16 }}>
          <div className="sk sk--line u-margin-b-16" style={{ width: '40%' }} />
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk sk--line u-margin-b-8" />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sk-panel" style={{ padding: 16 }}>
            <div className="sk sk--line u-margin-b-16" style={{ width: '60%' }} />
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="sk sk--line u-margin-b-8" />)}
          </div>
          <div className="sk-panel" style={{ padding: 16 }}>
            <div className="sk sk--line u-margin-b-16" style={{ width: '50%' }} />
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="sk sk--line u-margin-b-8" />)}
          </div>
        </div>
      </div>
    </div>
  )
  if (error)   return <p className="u-pad-32 u-alert">{error}</p>

  const actionLabel    = { status_change: 'Status', stage_change: 'Stage', create: 'Created', delete: 'Deleted' }
  const actionRowClass = { stage_change: 'analytics-audit-row--stage', status_change: 'analytics-audit-row--status', create: 'analytics-audit-row--create', delete: 'analytics-audit-row--delete' }

  return (
    <>
      {/* Scope indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Viewing</span>
        <span className="admin-role-pill admin-role-pill--surface" style={{ fontSize: 'var(--fs-xs)' }}>
          {activeBranch ? activeBranch : activeRegion ? `${activeRegion} region` : 'All Branches'}
        </span>
      </div>

      {/* KPI row */}
      <section className="metrics-grid metrics-grid--compact" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(max(160px,14%),1fr))' }}>
        <MetricCard label="Total Users"    value={totals.users.toLocaleString()}                  meta="Accounts across all branches"    accent="accent"  />
        <MetricCard label="Total Leads"    value={totals.leads.toLocaleString()}                   meta="Customer records in the system"  accent="surface" />
        <MetricCard label="Active Deals"   value={totals.activeDeals.toLocaleString()}             meta="Open pipeline opportunities"     accent="alt"     />
        <MetricCard label="Pipeline Value" value={formatCurrencyCompact(totals.pipelineValue)}     meta="Revenue across active deals"     accent="accent"  />
        <MetricCard label="Closed Won"     value={totals.closedWon.toLocaleString()}               meta="Deals won all time"              accent="alt"     />
        <MetricCard label="Avg Win Rate"   value={overallWinRate != null ? `${overallWinRate}%` : '—'} meta="Across branches with history" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary" style={{ gridTemplateColumns: '2fr 1fr', flex: 'none', gridTemplateRows: 'auto' }}>

        {/* Branch performance cards */}
        <Panel
          kicker="Performance"
          title="Branch Overview"
          action={
            <button className="ghost-button u-fs-sm u-pad-4-10" onClick={() => downloadCSV('/api/admin/export/branch-overview', 'branch-overview.csv')}>
              ↓ Export CSV
            </button>
          }
        >
          <div className="branch-card-grid">
            {pagedRows.map((r) => {
              const rate = r.leads ? Math.round((r.converted / r.leads) * 100) : 0
              const barW = rate
              return (
                <div key={r.branch} className="branch-card">
                  <div className="branch-card__header">
                    <span className="branch-card__name">{r.branch ?? '—'}</span>
                    <span className={`admin-role-pill ${rate >= 50 ? 'admin-role-pill--accent' : rate >= 20 ? 'admin-role-pill--alt' : 'admin-role-pill--surface'}`}>
                      {rate}% conv.
                    </span>
                  </div>
                  <div className="branch-card__stats">
                    <div className="branch-card__stat">
                      <span className="branch-card__stat-label">Leads</span>
                      <span className="branch-card__stat-value">{r.leads}</span>
                    </div>
                    <div className="branch-card__stat">
                      <span className="branch-card__stat-label">Converted</span>
                      <span className="branch-card__stat-value">{r.converted}</span>
                    </div>
                    <div className="branch-card__stat">
                      <span className="branch-card__stat-label">Active Deals</span>
                      <span className="branch-card__stat-value">{r.deals}</span>
                    </div>
                    <div className="branch-card__stat">
                      <span className="branch-card__stat-label">Pipeline</span>
                      <span className="branch-card__stat-value">{formatCurrencyCompact(r.pipeline)}</span>
                    </div>
                    <div className="branch-card__stat">
                      <span className="branch-card__stat-label">Win Rate</span>
                      <span className="branch-card__stat-value">{r.win_rate != null ? `${r.win_rate}%` : '—'}</span>
                    </div>
                    <div className="branch-card__stat">
                      <span className="branch-card__stat-label">Avg Deal</span>
                      <span className="branch-card__stat-value">{r.avg_deal_value != null ? formatCurrencyCompact(r.avg_deal_value) : '—'}</span>
                    </div>
                  </div>
                  <div className="analytics-bar-track">
                    <div className="analytics-bar-fill" style={{ width: `${barW}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            prevLabel="← Prev"
            nextLabel="Next →"
            className="analytics-pagination"
          />
        </Panel>

        {/* Right column */}
        <div className="analytics-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

          {/* Role distribution */}
          <Panel kicker="Access levels" title="Role Distribution">
            <div className="admin-branch-list">
              {roleDistribution.map((r) => {
                const color = r.role === 'Admin' ? 'accent' : r.role === 'Sales Manager' ? 'alt' : 'surface'
                return (
                  <div key={r.role} className="analytics-role-row">
                    <span className={`admin-role-pill admin-role-pill--${color}`}>{r.role}</span>
                    <div className="analytics-role-bar-track">
                      <div
                        className="analytics-role-bar-fill"
                        style={{ width: `${Math.round((r.count / totals.users) * 100)}%` }}
                      />
                    </div>
                    <span className="analytics-role-count">{r.count}</span>
                  </div>
                )
              })}
            </div>
          </Panel>

          {/* Top SRs */}
          {topSRs && topSRs.length > 0 && (
            <Panel
              kicker="Top performers"
              title="Top Sales Reps"
              action={
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[['Won', 'deals_won'], ['Conv.', 'converted'], ['Leads', 'leads_count']].map(([label, key]) => (
                    <button
                      key={key}
                      type="button"
                      className="ghost-button u-fs-xs"
                      style={{
                        padding: '2px 8px',
                        opacity: srSort === key ? 1 : 0.45,
                        background: srSort === key ? 'rgba(255,152,0,0.12)' : 'transparent',
                      }}
                      onClick={() => setSrSort(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="sr-rank-list">
                {sortedSRs.map((sr, i) => (
                  <div key={sr.name} className={`sr-rank-item${i === 0 ? ' sr-rank-item--top' : ''}`}>
                    <div className="sr-rank-badge">{i + 1}</div>
                    <div className="sr-rank-info">
                      <div className="sr-rank-name">{sr.name}</div>
                      <div className="sr-rank-branch">{sr.branch}</div>
                    </div>
                    <div className="sr-rank-stats">
                      {srSort !== 'leads_count' && (
                        <span className="admin-role-pill admin-role-pill--surface">{sr.leads_count} leads</span>
                      )}
                      {srSort === 'deals_won'   && <span className="admin-role-pill admin-role-pill--accent">{sr.deals_won} won</span>}
                      {srSort === 'converted'   && <span className="admin-role-pill admin-role-pill--accent">{sr.converted} conv.</span>}
                      {srSort === 'leads_count' && <span className="admin-role-pill admin-role-pill--accent">{sr.leads_count} leads</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

        </div>
      </section>

      {/* Bottom row: Audit Log + Lead Status Donut */}
      <section className="analytics-bottom-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginTop: '16px', alignItems: 'start' }}>

        <Panel
          kicker="Activity"
          title="Audit Log"
          action={
            <button className="ghost-button u-fs-sm u-pad-4-10" onClick={() => downloadCSV(buildAuditExportUrl(), 'audit-log.csv')}>
              ↓ Export CSV
            </button>
          }
        >
          {/* Filter bar */}
          <div className="panel-inline-controls" style={{ padding: '0 0 12px', flexWrap: 'wrap', gap: '8px' }}>
            <label className="filter-wrap">
              <span>Type</span>
              <select value={auditEntity} onChange={(e) => { setAuditEntity(e.target.value); setAuditPage(1) }}>
                <option value="">All</option>
                <option value="deal">Deal</option>
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
              </select>
            </label>
            <label className="filter-wrap">
              <span>From</span>
              <input
                type="date"
                value={auditFrom}
                onChange={(e) => { setAuditFrom(e.target.value); setAuditPage(1) }}
              />
            </label>
            {(auditEntity || auditFrom) && (
              <button
                className="ghost-button u-fs-sm u-pad-4-10"
                onClick={() => { setAuditEntity(''); setAuditFrom(''); setAuditPage(1) }}
              >
                Clear
              </button>
            )}
            <span className="u-ml-auto u-text-muted u-fs-sm u-align-self-center">
              {auditTotal} {auditTotal === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {auditLoading ? (
            <p className="u-pad-16 u-text-muted u-fs-sm">Loading…</p>
          ) : auditLogs.length === 0 ? (
            <p className="u-pad-16 u-text-muted u-fs-sm">No activity recorded yet.</p>
          ) : (
            <div className="analytics-audit-list">
              {auditLogs.map((entry) => (
                <div key={entry.id} className={`analytics-audit-row ${actionRowClass[entry.action] ?? ''}`}>
                  <span className="analytics-audit-type">{actionLabel[entry.action] ?? entry.action}</span>
                  <div className="analytics-audit-middle">
                    <span className="analytics-audit-entity">{entry.entity_type} #{entry.entity_id?.slice(0, 8)}</span>
                    <span className="analytics-audit-change">
                      <span className="analytics-audit-old">{entry.old_value}</span>
                      <span className="analytics-audit-arrow">→</span>
                      <span className="analytics-audit-new">{entry.new_value}</span>
                    </span>
                  </div>
                  <span className="analytics-audit-time">{formatDateTimePHT(entry.changed_at)}</span>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={auditPage}
            totalPages={auditTotalPages}
            onPageChange={setAuditPage}
            prevLabel="← Prev"
            nextLabel="Next →"
            className="analytics-pagination"
          />
        </Panel>

        {leadStatusDist && leadStatusDist.length > 0 && (
          <Panel kicker="Lead Pipeline" title="Status Breakdown">
            <DonutChart data={leadStatusDist} />
          </Panel>
        )}

      </section>
    </>
  )
}
