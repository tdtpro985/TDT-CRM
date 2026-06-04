import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatCurrencyFull, formatDateLabel, formatDateTimePHT, formatRelativeDays, getToneClass, getTodayISO, getCurrentMonthISO, matchesSearch, isSrRole, roleAbbr } from '../utils'
import { ITEMS_PER_PAGE, LOST_REASONS, STAGE_COLORS, HEALTH_MAP, DEAL_STAGES } from '../constants'
import { apiFetch } from '../api'
import Pagination from '../components/Pagination'

import { IconPhone, IconCheck, IconCalendar, IconMail, IconClipboard } from '../components/Icons'

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

function getTaskTypeIcon(type) {
  switch (type) {
    case 'Call': return <IconPhone />
    case 'Meeting': return <IconCalendar />
    case 'Email': return <IconMail />
    default: return <IconClipboard />
  }
}

export default function PipelineView({
  deals,
  tasks,
  leads,
  contacts,
  companies,
  activeDeals,
  pipelineValue,
  averageDealSize,
  dealStages,
  stageWorkflow,
  setNotice,
  handleDealStageChange,
  handleDealUpdate,
  handleTaskStatusToggle,
  onViewTasks,
  currentUser,
  activeBranch,
  searchQuery
}) {
  const [stageFilter, setStageFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const isSr = isSrRole(currentUser?.role)

  const companyMap = useMemo(() => {
    const map = Object.fromEntries((companies ?? []).map((c) => [c.id, c]))
    ;(leads ?? []).forEach(l => { if (!map[l.id]) map[l.id] = { id: l.id, name: l.customerName } })
    return map
  }, [companies, leads])
  const contactMap = useMemo(() => Object.fromEntries((contacts  ?? []).map((c) => [c.id, c])), [contacts])
  const leadMap    = useMemo(() => Object.fromEntries((leads     ?? []).map((l) => [l.id, l])), [leads])

  // Reset page on search change (adjusting state during render)
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery)
    setCurrentPage(1)
  }

  const filteredDeals = useMemo(() => deals.filter(
    (d) =>
      (stageFilter === 'all' || d.stage === stageFilter) &&
      matchesSearch(searchQuery, [d.name, companyMap[d.companyId]?.name, contactMap[d.contactId]?.name, d.owner, d.stage]),
  ), [deals, stageFilter, searchQuery, companyMap, contactMap])

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

  // Owners selectable in the SR-Accounts filter — everyone in the manager's
  // visibility scope (SRs + peer managers + self), fetched separately so it
  // never feeds the assignment dropdowns. Empty for non-managers.
  const [filterOwners, setFilterOwners] = useState([])

  // PDF attachments
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([])
  const [changeHistoryExpanded, setChangeHistoryExpanded] = useState(false)

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
      document.body.style.overflow = 'hidden'
    } else {
      setDealContacts([])
      setAuditLogs([])
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
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
          detail="Colored corner strips show deal health at a glance"
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
                  <span>SR Accounts</span>
                  <select
                    value={srFilter}
                    onChange={(e) => { setSrFilter(e.target.value); setCurrentPage(1) }}
                  >
                    <option value="">All reps</option>
                    {srOptions.map((m) => {
                      const tag = (m.role && m.role !== 'Sales Representative' && m.role !== 'Sales Rep') ? ` (${roleAbbr(m.role)})` : ''
                      return <option key={m.id} value={m.id}>{m.name}{tag}</option>
                    })}
                  </select>
                </label>
              )}
                <button
                  type="button"
                  className="secondary-button is-compact"
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
                      <span className="u-fs-xs u-text-muted u-font-700">{formatCurrencyCompact(stageValue)}</span>
                    </div>

                    <div className="pipeline-lane__cards">
                      {stageDeals.length === 0 ? (
                        <div className="pipeline-card pipeline-card--empty">
                          No deals in this stage for the current filter.
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <article
                            key={deal.id}
                            className={`pipeline-card ${getStageTone(deal.stage)}${deal.urgencyLabel === 'Overdue' ? ' is-health-critical' : ''}${deal.urgencyLabel === 'High Priority' ? ' is-health-at-risk' : ''}${deal.urgencyLabel === 'Due Today' ? ' is-health-healthy' : ''}`}
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
                  <strong className="u-fs-md u-text-muted">{formatCurrencyCompact(stage.value)}</strong>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      {selectedDeal && createPortal(
        <div className="deal-modal-overlay" onClick={closeDeal}>
          <div className={`deal-modal ${getStageTone(selectedDeal.stage)}`} onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="deal-modal__header">
              <div>
                <span className="deal-modal__kicker">Deal Details</span>
                <h2>{selectedDeal.name}</h2>
              </div>
              <div className="deal-modal__header-actions">
                <button type="button" className="deal-modal__close" aria-label="Close" onClick={closeDeal}>✕</button>
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

            {/* Body */}
            <div className="modal-body-scroll">
              {/* 1. Transaction Summary (Top) */}
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

              {/* 2. Deal Details (Info Grid) */}
              <div className="deal-modal__grid u-margin-b-24">
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Company</span>
                  <strong className="deal-modal__value">{companyMap[selectedDeal.companyId]?.name ?? selectedDeal.companyId}</strong>
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Deal Value</span>
                  {isEditing ? (
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
                  ) : (
                    <strong className="deal-modal__value u-text-accent">{formatCurrencyFull(selectedDeal.value)}</strong>
                  )}
                </div>

                <div className="deal-modal__field">
                  <span className="deal-modal__label">Probability</span>
                  {isEditing ? (
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
                  ) : (
                    <strong className="deal-modal__value u-text-warning">{selectedDeal.probability}%</strong>
                  )}
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Expected Close</span>
                  {isEditing ? (
                    <div className="field u-margin-0">
                      <input
                        type="date"
                        className="modal-edit-input u-width-date"
                        min={TODAY}
                        value={editCloseDate}
                        onChange={(e) => setEditCloseDate(e.target.value)}
                      />
                    </div>
                  ) : (
                    <strong className="deal-modal__value">{formatDateLabel(selectedDeal.expectedClose) || '—'}</strong>
                  )}
                </div>

                <div className="deal-modal__field u-span-2 u-text-center">
                  <span className="deal-modal__label">Source</span>
                  <strong className="deal-modal__value u-capitalize">{selectedDeal.source || 'Manual'}</strong>
                </div>

                {!isSr && (
                  <div className="deal-modal__field">
                    <span className="deal-modal__label">Contact</span>
                    <strong className="deal-modal__value">{contactMap[selectedDeal.contactId]?.name ?? selectedDeal.contactId}</strong>
                  </div>
                )}

                {/* 3. Company Info (Associated Contacts) */}
                {dealContacts.length > 0 && (
                  <div className="deal-modal__field u-span-2 u-margin-t-8">
                    <span className="deal-modal__label">Associated Contacts</span>
                    <div className="deal-modal__contact-list">
                      {dealContacts.map(c => (
                        <div key={c.id} className="deal-modal__contact-item">
                          <div className="deal-modal__contact-header">
                            <span className="deal-modal__contact-name">{c.name}</span>
                            {(c.phone || c.email) && (
                               <div className="deal-modal__contact-details u-margin-l-auto">
                                 {c.phone && <span title="Phone"><IconPhone /> {c.phone}</span>}
                                 {c.email && <span title="Email">
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                     <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                     <polyline points="22,6 12,13 2,6"/>
                                   </svg>
                                   {c.email}
                                 </span>}
                               </div>
                            )}
                          </div>
                          {c.role && <div className="deal-modal__contact-sub">{c.role}</div>}
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
                <div className="modal-section-divider">
                  <h3 className="deal-modal__subheading">Proposal Documents</h3>
                  {attachments.length > 0 ? (
                    <ul className="deal-modal__attachment-list">
                      {attachments.map((a) => (
                        <li key={a.id} className="deal-modal__attachment-item">
                          <span className="u-fs-sm">{a.label || a.filename}</span>
                          <button
                            type="button"
                            className="ghost-button is-compact"
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
                    <p className="u-text-muted u-fs-sm u-margin-v-8">No documents uploaded yet.</p>
                  )}
                  {canEdit && (
                    <div className="u-margin-t-12">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="u-hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        className="secondary-button u-fs-12"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? 'Uploading…' : 'Upload PDF'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Task History */}
              <div className="deal-modal__history" id="task-history-section">
                <h3 className="deal-modal__subheading">Task History</h3>
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
                            <div className="timeline-header">
                              <span className="timeline-time">{formatDateTimePHT(task.created_at)}</span>
                              <div className="u-flex-center-gap-4">
                                {task.dueDate && task.status !== 'Completed' && (
                                  <span className="timeline-due u-fs-2xs u-text-muted u-margin-r-4">Due: {formatDateTimePHT(task.dueDate)}</span>
                                )}
                                <span className="timeline-badge is-activity u-flex-center-gap-sm">
                                  {getTaskTypeIcon(task.type)} {task.type}
                                </span>
                              </div>
                            </div>
                            <div className="timeline-body">
                              <p><strong>{task.title}</strong></p>
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
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* 5. Change History */}
              <div className="deal-modal__history">
                <h3 className="deal-modal__subheading">Change History</h3>
                <div className={`timeline${changeHistoryExpanded ? ' timeline--expanded' : ''}`}>
                  {auditLogs.length === 0 ? (
                    <div className="deal-modal__empty-history">No activity logs found for this deal.</div>
                  ) : (
                    (changeHistoryExpanded ? auditLogs : auditLogs.slice(0, 5)).map((log) => (
                      <div key={log.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-time">{formatDateTimePHT(log.changedAt)}</span>
                            <span className="timeline-badge u-fs-10">{log.action}</span>
                          </div>
                          <div className="timeline-body">
                            <p><strong>{log.changedBy}</strong> {log.action || 'updated deal'}</p>
                            {(log.oldValue || log.newValue) && (
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
                {auditLogs.length > 5 && (
                  <div className="collapse-bar" onClick={() => setChangeHistoryExpanded(e => !e)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: `rotate(${changeHistoryExpanded ? 180 : 0}deg)`, transition: 'transform 0.2s' }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    <span>{changeHistoryExpanded ? 'Show less' : `Show all ${auditLogs.length} entries`}</span>
                  </div>
                )}
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
                <div className="u-width-full">
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

          </div>
        </div>,
        document.body
      )}
    </>
  )
}
