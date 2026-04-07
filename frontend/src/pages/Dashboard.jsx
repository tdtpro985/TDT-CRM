import React from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, getToneClass } from '../utils'

export default function Dashboard({
  deals, contacts, activities, selectedReports,
  pipelineValue, conversionRate, activeDeals,
  totalPipelineValue, pipelineSummary,
  highPriorityDeals, openActivities, topMetricCards
}) {
  const readinessRows = [
    {
      entity: 'Deals',
      count: deals.length,
      fields: 'name, company, stage, value, owner, closeDate, priority, source',
    },
    {
      entity: 'Contacts',
      count: contacts.length,
      fields: 'name, company, role, email, phone, owner, status, lastTouch',
    },
    {
      entity: 'Activities',
      count: activities.length,
      fields: 'type, subject, owner, dueDate, deal, status, notes',
    },
    {
      entity: 'Reports',
      count: selectedReports.length,
      fields: 'title, goal, forecast, series, schedule, recipients',
    },
  ]

  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="status-badge">Palette aligned to TDT Powersteel CRM</span>
          <p className="hero-text">
            The full sales shell now uses your dark palette and every menu
            item leads to an interactive screen. The mock state is shaped to
            mirror the records you can later store in a database.
          </p>

          <div className="hero-highlights">
            <div className="highlight-pill">
              <span className="highlight-label">Pipeline Value</span>
              <strong>{formatCurrencyCompact(pipelineValue)}</strong>
            </div>
            <div className="highlight-pill">
              <span className="highlight-label">Conversion Rate</span>
              <strong>{conversionRate}%</strong>
            </div>
            <div className="highlight-pill">
              <span className="highlight-label">Active Deals</span>
              <strong>{activeDeals} opportunities</strong>
            </div>
          </div>
        </div>

        <div className="hero-preview">
          <div className="hero-preview__card">
            <p className="sidebar-label">Revenue readiness</p>
            <strong>{formatCurrencyCompact(totalPipelineValue)}</strong>
            <span>
              Total possible gross pipeline value based on all valid active entries.
            </span>
          </div>

          <div className="hero-preview__bands" aria-hidden="true">
            {pipelineSummary.map((stage) => (
              <div
                key={stage.stage}
                className="hero-band"
                style={{ width: `${Math.max(stage.share, 26)}%` }}
              >
                <span>{stage.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Dashboard metrics">
        {topMetricCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            meta={card.meta}
            accent={card.accent}
          />
        ))}
      </section>

      <section className="content-grid content-grid--2">
        <Panel
          kicker="Pipeline health"
          title="Stage mix and current opportunity value"
          detail="Each row reflects the current front-end state, so this list can later be fed directly from the database."
        >
          <div className="stage-list">
            {pipelineSummary.map((stage) => (
              <div key={stage.stage} className="stage-row">
                <div className="stage-meta">
                  <div>
                    <strong>{stage.stage}</strong>
                    <span>{stage.count} deals in this stage</span>
                  </div>
                  <span>{formatCurrencyCompact(stage.value)}</span>
                </div>
                <div className="stage-track">
                  <div
                    className="stage-fill"
                    style={{ width: `${Math.max(stage.share, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          kicker="Database handoff"
          title="Local entities already mapped for backend integration"
          detail="These modules hold clean, structured records so your API or ORM layer can replace the mock arrays with minimal UI refactoring."
        >
          <div className="schema-list">
            {readinessRows.map((row) => (
              <article key={row.entity} className="schema-row">
                <div>
                  <strong>{row.entity}</strong>
                  <p>{row.fields}</p>
                </div>
                <span>{row.count} rows</span>
              </article>
            ))}
          </div>
        </Panel>
      </section>

      <section className="content-grid content-grid--2">
        <Panel
          kicker="Priority focus"
          title="High-value deals that need attention"
          detail="Use this as the handoff list for urgent work each morning."
        >
          <div className="simple-list">
            {highPriorityDeals.map((deal) => (
              <article key={deal.id} className="simple-list__item">
                <div>
                  <strong>{deal.name}</strong>
                  <p>
                    {deal.company} • {deal.owner} • closes{' '}
                    {formatDateLabel(deal.closeDate)}
                  </p>
                </div>
                <span className={`tone-pill ${getToneClass(deal.priority)}`}>
                  {deal.priority}
                </span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          kicker="Today's queue"
          title="Open activities across the sales floor"
          detail="Activities marked complete here update all summaries immediately."
        >
          <div className="simple-list">
            {openActivities.map((activity) => (
              <article key={activity.id} className="simple-list__item">
                <div>
                  <strong>{activity.subject}</strong>
                  <p>
                    {activity.owner} • {activity.deal} • due{' '}
                    {formatDateLabel(activity.dueDate)}
                  </p>
                </div>
                <span className={`tone-pill ${getToneClass(activity.status)}`}>
                  {activity.status}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </>
  )
}
