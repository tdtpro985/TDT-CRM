import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, formatDateTimePHT, formatDueDate, formatRelativeDays, getToneClass, getTodayISO, getCurrentMonthISO, matchesSearch, isSrRole, roleAbbr, isValidPhone, isValidEmail, createRecordId } from '../utils'
import { LOST_REASONS, STAGE_COLORS, DEAL_STAGES } from '../constants'
import { apiFetch } from '../api'

import { IconPhone, IconCheck, IconCalendar, IconMail, IconClipboard, IconViber } from '../components/Icons'

const CURRENT_MONTH = getCurrentMonthISO()
const TODAY = getTodayISO()
const STAGE_CARD_LIMIT = 5

const STAGE_TONES = {
  'New Opportunity': 'is-stage-new-opportunity',
  'Proposal':        'is-stage-proposal',
  'Negotiation':     'is-stage-negotiation',
  'Closed Won':      'is-stage-closed-won',
  'Closed Lost':     'is-stage-closed-lost',
}

function getStageTone(stage) {
  return STAGE_TONES[stage] ?? 'is-neutral'
}

function getTaskTypeIcon(type) {
  switch (type) {
    case 'Call': return <IconPhone />
    case 'Meeting': return <IconCalendar />
    case 'Email': return <IconMail />
    default: return <IconClipboard />
  }
}

