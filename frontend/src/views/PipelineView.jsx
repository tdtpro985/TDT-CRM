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
}) {
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
                          <label className="field field--compact">
                            <span>Update stage</span>
                            <select
                              value={deal.stage}
                              onChange={(e) => handleDealStageChange(deal.id, e.target.value)}
                            >
                              {dealStages.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </label>
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

          <Panel
            id="deal-form"
            kicker="Fast entry"
            title="Add a new opportunity"
            detail="Simple deal entry keeps pipeline visibility current and easy to maintain."
          >
            <form className="form-grid" onSubmit={handleCreateDeal}>
              <label className="field field--span-2">
                <span>Deal name</span>
                <input name="name" value={dealForm.name} onChange={handleDealFormChange} placeholder="Enter opportunity name" required />
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
                <select name="owner" value={dealForm.owner} onChange={handleDealFormChange}>
                  {teamMembers.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>

              <button type="submit" className="primary-button field--span-2">Save deal</button>
            </form>
          </Panel>
        </div>
      </section>
    </>
  )
}
