import { useState, useEffect, useMemo } from 'react'
import MetricCard from '../components/MetricCard'
import Panel from '../components/Panel'
import { apiFetch } from '../api'
import { formatCurrencyCompact, formatTimeAgo, getPaginatedData } from '../utils'

import Pagination from '../components/Pagination'

const PAGE_SIZE = 5

export default function AdminAnalyticsView({ activeBranch = '' }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [page, setPage]       = useState(1)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true)
    const url = activeBranch ? `/api/admin/analytics?branch=${encodeURIComponent(activeBranch)}` : `/api/admin/analytics`
    apiFetch(url)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setError('Failed to load analytics.'); setLoading(false) })
  }, [activeBranch])
  /* eslint-enable react-hooks/set-state-in-effect */

  const { totals, usersPerBranch, roleDistribution, leadsPerBranch, dealsPerBranch, auditLog } = data || {}

  const branchMap = {}
  if (usersPerBranch) {
    usersPerBranch.forEach((r) => {
      branchMap[r.branch] = { branch: r.branch, users: r.count, leads: 0, converted: 0, deals: 0, pipeline: 0 }
    })
  }
  if (leadsPerBranch) {
    leadsPerBranch.forEach((r) => {
      if (!branchMap[r.branch]) branchMap[r.branch] = { branch: r.branch, users: 0, leads: 0, converted: 0, deals: 0, pipeline: 0 }
      branchMap[r.branch].leads     = r.total
      branchMap[r.branch].converted = r.converted
    })
  }
  if (dealsPerBranch) {
    dealsPerBranch.forEach((r) => {
      const key = r.branch ?? 'Unknown'
      if (!branchMap[key]) branchMap[key] = { branch: key, users: 0, leads: 0, converted: 0, deals: 0, pipeline: 0 }
      branchMap[key].deals    = r.deal_count
      branchMap[key].pipeline = r.pipeline_value
    })
  }
  const branchRows = Object.values(branchMap).sort((a, b) => a.branch?.localeCompare(b.branch))
  const totalPages = Math.ceil(branchRows.length / PAGE_SIZE)

  const pagedRows = useMemo(() => getPaginatedData(branchRows, page, PAGE_SIZE), [branchRows, page])
  const maxLeads = Math.max(...branchRows.map((r) => r.leads), 1)

  if (loading) return <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading analytics…</p>
  if (error)   return <p style={{ padding: '2rem', color: '#ff6b7a' }}>{error}</p>

  const actionLabel = { status_change: 'Status', stage_change: 'Stage' }

  return (
    <>
      {/* KPI row */}
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total Users"    value={totals.users.toLocaleString()}       meta="Accounts across all branches"        accent="accent"  />
        <MetricCard label="Total Leads"    value={totals.leads.toLocaleString()}        meta="Customer records in the system"      accent="surface" />
        <MetricCard label="Active Deals"   value={totals.activeDeals.toLocaleString()}  meta="Open pipeline opportunities"         accent="alt"     />
        <MetricCard label="Pipeline Value" value={formatCurrencyCompact(totals.pipelineValue)}            meta="Revenue across active deals"         accent="accent"  />
      </section>

      <section className="content-grid content-grid--primary">

        {/* Branch performance table */}
        <Panel kicker="Performance" title="Branch Overview">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Users</th>
                  <th>Leads</th>
                  <th>Converted</th>
                  <th>Conv. Rate</th>
                  <th>Active Deals</th>
                  <th>Pipeline</th>
                  <th style={{ minWidth: '120px' }}>Lead volume</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r) => {
                  const rate = r.leads ? Math.round((r.converted / r.leads) * 100) : 0
                  const barW = Math.round((r.leads / maxLeads) * 100)
                  return (
                    <tr key={r.branch}>
                      <td className="admin-table__name">{r.branch ?? '—'}</td>
                      <td>{r.users}</td>
                      <td>{r.leads}</td>
                      <td>{r.converted}</td>
                      <td>
                        <span className={`admin-role-pill ${rate >= 50 ? 'admin-role-pill--accent' : rate >= 20 ? 'admin-role-pill--alt' : 'admin-role-pill--surface'}`}>
                          {rate}%
                        </span>
                      </td>
                      <td>{r.deals}</td>
                      <td>{formatCurrencyCompact(r.pipeline)}</td>
                      <td>
                        <div className="analytics-bar-track">
                          <div className="analytics-bar-fill" style={{ width: `${barW}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>

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

          {/* Recent audit log */}
          <Panel kicker="Activity" title="Recent Changes">
            {auditLog.length === 0 ? (
              <p style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>No activity recorded yet.</p>
            ) : (
              <div className="analytics-audit-list">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="analytics-audit-row">
                    <span className="analytics-audit-type">{actionLabel[entry.action] ?? entry.action}</span>
                    <div className="analytics-audit-middle">
                      <span className="analytics-audit-entity">{entry.entity_type} #{entry.entity_id?.slice(0, 8)}</span>
                      <span className="analytics-audit-change">
                        <span className="analytics-audit-old">{entry.old_value}</span>
                        <span className="analytics-audit-arrow">→</span>
                        <span className="analytics-audit-new">{entry.new_value}</span>
                      </span>
                    </div>
                    <span className="analytics-audit-time">{formatTimeAgo(entry.changed_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

        </div>
      </section>
    </>
  )
}
