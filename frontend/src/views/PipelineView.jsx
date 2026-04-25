import { useState } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import Modal from '../components/Modal'
import { formatCurrencyCompact, formatDateLabel } from '../utils'
import DealForm from '../components/forms/DealForm'

const CURRENT_MONTH = new Date().toISOString().slice(0, 7)

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
  setShowDealForm
}) {
  const contactMap = Object.fromEntries((contacts ?? []).map((c) => [c.id, c]))
  const leadMap    = Object.fromEntries((leads    ?? []).map((l) => [l.id, l]))
  const [selectedDeal, setSelectedDeal] = useState(null)
  const [stagePages, setStagePages] = useState({})

  const handlePageChange = (stage, newPage) => {
    setStagePages(prev => ({ ...prev, [stage]: newPage }))
  }
  const closingThisMonth = activeDeals.filter((d) => d.expectedClose?.startsWith(CURRENT_MONTH)).length

  const pipelineStageSummary = dealStages.map((stage) => {
    const stageDeals = filteredDeals.filter((d) => d.stage === stage)
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

      <section className="content-grid content-grid--primary">
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
          <div className="pipeline-board">
            {dealStages.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stage === stage)
              const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)

              const ITEMS_PER_PAGE = 2
              let totalPages = Math.ceil(stageDeals.length / ITEMS_PER_PAGE) || 1
              let currentPage = stagePages[stage] || 1
              if (currentPage > totalPages) currentPage = totalPages
              
              const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
              const paginatedDeals = stageDeals.slice(startIndex, startIndex + ITEMS_PER_PAGE)

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
                      <>
                        {paginatedDeals.map((deal) => (
                          <article key={deal.id} className="pipeline-card">
                            <div className="pipeline-card__top">
                              <strong>{deal.name}</strong>
                              <span className="tone-pill is-warning">{deal.probability}%</span>
                            </div>
                            <p>{companyMap[deal.companyId]?.name ?? deal.companyId} | {deal.owner}</p>
                            <div className="pipeline-card__meta">
                              <span>{formatCurrencyCompact(deal.value)}</span>
                              <span>Close {formatDateLabel(deal.expectedClose)}</span>
                            </div>
                            <div className="field--compact" style={{ textAlign: 'center' }}>
                              <button type="button" className="ghost-button" onClick={() => setSelectedDeal(deal)}>View details</button>
                            </div>
                          </article>
                        ))}
                        {totalPages > 1 && (
                          <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              disabled={currentPage === 1}
                              onClick={() => handlePageChange(stage, Math.max(1, currentPage - 1))}
                            >
                              Prev
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {currentPage} / {totalPages}
                            </span>
                            <button
                              type="button"
                              className="secondary-button"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              disabled={currentPage === totalPages}
                              onClick={() => handlePageChange(stage, Math.min(totalPages, currentPage + 1))}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>

        <div className="panel-stack">
          <Panel
            kicker="Stage totals"
            title="Expected revenue by stage"
            detail="Stage totals make it easier to see where the pipeline is healthy and where follow-through is needed."
          >
            <div className="simple-list">
              {pipelineStageSummary.map((stage) => (
                <article key={stage.stage} className="simple-list__item">
                  <div>
                    <strong>{stage.stage}</strong>
                    <p>{stage.count} deals in this stage</p>
                  </div>
                  <span className="tone-pill is-neutral">{formatCurrencyCompact(stage.value)}</span>
                </article>
              ))}
            </div>
          </Panel>
        </div>
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
                    className={`deal-modal__stage-pip ${s === selectedDeal.stage ? 'is-active' : dealStages.indexOf(s) < dealStages.indexOf(selectedDeal.stage) ? 'is-done' : ''}`}
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
