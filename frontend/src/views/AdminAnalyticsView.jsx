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

export default function AdminAnalyticsView({ activeBranch = '' }) {
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true)
    const url = activeBranch
      ? `/api/admin/analytics?branch=${encodeURIComponent(activeBranch)}`
      : `/api/admin/analytics`
    apiFetch(url)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load analytics.'); setLoading(false) })
  }, [activeBranch])
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

  const { totals, usersPerBranch, roleDistribution, leadsPerBranch, dealsPerBranch, topSRs } = data || {}

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

  if (loading) return <p className="u-pad-32 u-text-muted">Loading analytics…</p>
  if (error)   return <p className="u-pad-32 u-alert">{error}</p>

  const actionLabel    = { status_change: 'Status', stage_change: 'Stage', create: 'Created', delete: 'Deleted' }
  const actionRowClass = { stage_change: 'analytics-audit-row--stage', status_change: 'analytics-audit-row--status', create: 'analytics-audit-row--create', delete: 'analytics-audit-row--delete' }

  return (
    <>
      {/* KPI row */}
      <section className="metrics-grid metrics-grid--compact" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(max(160px,14%),1fr))' }}>
        <MetricCard label="Total Users"    value={totals.users.toLocaleString()}                  meta="Accounts across all branches"    accent="accent"  />
        <MetricCard label="Total Leads"    value={totals.leads.toLocaleString()}                   meta="Customer records in the system"  accent="surface" />
        <MetricCard label="Active Deals"   value={totals.activeDeals.toLocaleString()}             meta="Open pipeline opportunities"     accent="alt"     />
        <MetricCard label="Pipeline Value" value={formatCurrencyCompact(totals.pipelineValue)}     meta="Revenue across active deals"     accent="accent"  />
        <MetricCard label="Closed Won"     value={totals.closedWon.toLocaleString()}               meta="Deals won all time"              accent="alt"     />
        <MetricCard label="Avg Win Rate"   value={overallWinRate != null ? `${overallWinRate}%` : '—'} meta="Across branches with history" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary" style={{ gridTemplateColumns: '2fr 1fr' }}>

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
            <Panel kicker="Top performers" title="Top Sales Reps">
              <div className="sr-rank-list">
                {topSRs.map((sr, i) => (
                  <div key={sr.name} className={`sr-rank-item${i === 0 ? ' sr-rank-item--top' : ''}`}>
                    <div className="sr-rank-badge">{i + 1}</div>
                    <div className="sr-rank-info">
                      <div className="sr-rank-name">{sr.name}</div>
                      <div className="sr-rank-branch">{sr.branch}</div>
                    </div>
                    <div className="sr-rank-stats">
                      <span className="admin-role-pill admin-role-pill--surface">{sr.leads_count} leads</span>
                      <span className="admin-role-pill admin-role-pill--accent">{sr.converted} won</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

        </div>
      </section>

      {/* Audit log — full width */}
      <section className="u-margin-t-16">
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
                className="ghost-button"
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
      </section>
    </>
  )
}
