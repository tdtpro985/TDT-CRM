import { useState } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel } from '../utils'

const CURRENT_MONTH = new Date().toISOString().slice(0, 7)

export default function PipelineView({
  filteredDeals,
  deals,
  teamMembers,
  activeDeals,
  pipelineValue,
  averageDealSize,
  dealStages,
  stageFilter,
  setStageFilter,
  setNotice,
  companyMap,
  dealForm,
  handleDealFormChange,
  handleCreateDeal,
  handleDealStageChange,
  showDealForm,
  setShowDealForm,
}) {
  const [selectedDeal, setSelectedDeal] = useState(null)

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
                      ))
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

          {showDealForm && (
            <Panel
              id="deal-form"
              kicker="Fast entry"
              title="Add a new opportunity"
            >
              <form className="form-grid" onSubmit={(e) => { handleCreateDeal(e); setShowDealForm(false) }}>
                <label className="field field--span-2">
                  <span>Deal name</span>
                  <input name="name" value={dealForm.name} onChange={handleDealFormChange} placeholder="Enter opportunity name" required autoFocus />
                </label>

                <label className="field">
                  <span>Company</span>
                  <input name="companyId" value={dealForm.companyId} onChange={handleDealFormChange} placeholder="Enter company name" />
                </label>

                <label className="field">
                  <span>Contact</span>
                  <input name="contactId" value={dealForm.contactId} onChange={handleDealFormChange} placeholder="Enter contact name" />
                </label>

                <label className="field">
                  <span>Linked lead</span>
                  <input name="leadId" value={dealForm.leadId} onChange={handleDealFormChange} placeholder="Enter linked lead" />
                </label>

                <label className="field">
                  <span>Stage</span>
                  <select name="stage" value={dealForm.stage} onChange={handleDealFormChange}>
                    {dealStages.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>

                <label className="field">
                  <span>Value</span>
                  <input name="value" type="number" min="0" value={dealForm.value} onChange={handleDealFormChange} placeholder="Enter value" required />
                </label>

                <label className="field">
                  <span>Expected close</span>
                  <input name="expectedClose" type="date" value={dealForm.expectedClose} onChange={handleDealFormChange} required />
                </label>

                <label className="field field--span-2">
                  <span>Owner</span>
                  <input name="owner" value={dealForm.owner} onChange={handleDealFormChange} placeholder="Enter owner name" />
                </label>

                <div className="form-actions field--span-2">
                  <button type="submit" className="primary-button">Save deal</button>
                  <button type="button" className="secondary-button" onClick={() => setShowDealForm(false)}>Cancel</button>
                </div>
              </form>
            </Panel>
          )}
        </div>
      </section>

      {selectedDeal && (
        <div className="deal-modal-overlay" onClick={() => setSelectedDeal(null)}>
          <div className="deal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="deal-modal__header">
              <div>
                <span className="deal-modal__kicker">Deal details</span>
                <h2>{selectedDeal.name}</h2>
              </div>
              <button type="button" className="deal-modal__close" onClick={() => setSelectedDeal(null)}>✕</button>
            </div>

            <div className="deal-modal__grid">
              <div className="deal-modal__field">
                <span>Company</span>
                <strong>{companyMap[selectedDeal.companyId]?.name ?? selectedDeal.companyId ?? '—'}</strong>
              </div>
              <div className="deal-modal__field">
                <span>Owner</span>
                <strong>{selectedDeal.owner || '—'}</strong>
              </div>
              <div className="deal-modal__field">
                <span>Stage</span>
                <strong>{selectedDeal.stage}</strong>
              </div>
              <div className="deal-modal__field">
                <span>Probability</span>
                <strong>{selectedDeal.probability}%</strong>
              </div>
              <div className="deal-modal__field">
                <span>Value</span>
                <strong>{formatCurrencyCompact(selectedDeal.value)}</strong>
              </div>
              <div className="deal-modal__field">
                <span>Expected close</span>
                <strong>{formatDateLabel(selectedDeal.expectedClose)}</strong>
              </div>
              {selectedDeal.contactId && (
                <div className="deal-modal__field">
                  <span>Contact</span>
                  <strong>{selectedDeal.contactId}</strong>
                </div>
              )}
              {selectedDeal.leadId && (
                <div className="deal-modal__field">
                  <span>Linked lead</span>
                  <strong>{selectedDeal.leadId}</strong>
                </div>
              )}
            </div>

            <div className="deal-modal__footer">
              <label className="field">
                <span>Update stage</span>
                <select
                  value={selectedDeal.stage}
                  onChange={(e) => {
                    handleDealStageChange(selectedDeal.id, e.target.value)
                    setSelectedDeal((d) => ({ ...d, stage: e.target.value }))
                  }}
                >
                  {dealStages.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