const AUDIT_ACTION_LABELS = {
  'deal_created':        'Deal Created',
  'name_change':         'Name Changed',
  'probability_change':  'Probability Changed',
  'stage_change':        'Stage Changed',
  'value_change':        'Value Changed',
  'close_date_change':   'Close Date Changed',
  'owner_id_change':     'Owner Changed',
  'lost_reason':         'Lost Reason Set',
  'bulk_task_completion':'Tasks Completed',
  'contact_added':       'Contact Added',
  'contact_removed':     'Contact Removed',
}
function formatAuditAction(action) {
  if (!action) return 'Updated'
  if (action.startsWith('task_status:')) return 'Task Updated'
  if (action.startsWith('contact_role_change:')) return 'Contact Role Changed'
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function showAuditValues(action) {
  return action !== 'owner_id_change' && action !== 'deal_created' && action !== 'bulk_task_completion'
}

export default function PipelineView({
  deals,
  tasks,
  leads,
  contacts,
  companies,
  teamMembers,
  dealStages,
  stageWorkflow,
  setNotice,
  handleDealStageChange,
  handleDealUpdate,
  handleTaskStatusToggle,
  onDealReassign,
  onViewTasks,
  currentUser,
  activeBranch,
  searchQuery,
}) {
  const [stageFilter, setStageFilter] = useState('all')
  const [stageExpanded, setStageExpanded] = useState({})
  const isSr = isSrRole(currentUser?.role)

  const companyMap = useMemo(() => {
    const map = Object.fromEntries((companies ?? []).map((c) => [c.id, c]))
    ;(leads ?? []).forEach(l => { if (!map[l.id]) map[l.id] = { id: l.id, name: l.customerName } })
    return map
  }, [companies, leads])
  const contactMap = useMemo(() => Object.fromEntries((contacts  ?? []).map((c) => [c.id, c])), [contacts])

  const filteredDeals = useMemo(() => deals.filter(
    (d) =>
      (stageFilter === 'all' || d.stage === stageFilter) &&
      matchesSearch(searchQuery, [d.name, companyMap[d.companyId]?.name, contactMap[d.contactId]?.name, d.owner, d.stage]),
  ), [deals, stageFilter, searchQuery, companyMap, contactMap])

  const dealTaskStats = useMemo(() => {
    const stats = {}
    ;(tasks ?? []).forEach(task => {
      if (!task.dealId) return
      if (!stats[task.dealId]) stats[task.dealId] = { callCount: 0, nextStep: null, nextStepDue: null }
      if (task.type === 'Call') stats[task.dealId].callCount++
      if (task.status !== 'Completed' && task.dueDate) {
        if (!stats[task.dealId].nextStepDue || task.dueDate < stats[task.dealId].nextStepDue) {
          stats[task.dealId].nextStep = task.title
          stats[task.dealId].nextStepDue = task.dueDate
        }
      }
    })
    return stats
  }, [tasks])

  const [selectedDeal, setSelectedDeal] = useState(null)
  const [dealContacts, setDealContacts] = useState([])
  const [contactErrors, setContactErrors] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editCloseDate, setEditCloseDate] = useState('')
  const [editProbability, setEditProbability] = useState(0)

  // Closed Lost reason prompt
  const [showLostPrompt, setShowLostPrompt] = useState(false)
  const [lostReason, setLostReason] = useState(LOST_REASONS[0])
  const [lostNotes, setLostNotes] = useState('')

  // Inline deal owner selection
  const [pendingDealOwner, setPendingDealOwner] = useState('')
  const [dealReassignProcessing, setDealReassignProcessing] = useState(false)



  // SR filter (HoS/Admin only, requires a specific branch to be selected)
  const [srFilter, setSrFilter] = useState('')
  useEffect(() => { setSrFilter('') }, [activeBranch])

  // Owners selectable in the SR-Accounts filter — everyone in the manager's
  // visibility scope (SRs + peer managers + self), fetched separately so it
  // never feeds the assignment dropdowns. Empty for non-managers.
  const [filterOwners, setFilterOwners] = useState([])

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([])
  const [changeHistoryExpanded, setChangeHistoryExpanded] = useState(false)
  const [changeHistoryFilter, setChangeHistoryFilter] = useState('')

  const changeHistoryActions = useMemo(() => {
    const actions = new Set(auditLogs.map(l => l.action).filter(Boolean))
    return ['', ...Array.from(actions).sort()]
  }, [auditLogs])

  const filteredAuditLogs = useMemo(() => {
    if (!changeHistoryFilter) return auditLogs
    return auditLogs.filter(l => l.action === changeHistoryFilter)
  }, [auditLogs, changeHistoryFilter])

  const isUpdatingRef = useRef(false)
  const lostPromptRef = useRef(null)

  const fetchDealSubData = (dealId) => {
    if (!dealId) return
    apiFetch(`/api/deals/${dealId}/contacts`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setDealContacts(Array.isArray(data) ? data.map(c => ({ ...c, isEditing: false })) : []))
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
      if (fresh && (
        fresh.stage !== selectedDeal.stage ||
        fresh.value !== selectedDeal.value ||
        fresh.probability !== selectedDeal.probability ||
        fresh.expectedClose !== selectedDeal.expectedClose ||
        fresh.ownerId !== selectedDeal.ownerId
      )) {
        setSelectedDeal(fresh)
      }
    }
  }, [deals, selectedDeal])

  const location = useLocation()
  const navigate = useNavigate()

  // Managers may edit their own deals or those owned by SRs, but not another manager's.
  const ownerIsManager = ['Admin', 'Head of Sales', 'Regional Sales Manager'].includes(selectedDeal?.ownerRole)
  const canEdit = selectedDeal && (
    currentUser?.role === 'Admin' ||
    String(currentUser?.id) === String(selectedDeal.ownerId) ||
    ((currentUser?.role === 'Head of Sales' || currentUser?.role === 'Regional Sales Manager') && !ownerIsManager)
  )

  const visibleStages = dealStages

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
      document.body.style.overflow = 'hidden'
    } else {
      setDealContacts([])
      setAuditLogs([])
      setContactErrors({})
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeal?.id])

  const canFilterBySR = (
    (currentUser?.role === 'Head of Sales' || currentUser?.role === 'Admin' || currentUser?.role === 'Regional Sales Manager') &&
    !!activeBranch
  )

  // Fetch the scope-wide owner list (all roles, incl. self + peer managers) for
  // the filter dropdown. Kept separate from teamMembers so assignment dropdowns
  // are unaffected. Empty for non-managers.
  useEffect(() => {
    if (!canFilterBySR) { setFilterOwners([]); return }
    let isCurrent = true
    const q = activeBranch ? `?purpose=filter&branch=${encodeURIComponent(activeBranch)}` : '?purpose=filter'
    apiFetch(`/api/team${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (isCurrent) setFilterOwners(Array.isArray(d) ? d : []) })
      .catch(() => { if (isCurrent) setFilterOwners([]) })
    return () => { isCurrent = false }
  }, [canFilterBySR, activeBranch])

  // Filter options: scope-wide owners, current user pinned to the top.
  const srOptions = canFilterBySR
    ? [...filterOwners].sort((a, b) => {
        if (String(a.id) === String(currentUser?.id)) return -1
        if (String(b.id) === String(currentUser?.id)) return 1
        return (a.name || '').localeCompare(b.name || '')
      })
    : []

  const srFilteredDeals = (canFilterBySR && srFilter)
    ? filteredDeals.filter((d) => String(d.ownerId) === String(srFilter))
    : filteredDeals

  const kpiDeals = useMemo(
    () => srFilteredDeals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost'),
    [srFilteredDeals]
  )
  const kpiCount   = kpiDeals.length
  const kpiValue   = kpiDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const kpiAvgSize = kpiCount > 0 ? kpiValue / kpiCount : 0
  const kpiClosing = kpiDeals.filter(d => d.expectedClose?.startsWith(CURRENT_MONTH)).length

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
    setPendingDealOwner('')
  }

  function closeDeal() {
    setSelectedDeal(null)
    setIsEditing(false)
    setShowLostPrompt(false)
    setLostReason(LOST_REASONS[0])
    setLostNotes('')
    setPendingDealOwner('')
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
    handleDealStageChange(selectedDeal.id, 'Closed Lost', { lostReason: reason })
    setShowLostPrompt(false)
  }

  const stageHint = stageWorkflow?.[selectedDeal?.stage]
  const recommendedActivity = stageHint?.activityType

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Active deals"        value={kpiCount.toLocaleString()}             meta="Open opportunities matching current filters"             accent="accent"  />
        <MetricCard label="Pipeline value"      value={formatCurrencyCompact(kpiValue)}        meta="Expected revenue across filtered active opportunities"    accent="surface" />
        <MetricCard label="Average deal size"   value={formatCurrencyCompact(kpiAvgSize)}      meta="Average value of filtered open deals"                    accent="alt"     />
        <MetricCard label="Closing this month"  value={kpiClosing.toLocaleString()}            meta={`Filtered open deals closing in ${CURRENT_MONTH}`}       accent="surface" />
      </section>

      <section className="pipeline-layout">
        {/* Pipeline Kanban Board */}
        <Panel
          kicker="Deal pipeline visualization"
          title="Track every opportunity by stage"
          detail="Colored corner strips show deal health at a glance"
          action={
            <div className="panel-inline-controls">
              <label className="filter-wrap">
                <span>Stage filter</span>
                <select
                  value={stageFilter}
                  onChange={(e) => {
                    setStageFilter(e.target.value)
                    setNotice('Pipeline filter updated for the current opportunity view.')
                  }}
                >
                  <option value="all">All stages</option>
                  {dealStages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              {canFilterBySR && (
                <label className="filter-wrap">
                  <span>SR Accounts</span>
                  <select
                    value={srFilter}
                    onChange={(e) => { setSrFilter(e.target.value) }}
                  >
                    <option value="">All reps</option>
                    {srOptions.map((m) => {
                      const tag = (m.role && m.role !== 'Sales Representative' && m.role !== 'Sales Rep') ? ` (${roleAbbr(m.role)})` : ''
                      return <option key={m.id} value={m.id}>{m.name}{tag}</option>
                    })}
                  </select>
                </label>
              )}

            </div>
          }
        >
          <div className="pipeline-board-wrapper">
            <div className="pipeline-board">
              {visibleStages.map((stage) => {
                const stageDeals = srFilteredDeals
                  .filter((d) => d.stage === stage)
                  .sort((a, b) => {
                    const touchDiff = (b.lastTouch ?? '').localeCompare(a.lastTouch ?? '')
                    if (touchDiff !== 0) return touchDiff
                    return (b.urgencyScore ?? 0) - (a.urgencyScore ?? 0)
                  })
                const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
                const isExpanded = !!stageExpanded[stage]
                const visibleCards = isExpanded ? stageDeals : stageDeals.slice(0, STAGE_CARD_LIMIT)

                return (
                  <article key={stage} className="pipeline-lane">
                    <div className="pipeline-lane__header">
                      <div>
                        <strong>{stage}</strong>
                        <span>{stageDeals.length} deals</span>
                      </div>
                      <span className="u-fs-xs u-text-muted u-font-700">{formatCurrencyCompact(stageValue)}</span>
                    </div>

                    <div className="pipeline-lane__cards">
                      {stageDeals.length === 0 ? (
                        <div className="pipeline-card pipeline-card--empty">
                          No deals in this stage for the current filter.
                        </div>
                      ) : (
                        visibleCards.map((deal) => (
                          <article
                            key={deal.id}
                            className={`pipeline-card ${getStageTone(deal.stage)}`}
                            onClick={() => openDeal(deal)}
                          >
                            <div className="pipeline-card__top">
                              <div className="pipeline-card__header-box">
                                <strong className="pipeline-card__title">{deal.name}</strong>
                                <span className="pipeline-card__subtitle">
                                  {companyMap[deal.companyId]?.name ?? deal.companyId}
                                </span>
                              </div>
                              <span className="u-fs-xs u-text-muted u-font-700">{deal.probability}%</span>
                            </div>

                            <div className="pipeline-card__divider" />

                            <div className="pipeline-card__value u-margin-b-8">
                              <strong className="u-fs-lg u-text-accent">
                                {formatCurrencyCompact(deal.value)}
                              </strong>
                            </div>

                            <div className="pipeline-card__stats-list">
                              {!isSr && <div className="pipeline-card__stat-row">
                                <span className="pipeline-card__stat-label">Owner:</span>
                                <span className="pipeline-card__stat-value">{deal.owner}</span>
                              </div>}
                              <div className="pipeline-card__stat-row">
                                <span className="pipeline-card__stat-label">Close:</span>
                                <span className="pipeline-card__stat-value">{formatDateLabel(deal.expectedClose)}</span>
                              </div>
                              <div className="pipeline-card__stat-row">
                                <span className="pipeline-card__stat-label">Touch:</span>
                                <span className="pipeline-card__stat-value">{formatRelativeDays(deal.lastTouch) || '—'}</span>
                              </div>
                              {(dealTaskStats[deal.id]?.callCount ?? 0) > 0 && (
                                <div className="pipeline-card__stat-row">
                                  <span className="pipeline-card__stat-label">Calls:</span>
                                  <span className="pipeline-card__stat-value">{dealTaskStats[deal.id].callCount}</span>
                                </div>
                              )}
                              {dealTaskStats[deal.id]?.nextStep && (
                                <div className="pipeline-card__stat-row">
                                  <span className="pipeline-card__stat-label">Next:</span>
                                  <span className="pipeline-card__stat-value u-truncate" title={dealTaskStats[deal.id].nextStep}>
                                    {dealTaskStats[deal.id].nextStep}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="pipeline-card__btn-wrap">
                              <div className="field--compact pipeline-card__footer">
                                <button type="button" className="secondary-button pipeline-card__action-btn">View details</button>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>

                    {stageDeals.length > STAGE_CARD_LIMIT && (
                      <div
                        className="collapse-bar"
                        onClick={() => setStageExpanded(prev => ({ ...prev, [stage]: !prev[stage] }))}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: `rotate(${isExpanded ? 180 : 0}deg)`, transition: 'transform 0.2s' }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                        <span>{isExpanded ? 'Show less' : `Show all ${stageDeals.length} deals`}</span>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </div>
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
                  <strong className="u-fs-md u-text-muted">{formatCurrencyCompact(stage.value)}</strong>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      {selectedDeal && createPortal(
        <div
          className="deal-modal-overlay"
          onClick={closeDeal}
        >
          <div
            className={`deal-modal ${getStageTone(selectedDeal.stage)}`}
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── Header ── */}
            <div className="deal-modal__header">
              <div>
                <span className="deal-modal__kicker">Deal Details</span>
                <h2>{selectedDeal.name}</h2>
              </div>
              <div className="deal-modal__header-actions">
                <button
                  type="button"
                  className="deal-modal__close"
                  aria-label="Close"
                  onClick={closeDeal}
                >✕</button>
                {canEdit && !isEditing && (
                  <button type="button" className="secondary-button" onClick={() => {
                    setEditValue(selectedDeal.value)
                    setEditCloseDate(selectedDeal.expectedClose || '')
                    setEditProbability(selectedDeal.probability)
                    setIsEditing(true)
                  }}>Edit Details</button>
                )}
              </div>
            </div>

            <div className="deal-modal__lower">
            <div className="modal-body-scroll">
              {/* Company & Meta Info */}
              <div className="u-flex-between u-flex-center" style={{ marginBottom: '16px' }}>
                <strong className="u-fs-md">{companyMap[selectedDeal.companyId]?.name ?? selectedDeal.companyId}</strong>
                <div className="u-flex-center-gap-sm">
                  <span className="u-fs-xs u-text-muted">{selectedDeal.source || 'Manual'}</span>
                  {!isSr && (
                    <>
                      <span className="u-text-muted"> · </span>
                      <select
                        className="modal-edit-input u-fs-xs"
                        style={{ padding: '2px 6px', minWidth: '120px' }}
                        value={pendingDealOwner || String(selectedDeal.ownerId ?? '')}
                        onChange={(e) => setPendingDealOwner(e.target.value)}
                        disabled={dealReassignProcessing}
                      >
                        {(teamMembers ?? []).filter(m =>
                          isSrRole(m.role) &&
                          selectedDeal?.branch &&
                          (m.branch || '').toLowerCase() === selectedDeal.branch.toLowerCase()
                        ).map(m => (
                          <option key={m.id} value={String(m.id)}>{m.name}</option>
                        ))}
                      </select>
                      {pendingDealOwner && pendingDealOwner !== String(selectedDeal.ownerId ?? '') && (
                        <>
                          <button
                            type="button"
                            className="primary-button is-compact"
                            disabled={dealReassignProcessing}
                            onClick={async () => {
                              setDealReassignProcessing(true)
                              try {
                                await onDealReassign?.(selectedDeal.id, Number(pendingDealOwner))
                                setPendingDealOwner('')
                              } catch { /* error surfaced via setNotice */ }
                              finally { setDealReassignProcessing(false) }
                            }}
                          >
                            {dealReassignProcessing ? <span className="spinner-small" /> : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="ghost-button is-compact"
                            disabled={dealReassignProcessing}
                            onClick={() => setPendingDealOwner('')}
                          >Discard</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="u-margin-b-24" style={{ padding: '0 28px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div className="deal-modal__field">
                      <span className="deal-modal__label">Deal Value</span>
                      <div className="field u-margin-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="modal-edit-input"
                          value={editValue === '' ? '' : Number(editValue).toLocaleString('en-US')}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9.]/g, '')
                            setEditValue(raw === '' ? '' : Number(raw))
                          }}
                        />
                      </div>
                    </div>
                    <div className="deal-modal__field">
                      <span className="deal-modal__label">Probability</span>
                      <div className="field u-margin-0">
                        <div className="u-flex-center-gap-sm">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            className="modal-edit-input u-width-80"
                            value={editProbability}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^0-9]/g, '')
                              const num = raw === '' ? '' : Math.min(100, Math.max(0, parseInt(raw, 10)))
                              setEditProbability(num)
                            }}
                          />
                          <span className="u-fs-sm u-text-muted">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="deal-modal__field">
                      <span className="deal-modal__label">Expected Close</span>
                      <div className="field u-margin-0">
                        <input
                          type="date"
                          className="modal-edit-input u-width-date"
                          min={TODAY}
                          value={editCloseDate}
                          onChange={(e) => setEditCloseDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. Transaction Summary */}
              <div className="modal-section-divider u-margin-b-24">
                <h3 className="deal-modal__subheading">Transaction Summary</h3>
                <div className="metrics-grid metrics-grid--compact u-grid-3 u-margin-b-16">
                  <MetricCard 
                    label="Value" 
                    value={formatCurrencyCompact(selectedDeal.value)} 
                    meta="Raw potential" 
                    accent="accent" 
                  />
                  <MetricCard 
                    label="Weighted" 
                    value={formatCurrencyCompact((selectedDeal.value * selectedDeal.probability) / 100)} 
                    meta={`${selectedDeal.probability}% Probability`} 
                    accent="alt" 
                  />
                  <MetricCard
                    label="Deal Age"
                    value={(() => { const d = new Date(selectedDeal.created_at || selectedDeal.createdAt); return isNaN(d) ? '—' : `${Math.floor((new Date() - d) / 86400000)} days`; })()}
                    meta={(() => { const d = new Date(selectedDeal.created_at || selectedDeal.createdAt); return isNaN(d) ? 'Created date unknown' : `Created ${d.toLocaleDateString()}`; })()}
                    accent="surface"
                  />
                </div>
                
                {(dealTaskStats[selectedDeal.id]?.callCount ?? 0) > 0 && (
                  <div className="u-pad-12 u-bg-white-03 u-border-radius-md u-flex-between u-flex-center u-margin-b-12">
                    <span className="u-fs-10 u-text-muted u-font-700 u-uppercase u-flex-center-gap-4">
                      <IconPhone /> Call Activity
                    </span>
                    <div className="u-flex-center-gap-16">
                      <span className="u-fs-sm"><strong>{dealTaskStats[selectedDeal.id].callCount}</strong> call{dealTaskStats[selectedDeal.id].callCount !== 1 ? 's' : ''} logged</span>
                      {dealTaskStats[selectedDeal.id]?.nextStep && (
                        <span className="u-fs-xs u-text-muted u-truncate" style={{ maxWidth: 180 }} title={dealTaskStats[selectedDeal.id].nextStep}>
                          Next: {dealTaskStats[selectedDeal.id].nextStep}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {selectedDeal.expectedClose && selectedDeal.stage !== 'Closed Won' && selectedDeal.stage !== 'Closed Lost' && (
                  <div className="u-pad-12 u-bg-white-03 u-border-radius-md u-flex-between u-flex-center">
                    <div className="u-flex-column">
                      <span className="u-fs-10 u-text-muted u-font-700 u-uppercase">Countdown to Close</span>
                      <strong className="u-fs-md">
                        {(() => {
                          const daysLeft = Math.ceil((new Date(selectedDeal.expectedClose) - new Date()) / (1000 * 60 * 60 * 24))
                          return daysLeft > 0 ? `${daysLeft} days remaining` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`
                        })()}
                      </strong>
                    </div>
                    <div className={`status-text ${
                      Math.ceil((new Date(selectedDeal.expectedClose) - new Date()) / (1000 * 60 * 60 * 24)) < 7 ? 'is-alert' : 'is-positive'
                    } u-font-700`}>
                      Target: {new Date(selectedDeal.expectedClose).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Associated Contacts */}
              <div className="modal-section-divider u-margin-b-24">
                <div className="u-flex-between u-flex-center u-margin-b-12">
                  <h3 className="deal-modal__subheading u-margin-0">Associated Contacts</h3>
                  <button
                    type="button"
                    className="u-btn-circle-plus"
                    title="Add contact"
                    onClick={() => {
                      setDealContacts(prev => [{
                        id: createRecordId('contact'),
                        name: '',
                        role: '',
                        email: '',
                        phone: '',
                        isEditing: true,
                        isNew: true,
                      }, ...prev])
                    }}
                  >+</button>
                </div>
                {dealContacts.length > 0 && <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th className="col-actions"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dealContacts.map((c, idx) => {
                          const errs = contactErrors[c.id] || {}
                          return (
                            <tr key={c.id}>
                              {c.isEditing ? (
                                <>
                                  <td>
                                    <input
                                      value={c.name}
                                      onChange={e => {
                                        const val = e.target.value
                                        setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, name: val } : x))
                                      }}
                                      placeholder="Name *"
                                      className={`u-w-100 u-box-border${errs.name ? ' u-border-alert' : ''}`}
                                    />
                                    {errs.name && <div className="u-fs-10 u-margin-t-4 u-alert">{errs.name}</div>}
                                  </td>
                                  <td>
                                    <input
                                      value={c.role ?? ''}
                                      onChange={e => {
                                        const val = e.target.value
                                        setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, role: val } : x))
                                      }}
                                      placeholder="Role"
                                      className="u-w-100 u-box-border"
                                    />
                                  </td>
                                  <td>
                                    <input
                                      value={c.phone ?? ''}
                                      onChange={e => {
                                        const val = e.target.value.replace(/[^0-9+\s()-]/g, '')
                                        setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, phone: val } : x))
                                      }}
                                      placeholder="Number"
                                      className={`u-w-100 u-box-border${errs.phone ? ' u-border-alert' : ''}`}
                                    />
                                    {errs.phone && <div className="u-fs-10 u-margin-t-4 u-alert">{errs.phone}</div>}
                                  </td>
                                  <td>
                                    <input
                                      value={c.email ?? ''}
                                      onChange={e => {
                                        const val = e.target.value
                                        setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, email: val } : x))
                                      }}
                                      placeholder="Email"
                                      className={`u-w-100 u-box-border${errs.email ? ' u-border-alert' : ''}`}
                                    />
                                    {errs.email && <div className="u-fs-10 u-margin-t-4 u-alert">{errs.email}</div>}
                                    {errs.global && <div className="u-fs-10 u-margin-t-4 u-font-600 u-alert">{errs.global}</div>}
                                  </td>
                                  <td className="col-actions u-nowrap">
                                    <button
                                      type="button"
                                      className="ghost-button u-fs-11 u-pad-2-6 u-mr-4"
                                      onClick={async () => {
                                        const errors = {}
                                        if (!c.name?.trim()) errors.name = 'Name is required'
                                        if (!c.email?.trim() && !c.phone?.trim()) {
                                          errors.email = 'Phone or email is required'
                                          errors.phone = 'Phone or email is required'
                                        }
                                        if (c.phone?.trim() && !isValidPhone(c.phone)) errors.phone = 'Invalid phone number'
                                        if (c.email?.trim() && !isValidEmail(c.email)) errors.email = 'Invalid email address'
                                        if (Object.keys(errors).length > 0) {
                                          setContactErrors(prev => ({ ...prev, [c.id]: errors }))
                                          setNotice('Please correct the highlighted errors.')
                                          return
                                        }
                                        setContactErrors(prev => { const next = { ...prev }; delete next[c.id]; return next })
                                        try {
                                          if (c.isNew) {
                                            let cleanPhone = (c.phone ?? '').replace(/\s/g, '')
                                            if (cleanPhone.startsWith('09')) cleanPhone = '+63' + cleanPhone.substring(1)
                                            const createRes = await apiFetch('/api/contacts', {
                                              method: 'POST',
                                              body: JSON.stringify({
                                                id: c.id,
                                                name: c.name,
                                                role: c.role,
                                                email: c.email,
                                                phone: cleanPhone,
                                                companyId: selectedDeal.companyId,
                                                ownerId: currentUser?.id || null,
                                                lastTouch: new Date().toISOString().split('T')[0],
                                                status: 'Active',
                                              }),
                                            })
                                            if (createRes.status === 409) {
                                              const errData = await createRes.json()
                                              setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Duplicate contact' } }))
                                              setNotice(errData.error || 'This contact already exists.')
                                              return
                                            }
                                            if (!createRes.ok) {
                                              const errData = await createRes.json().catch(() => ({}))
                                              setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Create failed' } }))
                                              setNotice(errData.error || 'Failed to create contact.')
                                              return
                                            }
                                            const saved = await createRes.json()
                                            const linkRes = await apiFetch(`/api/deals/${selectedDeal.id}/contacts`, {
                                              method: 'POST',
                                              body: JSON.stringify({ contactId: saved.id ?? c.id, role: 'Primary' }),
                                            })
                                            if (!linkRes.ok) {
                                              setNotice('Contact created but could not link to deal.')
                                            }
                                          } else {
                                            const res = await apiFetch(`/api/contacts/${c.id}`, {
                                              method: 'PUT',
                                              body: JSON.stringify({ name: c.name, role: c.role, email: c.email, phone: c.phone }),
                                            })
                                            if (res.status === 409) {
                                              const errData = await res.json()
                                              setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Duplicate contact' } }))
                                              setNotice(errData.error || 'This contact already exists.')
                                              return
                                            }
                                            if (!res.ok) {
                                              const errData = await res.json().catch(() => ({}))
                                              setContactErrors(prev => ({ ...prev, [c.id]: { global: errData.error || 'Update failed' } }))
                                              setNotice(errData.error || 'Failed to update contact.')
                                              return
                                            }
                                          }
                                          setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, isEditing: false, isNew: false } : x))
                                          setNotice('Contact saved.')
                                          fetchDealSubData(selectedDeal.id)
                                        } catch {
                                          setContactErrors(prev => ({ ...prev, [c.id]: { global: 'Network error' } }))
                                          setNotice('A network error occurred while saving the contact.')
                                        }
                                      }}
                                    >Save</button>
                                    <button
                                      type="button"
                                      className="ghost-button u-fs-11 u-pad-2-6"
                                      onClick={() => {
                                        if (c.isNew) {
                                          setDealContacts(prev => prev.filter((_, i) => i !== idx))
                                        } else {
                                          setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, isEditing: false } : x))
                                        }
                                        setContactErrors(prev => { const next = { ...prev }; delete next[c.id]; return next })
                                      }}
                                    >Cancel</button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="admin-table__name">{c.name}</td>
                                  <td className="admin-table__muted">{c.role || '—'}</td>
                                  <td className="admin-table__muted u-nowrap">
                                    {c.phone ? (
                                      <span className="u-flex-center-gap-4">
                                        <a href={`viber://chat?number=${encodeURIComponent(c.phone.replace(/[^0-9+]/g, ''))}`} className="deal-modal__contact-link" title="Call via Viber">
                                          <IconViber />
                                        </a>
                                        {c.phone}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="admin-table__muted u-nowrap">
                                    {c.email ? (
                                      <span className="u-flex-center-gap-4">
                                        <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(c.email)}`} className="deal-modal__contact-link" title="Send Email" target="_blank" rel="noopener noreferrer">
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                            <polyline points="22,6 12,13 2,6"/>
                                          </svg>
                                        </a>
                                        {c.email}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="col-actions">
                                    <button
                                      type="button"
                                      className="ghost-button u-fs-11 u-pad-2-6"
                                      title="Edit"
                                      onClick={() => setDealContacts(prev => prev.map((x, i) => i === idx ? { ...x, isEditing: true } : x))}
                                    >Edit</button>
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>}
                </div>


              {/* 4. Tasks */}
              <div className="deal-modal__history" id="task-history-section">
                <h3 className="deal-modal__subheading">Tasks</h3>
                <div className="timeline">
                  {(tasks ?? []).filter(t => t.dealId === selectedDeal.id).length === 0 ? (
                    <div className="deal-modal__empty-history">
                      No tasks found for this deal.
                    </div>
                  ) : (
                    (tasks ?? [])
                      .filter(t => t.dealId === selectedDeal.id && t.type !== 'Update')
                      .sort((a, b) => new Date(b.created_at || b.dueDate || 0) - new Date(a.created_at || a.dueDate || 0))
                      .map(task => (
                        <div key={task.id} className="timeline-item">
                          <div className="timeline-dot timeline-dot--accent"></div>
                          <div className="timeline-content">
                            <div className="timeline-body">
                              <div className="u-flex-between u-flex-center u-margin-b-4">
                                <strong>{task.title}</strong>
                                <span className="timeline-badge is-activity u-flex-center-gap-sm u-ml-8">
                                  {getTaskTypeIcon(task.type)} {task.type}
                                </span>
                              </div>
                              {task.notes && <p className="timeline-notes">{task.notes}</p>}
                            </div>
                            <div className="u-flex-center-gap-sm u-margin-t-8">
                              <span
                                className={`status-text ${getToneClass(task.status)} u-cursor-pointer`}
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
                                className="ghost-button u-fs-10-pad-4-8"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleTaskStatusToggle(task.id, task.status);
                                }}
                              >
                                {task.status === 'Completed' ? 'Reopen' : 'Complete'}
                              </button>
                              {task.dueDate && task.status !== 'Completed' && (
                                <span className={`u-ml-auto u-flex-center-gap-4 u-fs-xs${task.dueDate < TODAY ? ' u-text-warning' : ' u-text-muted'}`}>
                                  <IconCalendar />{formatDueDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* 5. Change History */}
              {!isSr && (
                <div className="deal-modal__history">
                  <div className="u-flex-between u-flex-center u-margin-b-12">
                    <h3 className="deal-modal__subheading u-margin-0">Change History</h3>
                    {changeHistoryActions.length > 1 && (
                      <div className="filter-wrap">
                        <select
                          value={changeHistoryFilter}
                          onChange={e => setChangeHistoryFilter(e.target.value)}
                        >
                          <option value="">All actions</option>
                          {changeHistoryActions.filter(Boolean).map(a => (
                            <option key={a} value={a}>{formatAuditAction(a)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className={changeHistoryExpanded ? 'change-history-body change-history-body--expanded' : 'change-history-body'}>
                  <div className="timeline">
                    {filteredAuditLogs.length === 0 ? (
                      <div className="deal-modal__empty-history">No activity logs found for this deal.</div>
                    ) : (
                      filteredAuditLogs.map((log) => (
                        <div key={log.id} className="timeline-item">
                          <div className="timeline-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-time">{formatDateTimePHT(log.changedAt)}</span>
                              <span className="timeline-badge u-fs-10">{formatAuditAction(log.action)}</span>
                            </div>
                            <div className="timeline-body">
                              <p><strong>{log.changedBy || 'System'}</strong> — {formatAuditAction(log.action)}</p>
                              {showAuditValues(log.action) && (log.oldValue || log.newValue) && (
                                <div className="u-fs-xs u-text-muted u-margin-t-4">
                                  <span className="u-text-warning">{String(log.oldValue || 'none')}</span>
                                  <span className="u-margin-h-8">→</span>
                                  <span className="u-text-accent">{String(log.newValue || 'none')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                  {filteredAuditLogs.length > 5 && (
                    <div className="collapse-bar" onClick={() => setChangeHistoryExpanded(e => !e)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: `rotate(${changeHistoryExpanded ? 180 : 0}deg)`, transition: 'transform 0.2s' }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      <span>{changeHistoryExpanded ? 'Show less' : `Show all ${filteredAuditLogs.length} entries`}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Save / Cancel or Stage Updater */}
            <div className="deal-modal__footer">
              {isEditing ? (
                <div className="deal-modal__edit-actions u-flex-gap-sm">
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
                <div className="u-width-full" ref={lostPromptRef}>
                  <p className="deal-modal__footer-label u-margin-b-10">Why was this deal lost?</p>
                  <div className="u-flex-column-gap-sm">
                    <select
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      className="modal-edit-input u-fs-sm"
                    >
                      {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <textarea
                      value={lostNotes}
                      onChange={(e) => setLostNotes(e.target.value)}
                      placeholder="Additional notes (optional)"
                      rows={2}
                      className="modal-edit-input u-fs-sm u-resize-v"
                    />
                    <div className="u-flex-gap-sm">
                      <button type="button" className="primary-button u-flex-1" onClick={confirmLostReason}>Confirm Lost</button>
                      <button type="button" className="secondary-button" onClick={() => setShowLostPrompt(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : canEdit ? (
                <>
                  {recommendedActivity && (
                    <p className="u-fs-sm u-text-muted u-margin-b-8 u-width-full">
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
                <p className="deal-modal__footer-label u-text-center u-width-full u-opacity-06">
                  Read-only — you are not the assigned SR for this deal
                </p>
              )}
            </div>
            </div>{/* end .deal-modal__lower */}

          </div>
        </div>,
        document.body
      )}
    </>
  )
}
