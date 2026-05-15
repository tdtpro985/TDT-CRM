import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, formatRelativeDays, getToneClass, getTodayISO, getCurrentMonthISO } from '../utils'
import { ITEMS_PER_PAGE, LOST_REASONS } from '../constants'
import { apiFetch } from '../api'
import Pagination from '../components/Pagination'

const CURRENT_MONTH = getCurrentMonthISO()
const TODAY = getTodayISO()

const STAGE_TONES = {
  'Qualified':       'is-stage-qualified',
  'New Opportunity': 'is-stage-new-opportunity',
  'Proposal':        'is-stage-proposal',
  'Negotiation':     'is-stage-negotiation',
  'Closed Won':      'is-stage-closed-won',
  'Closed Lost':     'is-stage-closed-lost',
}

function getStageTone(stage) {
  return STAGE_TONES[stage] ?? 'is-neutral'
}

export default function PipelineView({
  filteredDeals,
  deals,
  tasks,
  leads,
  contacts,
  activeDeals,
  pipelineValue,
  averageDealSize,
  dealStages,
  stageWorkflow,
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
  teamMembers,
  activeBranch,
}) {
  const contactMap = Object.fromEntries((contacts ?? []).map((c) => [c.id, c]))
  const leadMap    = Object.fromEntries((leads    ?? []).map((l) => [l.id, l]))

  const [selectedDeal, setSelectedDeal] = useState(null)
  const [dealContacts, setDealContacts] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editCloseDate, setEditCloseDate] = useState('')
  const [editProbability, setEditProbability] = useState(0)

  // Closed Lost reason prompt
  const [showLostPrompt, setShowLostPrompt] = useState(false)
  const [lostReason, setLostReason] = useState(LOST_REASONS[0])
  const [lostNotes, setLostNotes] = useState('')

  // Show/hide closed stages
  const [showClosed, setShowClosed] = useState(false)

  // SR filter (HoS/Admin only, requires a specific branch to be selected)
  const [srFilter, setSrFilter] = useState('')
  useEffect(() => { setSrFilter('') }, [activeBranch])

  // PDF attachments
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([])

  const isUpdatingRef = useRef(false)

  const fetchDealSubData = (dealId) => {
    if (!dealId) return
    apiFetch(`/api/deals/${dealId}/contacts`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setDealContacts(Array.isArray(data) ? data : []))
      .catch(() => {})

    apiFetch(`/api/deals/${dealId}/audit`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => {})
  }

  // Sync selectedDeal with deals prop to ensure stage updates are reflected in modal
  useEffect(() => {
    if (selectedDeal && !isUpdatingRef.current) {
      const fresh = deals.find(d => d.id === selectedDeal.id)
      if (fresh && (fresh.stage !== selectedDeal.stage || fresh.value !== selectedDeal.value)) {
        setSelectedDeal(fresh)
      }
    }
  }, [deals, selectedDeal])

  const location = useLocation()
  const navigate = useNavigate()

  const canEdit = selectedDeal && (
    currentUser?.role === 'Admin' ||
    String(currentUser?.id) === String(selectedDeal.ownerId)
  )

  const auditActionLabels = {
    stage_change: 'Stage changed',
    value_change: 'Deal value changed',
    close_date_change: 'Close date changed',
    owner_id_change: 'Owner changed',
    lost_reason: 'Deal lost',
    probability_change: 'Probability changed',
    status_change: 'Status changed',
    task_status_change: 'Task status updated',
  }

  function formatAuditEntry(log) {
    const label = auditActionLabels[log.action] || log.action
    if (log.action.startsWith('task_status:')) {
      const taskName = log.action.split(':')[1]
      return <>Status updated for task <strong>"{taskName}"</strong>: <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{log.oldValue}</span> → <strong>{log.newValue}</strong></>
    }
    if (log.action === 'task_status_change') {
      return <>{label}: <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{log.oldValue}</span> → <strong>{log.newValue}</strong></>
    }
    if (!log.oldValue || !log.newValue || log.oldValue === log.newValue) return label
    switch (log.action) {
      case 'stage_change':
        return <>{label}: <span className={`tone-pill ${getToneClass(log.oldValue)}`} style={{ fontSize: '10px', padding: '1px 6px' }}>{log.oldValue}</span> → <span className={`tone-pill ${getToneClass(log.newValue)}`} style={{ fontSize: '10px', padding: '1px 6px' }}>{log.newValue}</span></>
      case 'value_change':
        return <>{label}: {formatCurrencyCompact(Number(log.oldValue))} → {formatCurrencyCompact(Number(log.newValue))}</>
      case 'close_date_change':
        return <>{label}: {formatDateLabel(log.oldValue)} → {formatDateLabel(log.newValue)}</>
      default:
        return <>{label}: {log.oldValue} → {log.newValue}</>
    }
  }

  const visibleStages = showClosed
    ? dealStages
    : dealStages.filter((s) => s !== 'Closed Won' && s !== 'Closed Lost')

  useEffect(() => {
    if (location.state?.openDealId) {
      const deal = deals.find(d => d.id === location.state.openDealId)
      if (deal) {
        navigate(location.pathname, { replace: true, state: {} })
        setTimeout(() => {
          setSelectedDeal(deal)
          const section = document.getElementById('task-history-section')
          if (section) section.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  }, [location.state, deals, navigate, location.pathname])

  // Fetch deal contacts when a deal is selected
  useEffect(() => {
    if (selectedDeal) {
      fetchDealSubData(selectedDeal.id)
    } else {
      setDealContacts([])
      setAuditLogs([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeal?.id])

  // Fetch attachments when deal is in Proposal stage
  useEffect(() => {
    let active = true
    if (selectedDeal?.stage === 'Proposal') {
      apiFetch(`/api/deals/${selectedDeal.id}/attachments`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (active) setAttachments(Array.isArray(data) ? data : []) })
        .catch(() => {})
    } else {
      setAttachments([])
    }
    return () => { active = false }
  }, [selectedDeal?.id, selectedDeal?.stage])

  const canFilterBySR = (
    (currentUser?.role === 'Head of Sales' || currentUser?.role === 'Admin' || currentUser?.role === 'Regional Sales Manager') &&
    !!activeBranch
  )

  const srOptions = canFilterBySR
    ? (teamMembers ?? []).filter(
        (m) => m.branch === activeBranch &&
               (m.role === 'Sales Representative' || m.role === 'Sales Rep')
      )
    : []

  const srFilteredDeals = (canFilterBySR && srFilter)
    ? filteredDeals.filter((d) => String(d.ownerId) === String(srFilter))
    : filteredDeals

  const totalPages = Math.ceil(srFilteredDeals.length / ITEMS_PER_PAGE)

  const getPaginatedData = (data, page, limit) => {
    const pageNum = page === '' || isNaN(page) ? 1 : parseInt(page, 10)
    const start = (pageNum - 1) * limit
    return data.slice(start, start + limit)
  }

  const paginatedDeals = useMemo(() => getPaginatedData(srFilteredDeals, currentPage, ITEMS_PER_PAGE), [srFilteredDeals, currentPage])

  const closingThisMonth = activeDeals.filter((d) => d.expectedClose?.startsWith(CURRENT_MONTH)).length

  const pipelineStageSummary = dealStages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage)
    return { stage, count: stageDeals.length, value: stageDeals.reduce((sum, d) => sum + d.value, 0) }
  })

  function openDeal(deal) {
    setSelectedDeal(deal)
    setIsEditing(false)
    setShowLostPrompt(false)
    setLostReason(LOST_REASONS[0])
    setLostNotes('')
  }

  function closeDeal() {
    setSelectedDeal(null)
    setIsEditing(false)
    setShowLostPrompt(false)
    setLostReason(LOST_REASONS[0])
    setLostNotes('')
  }

  function handleStageClick(dealId, stage) {
    if (isUpdatingRef.current) return
    if (stage === 'Closed Lost') {
      setShowLostPrompt(true)
      return
    }
    
    isUpdatingRef.current = true
    const prevStage = selectedDeal.stage
    setSelectedDeal((d) => ({ ...d, stage }))
    
    handleDealStageChange(dealId, stage)
      .then(() => {
        fetchDealSubData(dealId)
      })
      .catch(() => {
        setSelectedDeal((d) => ({ ...d, stage: prevStage }))
      })
      .finally(() => {
        isUpdatingRef.current = false
      })
  }

  function confirmLostReason() {
    if (isUpdatingRef.current) return
    const reason = lostNotes.trim() ? `${lostReason}: ${lostNotes.trim()}` : lostReason
    
    isUpdatingRef.current = true
    const prevStage = selectedDeal.stage
    const prevReason = selectedDeal.lostReason
    setSelectedDeal((d) => ({ ...d, stage: 'Closed Lost', lostReason: reason }))
    setShowLostPrompt(false)

    handleDealStageChange(selectedDeal.id, 'Closed Lost', { lostReason: reason })
      .then(() => {
        fetchDealSubData(selectedDeal.id)
      })
      .catch(() => {
        setSelectedDeal((d) => ({ ...d, stage: prevStage, lostReason: prevReason }))
      })
      .finally(() => {
        isUpdatingRef.current = false
        setLostReason(LOST_REASONS[0])
        setLostNotes('')
      })
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setNotice('Only PDF files are supported for proposal documents.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await apiFetch(`/api/deals/${selectedDeal.id}/attachments`, {
        method: 'POST',
        body: form,
      })
      if (res.ok) {
        const newAttachment = await res.json()
        setAttachments((prev) => [newAttachment, ...prev])
        setNotice('Proposal document uploaded successfully.')
      } else {
        setNotice('Upload failed — please try again.')
      }
    } catch {
      setNotice('Upload failed — backend not reachable.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const stageHint = stageWorkflow?.[selectedDeal?.stage]
  const recommendedActivity = stageHint?.activityType

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
              {canFilterBySR && (
                <label className="filter-wrap">
                  <span>Sales Rep</span>
                  <select
                    value={srFilter}
                    onChange={(e) => { setSrFilter(e.target.value); setCurrentPage(1) }}
                  >
                    <option value="">All reps</option>
                    {srOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setShowClosed((v) => !v)}
              >
                {showClosed ? 'Hide Closed' : 'Show Closed'}
              </button>
            </div>
          }
        >
          <div className="pipeline-board-wrapper">
            <div className="pipeline-board">
              {visibleStages.map((stage) => {
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
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <strong style={{ fontSize: 'var(--fs-base)', color: 'var(--text-strong)', lineHeight: 1.2 }}>{deal.name}</strong>
                                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  {companyMap[deal.companyId]?.name ?? deal.companyId}
                                </span>
                              </div>
                              <span className="tone-pill is-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>{deal.probability}%</span>
                            </div>

                            <div style={{ margin: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

                            <div className="pipeline-card__value" style={{ marginBottom: '8px' }}>
                              <span className="tone-pill is-warning" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
                                {formatCurrencyCompact(deal.value)}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Owner:</span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{deal.owner}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Close:</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{formatDateLabel(deal.expectedClose)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Touch:</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{formatRelativeDays(deal.lastTouch) || '—'}</span>
                              </div>
                            </div>

                            <div className="field--compact pipeline-card__btn-wrap" style={{ textAlign: 'center', marginTop: '12px' }}>
                              <button type="button" className="secondary-button pipeline-card__details-btn" style={{ width: '100%', fontSize: '11px', padding: '6px' }} onClick={() => openDeal(deal)}>View details</button>
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
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </Panel>

        {/* Stage Totals Summary */}
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
        <div className="deal-modal-overlay" onClick={closeDeal}>
          <div className="deal-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="deal-modal__header">
              <div>
                <span className="deal-modal__kicker">Deal Details</span>
                <h2>{selectedDeal.name}</h2>
              </div>
              <div className="deal-modal__header-actions">
                <button type="button" className="deal-modal__close" aria-label="Close" onClick={closeDeal}>✕</button>
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
                    <div className="field" style={{ margin: 0 }}>
                      <input
                        type="number"
                        className="deal-modal__edit-input"
                        value={editValue}
                        min="0"
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, '')
                          setEditValue(raw === '' ? '' : Number(raw))
                        }}
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-strong)', padding: '6px 10px', width: '100%' }}
                      />
                    </div>
                  ) : (
                    <strong className="deal-modal__value" style={{ color: 'var(--accent-strong)' }}>{formatCurrencyCompact(selectedDeal.value)}</strong>
                  )}
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Probability</span>
                  {isEditing ? (
                    <div className="field" style={{ margin: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            className="deal-modal__edit-input"
                            style={{ maxWidth: '80px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-strong)', padding: '6px 10px' }}
                            value={editProbability}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '')
                              const num = raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw, 10)))
                              setEditProbability(num)
                            }}
                          />
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>%</span>
                      </div>
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
                    <div className="field" style={{ margin: 0 }}>
                      <input
                        type="date"
                        className="deal-modal__edit-input"
                        style={{ minWidth: '160px', maxWidth: '180px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-strong)', padding: '6px 10px' }}
                        min={TODAY}
                        value={editCloseDate}
                        onChange={(e) => setEditCloseDate(e.target.value)}
                      />
                    </div>
                  ) : (
                    <strong className="deal-modal__value">{formatDateLabel(selectedDeal.expectedClose) || '—'}</strong>
                  )}
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Stage</span>
                  <strong className="deal-modal__value">{selectedDeal.stage}</strong>
                </div>
                {selectedDeal.stage === 'Closed Lost' && selectedDeal.lostReason && (
                  <div className="deal-modal__field" style={{ gridColumn: 'span 2' }}>
                    <span className="deal-modal__label">Loss Reason</span>
                    <strong className="deal-modal__value" style={{ color: 'var(--text-muted)' }}>{selectedDeal.lostReason}</strong>
                  </div>
                )}
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
                        <div key={c.id} className="tone-pill is-neutral" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '2px', height: 'auto', borderRadius: 'var(--r-md)' }}>
                          <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span>{c.name}</span>
                            {c.deal_role && <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.6 }}>{c.deal_role}</span>}
                          </div>
                          {c.role && <div style={{ fontSize: '10px', opacity: 0.8 }}>{c.role}</div>}
                          {(c.phone || c.email) && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '10px' }}>
                              {c.phone && <span title="Phone">📞 {c.phone}</span>}
                              {c.email && <span title="Email">✉️ {c.email}</span>}
                            </div>
                          )}
                        </div>
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

              {/* Proposal Documents (only in Proposal stage) */}
              {selectedDeal.stage === 'Proposal' && (
                <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
                  <h3 className="deal-modal__subheading">Proposal Documents</h3>
                  {attachments.length > 0 ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
                      {attachments.map((a) => (
                        <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 'var(--fs-sm)' }}>{a.label || a.filename}</span>
                          <button
                            type="button"
                            className="ghost-button"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            onClick={async () => {
                              try {
                                const res = await apiFetch(`/api/uploads/${a.filename}`)
                                const blob = await res.blob()
                                const url = URL.createObjectURL(blob)
                                const link = document.createElement('a')
                                link.href = url
                                link.download = a.label || a.filename
                                link.click()
                                URL.revokeObjectURL(url)
                              } catch {
                                setNotice('Download failed.')
                              }
                            }}
                          >
                            Download
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: '8px 0' }}>No documents uploaded yet.</p>
                  )}
                  {canEdit && (
                    <div style={{ marginTop: '12px' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ fontSize: '12px' }}
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? 'Uploading…' : 'Upload PDF'}
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                                closeDeal();
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
                                closeDeal();
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

              {/* Activity Logs */}
              <div className="deal-modal__history">
                <h3 className="deal-modal__subheading">Activity Logs</h3>
                <div className="deal-modal__task-list">
                  {auditLogs.length === 0 ? (
                    <div className="deal-modal__empty-history">No activity logs found for this deal.</div>
                  ) : (
                    auditLogs.map(log => (
                      <div key={log.id} className="deal-modal__history-item deal-modal__activity-item">
                        <div className="deal-modal__history-info">
                          <strong>{formatAuditEntry(log)}</strong>
                          <span className="deal-modal__history-meta">{formatDateLabel(log.changedAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer: Save / Cancel or Stage Updater */}
            <div className="deal-modal__footer">
              {isEditing ? (
                <div className="deal-modal__edit-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={async () => {
                      if (isUpdatingRef.current) return

                      if (editValue === '' || isNaN(editValue) || Number(editValue) < 0) {
                        setNotice('Please enter a valid positive number for deal value.')
                        return
                      }
                      if (editProbability === '' || isNaN(editProbability) || editProbability < 0 || editProbability > 100) {
                        setNotice('Please enter a valid probability (0-100).')
                        return
                      }

                      isUpdatingRef.current = true
                      const prevData = { value: selectedDeal.value, expectedClose: selectedDeal.expectedClose, probability: selectedDeal.probability }
                      setSelectedDeal((d) => ({ ...d, value: editValue, expectedClose: editCloseDate, probability: editProbability }))
                      setIsEditing(false)

                      try {
                        await handleDealUpdate(selectedDeal.id, { value: editValue, expectedClose: editCloseDate, probability: editProbability })
                        fetchDealSubData(selectedDeal.id)
                      } catch {
                        setSelectedDeal((d) => ({ ...d, ...prevData }))
                      } finally {
                        isUpdatingRef.current = false
                      }
                    }}
                  >Save</button>
                  <button type="button" className="secondary-button" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              ) : showLostPrompt ? (
                <div style={{ width: '100%' }}>
                  <p className="deal-modal__footer-label" style={{ marginBottom: '10px' }}>Why was this deal lost?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <select
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      style={{ padding: '8px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 'var(--fs-sm)' }}
                    >
                      {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <textarea
                      value={lostNotes}
                      onChange={(e) => setLostNotes(e.target.value)}
                      placeholder="Additional notes (optional)"
                      rows={2}
                      style={{ padding: '8px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 'var(--fs-sm)', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="primary-button" style={{ flex: 1 }} onClick={confirmLostReason}>Confirm Lost</button>
                      <button type="button" className="secondary-button" onClick={() => setShowLostPrompt(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : canEdit ? (
                <>
                  {recommendedActivity && (
                    <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '8px', width: '100%' }}>
                      Recommended activity: <strong>{recommendedActivity}</strong>
                    </p>
                  )}
                  <p className="deal-modal__footer-label">Move to stage</p>
                  <div className="deal-modal__stage-buttons">
                    {dealStages.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`deal-modal__stage-btn ${s === selectedDeal.stage ? 'is-active' : ''}`}
                        onClick={() => handleStageClick(selectedDeal.id, s)}
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
