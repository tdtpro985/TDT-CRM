import { useState } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import Modal from '../components/Modal'
import { formatCurrencyCompact, formatDateLabel, formatRelativeDays } from '../utils'
import DealForm from '../components/forms/DealForm'
import { ITEMS_PER_PAGE } from '../constants'

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

function getStagePipState(stage, selectedStage) {
  if (stage === selectedStage) return 'is-active'
  if (selectedStage === 'Closed Lost') {
    return stage === 'Closed Won' ? '' : DEAL_STAGE_ORDER.indexOf(stage) < DEAL_STAGE_ORDER.indexOf(selectedStage) ? 'is-done' : ''
  }
  if (selectedStage === 'Closed Won') {
    return DEAL_STAGE_ORDER.indexOf(stage) < DEAL_STAGE_ORDER.indexOf(selectedStage) ? 'is-done' : ''
  }
  return DEAL_STAGE_ORDER.indexOf(stage) < DEAL_STAGE_ORDER.indexOf(selectedStage) ? 'is-done' : ''
}

export default function PipelineView({
  filteredDeals,
  deals,
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
  onCreateDeal,
  handleDealStageChange,
  showDealForm,
  setShowDealForm,
  currentPage,
  setCurrentPage
}) {
  const contactMap = Object.fromEntries((contacts ?? []).map((c) => [c.id, c]))
  const leadMap    = Object.fromEntries((leads    ?? []).map((l) => [l.id, l]))
  const [selectedDeal, setSelectedDeal] = useState(null)

  const totalPages = Math.ceil(filteredDeals.length / ITEMS_PER_PAGE)
  
  const getPaginatedData = (data, page, limit) => {
    const pageNum = page === '' || isNaN(page) ? 1 : parseInt(page, 20)
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
          detail="This board is designed for quick visibility, simple updates, and a cleaner handoff to a future backend."
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
                          <article key={deal.id} className={`pipeline-card ${getStageTone(deal.stage)}`}>
                            <div className="pipeline-card__top">
                              <strong>{deal.name}</strong>
                              <span className="tone-pill is-warning">{deal.probability}%</span>
                            </div>
                            <div className="pipeline-card__badges">
                              {deal.urgencyLabel === 'Overdue' ? (
                                <span className="tone-pill is-alert">Overdue</span>
                              ) : null}
                              {deal.urgencyLabel === 'High Priority' ? (
                                <span className="tone-pill is-warning">High</span>
                              ) : null}
                              {deal.urgencyLabel === 'Due Today' ? (
                                <span className="tone-pill is-warning">Today</span>
                              ) : null}
                            </div>
                            <p>{companyMap[deal.companyId]?.name ?? deal.companyId}</p>
                            <p className="pipeline-card__owner">{deal.owner}</p>
                            <div className="pipeline-card__meta">
                              <span>{formatCurrencyCompact(deal.value)}</span>
                              <span>{formatDateLabel(deal.expectedClose)}</span>
                            </div>
                            <p className="pipeline-card__touch">
                              Last touch {formatRelativeDays(deal.lastTouch) || '—'}
                            </p>
                            <div className="field--compact" style={{ textAlign: 'center', marginTop: '8px' }}>
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
                    const num = parseInt(val, 20);
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

      <Modal
        isOpen={showDealForm}
        onClose={() => setShowDealForm(false)}
        title="Add a new opportunity"
        kicker="Fast entry"
      >
        <DealForm
          companies={Object.values(companyMap)}
          contacts={[]}
          teamMembers={teamMembers}
          dealStages={dealStages}
          onCancel={() => setShowDealForm(false)}
          onSubmit={(form) => {
            onCreateDeal(form)
            setShowDealForm(false)
          }}
        />
      </Modal>

      {selectedDeal && (
        <div className="deal-modal-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="deal-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="deal-modal__header">
              <div>
                <span className="deal-modal__kicker">Deal Details</span>
                <h2>{selectedDeal.name}</h2>
              </div>
              <button type="button" className="deal-modal__close" aria-label="Close" onClick={() => setSelectedDeal(null)}>✕</button>
            </div>

            {/* ── Body ── */}
            <div className="modal-body-scroll">

              {/* Stage progress bar */}
              <div className="deal-modal__stage-track">
                {dealStages.map((s) => (
                  <div
                    key={s}
                    data-stage={s}
                    className={`deal-modal__stage-pip ${getStagePipState(s, selectedDeal.stage)}`}
                  >
                    <span>{s}</span>
                  </div>
                ))}
              </div>

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
                  <strong className="deal-modal__value deal-modal__value--accent">{formatCurrencyCompact(selectedDeal.value)}</strong>
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Probability</span>
                  <strong className="deal-modal__value">
                    <span className="tone-pill is-warning">{selectedDeal.probability}%</span>
                  </strong>
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Expected Close</span>
                  <strong className="deal-modal__value">{formatDateLabel(selectedDeal.expectedClose) || '—'}</strong>
                </div>
                <div className="deal-modal__field">
                  <span className="deal-modal__label">Stage</span>
                  <strong className="deal-modal__value">{selectedDeal.stage}</strong>
                </div>
                {selectedDeal.contactId && (
                  <div className="deal-modal__field">
                    <span className="deal-modal__label">Contact</span>
                    <strong className="deal-modal__value">{contactMap[selectedDeal.contactId]?.name ?? selectedDeal.contactId}</strong>
                  </div>
                )}
                {selectedDeal.leadId && (
                  <div className="deal-modal__field">
                    <span className="deal-modal__label">Linked Lead</span>
                    <strong className="deal-modal__value">{leadMap[selectedDeal.leadId]?.customerName ?? selectedDeal.leadId}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer: Stage Updater ── */}
            <div className="deal-modal__footer">
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
            </div>

          </div>
        </div>
      )}
    </>
  )
}
