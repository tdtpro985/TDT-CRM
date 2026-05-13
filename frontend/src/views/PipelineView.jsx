import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import Modal from '../components/Modal'
import { formatCurrencyCompact, formatDateLabel, formatRelativeDays, getToneClass } from '../utils'
import { ITEMS_PER_PAGE } from '../constants'
import { apiFetch } from '../api'

const CURRENT_MONTH = new Date().toISOString().slice(0, 7)

const STAGE_TONES = {
  'New Opportunity': 'is-stage-new-opportunity',
  Qualified: 'is-stage-qualified',
  Proposal: 'is-stage-proposal',
  Negotiation: 'is-stage-negotiation',
  'Closed Won': 'is-stage-closed-won',
  'Closed Lost': 'is-stage-closed-lost',
}

const DEAL_STAGE_ORDER = ['New Opportunity', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

function getStageTone(stage) {
  return STAGE_TONES[stage] ?? 'is-neutral'
}

export default function PipelineView({
  filteredDeals,
  deals,
  tasks,
  leads,
  contacts,
  teamMembers,
  activeDeals,
  pipelineValue,
  averageDealSize,
  dealStages,
  stageFilter,
  setStageFilter,
  setNotice,
  companyMap,
  handleDealStageChange,
  handleDealUpdate,
  handleTaskStatusToggle,
  currentPage,
  setCurrentPage,
  onViewTasks,
  currentUser,
}) {
  const contactMap = Object.fromEntries((contacts ?? []).map((c) => [c.id, c]))
  const leadMap    = Object.fromEntries((leads    ?? []).map((l) => [l.id, l]))
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [dealContacts, setDealContacts] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editCloseDate, setEditCloseDate] = useState('')
  const [editProbability, setEditProbability] = useState(0)
  const location = useLocation()

  const canEdit = selectedDeal && (
    currentUser?.role === 'Admin' ||
    String(currentUser?.id) === String(selectedDeal.ownerId)
  )
  const navigate = useNavigate()

  useEffect(() => {
    if (location.state?.openDealId) {
      const deal = deals.find(d => d.id === location.state.openDealId)
      if (deal) {
        // Clear state so it doesn't reopen on every navigation
        navigate(location.pathname, { replace: true, state: {} })
        
        // Use a slight delay to avoid cascading render issue and ensure state updates correctly
        setTimeout(() => {
          setSelectedDeal(deal)
          // Scroll to task history after modal opens
          const section = document.getElementById('task-history-section')
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' })
          }
        }, 100)
      }
    }
  }, [location.state, deals, navigate, location.pathname])

  const totalPages = Math.ceil(filteredDeals.length / ITEMS_PER_PAGE)

  useEffect(() => {
    let active = true
    if (selectedDeal) {
      apiFetch(`/api/deals/${selectedDeal.id}/contacts`)
        .then(res => res.json())
        .then(data => {
          if (active) setDealContacts(data)
        })
        .catch(err => {
          console.error('Failed to fetch deal contacts:', err)
        })
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDealContacts([])
    }
    return () => { active = false }
  }, [selectedDeal])

  const getPaginatedData = (data, page, limit) => {
    const pageNum = page === '' || isNaN(page) ? 1 : parseInt(page, 10)
    const start = (pageNum - 1) * limit
    return data.slice(start, start + limit)
  }

  const paginatedDeals = getPaginatedData(filteredDeals, currentPage, ITEMS_PER_PAGE)

  const closingThisMonth = activeDeals.filter((d) => d.expectedClose?.startsWith(CURRENT_MONTH)).length

  const pipelineStageSummary = dealStages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    return { stage, count: stageDeals.length, value: stageDeals.reduce((sum, d) => sum + d.value, 0) }
  })

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Active deals"        value={activeDeals.length.toLocaleString()}      meta="Open opportunities being managed across the sales pipeline" accent="accent"  />
        <MetricCard label="Pipeline value"       value={formatCurrencyCompact(pipelineValue)}      meta="Expected revenue across all active opportunities"           accent="surface" />
        <MetricCard label="Average deal size"    value={formatCurrencyCompact(averageDealSize)}    meta="Average value of open deals"                                accent="alt"     />
        <MetricCard label="Closing this month"   value={closingThisMonth.toLocaleString()}         meta={`Open deals closing in ${CURRENT_MONTH}`}                   accent="surface" />
      </section>

      <section className="pipeline-layout">
        {/* Pipeline Kanban Board */}
        <Panel
          kicker="Deal pipeline visualization"
          title="Track every opportunity by stage"
          detail={
            <div className="priority-legend">
              <span><span className="priority-dot is-overdue" /> Overdue</span>
              <span><span className="priority-dot is-high" /> High Priority</span>
              <span><span className="priority-dot is-today" /> Due Today</span>
            </div>
          }
          action={
            <div className="panel-inline-controls">
              <label className="filter-wrap">
                <span>Stage filter</span>
                <select
                  value={stageFilter}
                  onChange={(e) => {
                    setStageFilter(e.target.value)
                    setCurrentPage(1)
                    setNotice('Pipeline filter updated for the current opportunity view.')
                  }}
                >
                  <option value="all">All stages</option>
                  {dealStages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
          }
        >
          <div className="pipeline-board-wrapper">
            <div className="pipeline-board">
              {dealStages.map((stage) => {
                const stageDeals = paginatedDeals
                  .filter((d) => d.stage === stage)
                  .sort((a, b) => {
                    const urgencyDiff = (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0)
                    if (urgencyDiff !== 0) return urgencyDiff
                    return (b.lastTouch ?? '').localeCompare(a.lastTouch ?? '')
                  })
                const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)

                return (
                  <article key={stage} className="pipeline-lane">
                    <div className="pipeline-lane__header">
                      <div>
                        <strong>{stage}</strong>
                        <span>{stageDeals.length} deals</span>
                      </div>
                      <span className="tone-pill is-neutral">{formatCurrencyCompact(stageValue)}</span>
                    </div>

                    <div className="pipeline-lane__cards">
                      {stageDeals.length === 0 ? (
                        <div className="pipeline-card pipeline-card--empty">
                          No deals in this stage for the current filter.
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <article key={deal.id} className={`pipeline-card ${getStageTone(deal.stage)}${deal.urgencyLabel === 'Overdue' ? ' is-urgent-overdue' : ''}${deal.urgencyLabel === 'High Priority' ? ' is-urgent-high' : ''}${deal.urgencyLabel === 'Due Today' ? ' is-urgent-today' : ''}`}>
                            <div className="pipeline-card__top">
                              <strong>{deal.name}</strong>
                              <span className="tone-pill is-warning">{deal.probability}%</span>
                            </div>
                            <div className="pipeline-card__value">
                              <span className="tone-pill is-warning">{formatCurrencyCompact(deal.value)}</span>
                            </div>
                            <p>{companyMap[deal.companyId]?.name ?? deal.companyId}</p>
                            <p className="pipeline-card__owner">{deal.owner}</p>
                            <p className="pipeline-card__close-date">{formatDateLabel(deal.expectedClose)}</p>
                            <p className="pipeline-card__touch">
                              Last touch {formatRelativeDays(deal.lastTouch) || '—'}
                            </p>
                            <div className="field--compact pipeline-card__btn-wrap" style={{ textAlign: 'center', marginTop: '8px' }}>
                              <button type="button" className="secondary-button pipeline-card__details-btn" onClick={() => setSelectedDeal(deal)}>View details</button>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
          
          {/* Global Pagination */}
          {totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
              <button
                type="button"
                className="secondary-button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <div className="pagination-jump" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={currentPage}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const num = parseInt(val, 10);
                    if (val === '') {
                      // Allow empty input while typing
                      setCurrentPage('');
                    } else if (!isNaN(num) && num >= 1 && num <= totalPages) {
                      setCurrentPage(num);
                    }
                  }}
                  style={{ 
                    width: '40px', 
                    textAlign: 'center', 
                    padding: '4px 0',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    color: 'var(--text-strong)',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>of {totalPages}</span>
              </div>
              <button
                type="button"
                className="secondary-button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </Panel>

        {/* Stage Totals Summary - Now Below Pipeline */}
        <Panel
          className="panel-compact"
          kicker="Stage totals"
          title="Expected revenue by stage"
          detail="Stage totals make it easier to see where the pipeline is healthy and where follow-through is needed."
        >
          <div className="stage-totals-grid">
            {pipelineStageSummary.map((stage) => (
              <article key={stage.stage} className="stage-total-card">
                <div className="stage-total-card__content">
                  <strong>{stage.stage}</strong>
                  <p>{stage.count} {stage.count === 1 ? 'deal' : 'deals'}</p>
                </div>
                <div className="stage-total-card__value">
                  <span className="tone-pill is-warning">{formatCurrencyCompact(stage.value)}</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      {selectedDeal && (
        <div className="deal-modal-overlay" onClick={() => { setSelectedDeal(null); setIsEditing(false) }}>
          <div className="deal-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="deal-modal__header">
              <div>
                <span className="deal-modal__kicker">Deal Details</span>
                <h2>{selectedDeal.name}</h2>
              </div>
              <div className="deal-modal__header-actions">
                <button type="button" className="deal-modal__close" aria-label="Close" onClick={() => { setSelectedDeal(null); setIsEditing(false) }}>✕</button>
                {canEdit && !isEditing && (
                  <button type="button" className="secondary-button" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => {
                    setEditValue(selectedDeal.value)
                    setEditCloseDate(selectedDeal.expectedClose || '')
                    setEditProbability(selectedDeal.probability)
                    setIsEditing(true)
                  }}>Edit Details</button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="modal-body-scroll">

              {/* Detail grid */}
              <div className="deal-modal__grid">
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Company</span>
                  <strong className="deal-modal__value">{companyMap[selectedDeal.companyId]?.name ?? '—'}</strong>
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Owner</span>
                  <strong className="deal-modal__value">{selectedDeal.owner || '—'}</strong>
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Deal Value</span>
                  {isEditing ? (
                    <input
                      type="number"
                      className="deal-modal__edit-input"
                      value={editValue}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                    />
                  ) : (
                    <strong className="deal-modal__value" style={{ color: 'var(--accent-strong)' }}>{formatCurrencyCompact(selectedDeal.value)}</strong>
                  )}
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Probability</span>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="deal-modal__edit-input"
                        style={{ maxWidth: '80px' }}
                        value={editProbability}
                        onChange={(e) => setEditProbability(Number(e.target.value))}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>%</span>
                    </div>
                  ) : (
                    <strong className="deal-modal__value">
                      <span className="tone-pill is-warning">{selectedDeal.probability}%</span>
                    </strong>
                  )}
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Expected Close</span>
                  {isEditing ? (
                    <input
                      type="date"
                      className="deal-modal__edit-input"
                      value={editCloseDate}
                      onChange={(e) => setEditCloseDate(e.target.value)}
                    />
                  ) : (
                    <strong className="deal-modal__value">{formatDateLabel(selectedDeal.expectedClose) || '—'}</strong>
                  )}
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Stage</span>
                  <strong className="deal-modal__value">{selectedDeal.stage}</strong>
                </div>
                {selectedDeal.contactId && (
                  <div className="deal-modal__field">
                    <span className="deal-modal__label">Primary Contact</span>
                    <strong className="deal-modal__value">{contactMap[selectedDeal.contactId]?.name ?? selectedDeal.contactId}</strong>
                  </div>
                )}
                {dealContacts.length > 0 && (
                  <div className="deal-modal__field" style={{ gridColumn: 'span 2' }}>
                    <span className="deal-modal__label">All Associated Contacts</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {dealContacts.map(c => (
                        <span key={c.id} className="tone-pill is-neutral" style={{ padding: '4px 12px' }}>
                          {c.name} {c.deal_role !== 'Primary' ? `(${c.deal_role})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDeal.leadId && (
                  <div className="deal-modal__field">
                    <span className="deal-modal__label">Linked Lead</span>
                    <strong className="deal-modal__value">{leadMap[selectedDeal.leadId]?.customerName ?? selectedDeal.leadId}</strong>
                  </div>
                )}
              </div>

              {/* Task History */}
              <div className="deal-modal__history" id="task-history-section">
                <h3 className="deal-modal__subheading">Task History</h3>
                <div className="deal-modal__task-list">
                  {(tasks ?? []).filter(t => t.dealId === selectedDeal.id).length === 0 ? (
                    <div className="deal-modal__empty-history">
                      No tasks found for this deal.
                    </div>
                  ) : (
                    (tasks ?? [])
                      .filter(t => t.dealId === selectedDeal.id)
                      .sort((a, b) => new Date(b.created_at || b.dueDate || 0) - new Date(a.created_at || a.dueDate || 0))
                      .map(task => (
                        <div key={task.id} className="deal-modal__history-item">
                          <div className="deal-modal__history-info">
                            <strong>{task.title}</strong>
                            <span className="deal-modal__history-meta">{task.type} • {formatDateLabel(task.dueDate || task.created_at)}</span>
                            {task.notes && (
                              <p className="deal-modal__history-notes">{task.notes}</p>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span 
                              className={`tone-pill ${getToneClass(task.status)}`}
                              style={{ cursor: 'pointer' }}
                              title={`View all ${task.status.toLowerCase()} tasks`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewTasks(task.status.toLowerCase());
                                setSelectedDeal(null);
                              }}
                            >
                              {task.status}
                            </span>
                            <button 
                              type="button" 
                              className="ghost-button" 
                              style={{ fontSize: '10px', padding: '4px 8px' }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const nextStatus = task.status === 'Completed' ? 'reopened' : 'completed';
                                await handleTaskStatusToggle(task.id, task.status);
                                onViewTasks(nextStatus);
                                setSelectedDeal(null);
                              }}
                            >
                              {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer: Save / Cancel or Stage Updater ── */}
            <div className="deal-modal__footer">
              {isEditing ? (
                <div className="deal-modal__edit-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={async () => {
                      await handleDealUpdate(selectedDeal.id, { value: editValue, expectedClose: editCloseDate, probability: editProbability })
                      setSelectedDeal((d) => ({ ...d, value: editValue, expectedClose: editCloseDate, probability: editProbability }))
                      setIsEditing(false)
                    }}
                  >Save</button>
                  <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              ) : canEdit ? (
                <>
                  <p className="deal-modal__footer-label">Move to stage</p>
                  <div className="deal-modal__stage-buttons">
                    {dealStages.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`deal-modal__stage-btn ${s === selectedDeal.stage ? 'is-active' : ''}`}
                        onClick={() => {
                          handleDealStageChange(selectedDeal.id, s)
                          setSelectedDeal((d) => ({ ...d, stage: s }))
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="deal-modal__footer-label" style={{ textAlign: 'center', width: '100%', opacity: 0.6 }}>
                  Read-only — you are not the assigned SR for this deal
                </p>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
