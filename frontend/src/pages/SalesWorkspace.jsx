import React from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import ReportChart from '../components/ReportChart'
import { formatMetricValue, formatDateLabel } from '../utils'
export default function SalesWorkspace({
  filteredReports, selectedReportSet, activeReport, enabledReportsLabel,
  topMetricCards, pipelineSummary, openActivities,
  toggleReport, setActiveReportId, salesTeam
}) {
  const reportList = filteredReports

  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="status-badge">Initial guide translated into UI</span>
          <p className="hero-text">
            Each dashboard comes with a set of reports that offer more
            detailed analysis and insights into sales performance. Keep the
            right-side preview focused on what matters and use the toggles to
            decide what appears on the dashboard.
          </p>

          <div className="hero-highlights">
            <div className="highlight-pill">
              <span className="highlight-label">Enabled reports</span>
              <strong>{enabledReportsLabel}</strong>
            </div>
            <div className="highlight-pill">
              <span className="highlight-label">Revenue pacing</span>
              <strong>
                {activeReport && activeReport.goal ? Math.round(
                  (activeReport.forecast / activeReport.goal) * 100,
                ) : 0}
                % of target
              </strong>
            </div>
            <div className="highlight-pill">
              <span className="highlight-label">Workspace style</span>
              <strong>Dark panels with orange highlights</strong>
            </div>
          </div>
        </div>

        <div className="hero-preview">
          <div className="hero-preview__card">
            <p className="sidebar-label">Forecast snapshot</p>
            <strong>{activeReport ? formatMetricValue(activeReport.forecast, 'currency') : '$0'}</strong>
            <span>
              Proposal and negotiation stages still hold the biggest upside
              for the current team.
            </span>
          </div>
          <div className="hero-preview__bands" aria-hidden="true">
            {pipelineSummary.map((stage) => (
              <div
                key={stage.stage}
                className="hero-band"
                style={{ width: `${Math.max(stage.share, 24)}%` }}
              >
                <span>{stage.stage}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Sales workspace metrics">
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
          kicker="Reports library"
          title="Choose your reports"
          detail="Click a report to focus the preview and use the checkbox to include or remove it from the dashboard set."
          action={<span className="selection-pill">{enabledReportsLabel}</span>}
        >
          {reportList.length === 0 ? (
            <EmptyState
              title="No matching reports"
              copy="Try a different search term to see more report options."
            />
          ) : (
            <div className="report-list" role="list">
              {reportList.map((report) => {
                const isSelected = selectedReportSet.has(report.id)
                const isActive = activeReport.id === report.id

                return (
                  <div
                    key={report.id}
                    className={`report-item ${isActive ? 'is-active' : ''} ${
                      !isSelected ? 'is-muted' : ''
                    }`}
                    role="listitem"
                  >
                    <label className="checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleReport(report.id)}
                        aria-label={`Toggle ${report.title}`}
                      />
                      <span className="checkbox-custom" aria-hidden="true" />
                    </label>

                    <button
                      type="button"
                      className="report-content"
                      onClick={() => isSelected && setActiveReportId(report.id)}
                      disabled={!isSelected}
                    >
                      <span className="report-title">{report.title}</span>
                      <span className="report-description">
                        {report.description}
                      </span>
                    </button>

                    <span className="report-chip">{report.chip}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel
          kicker="Live preview"
          title={activeReport?.title ?? 'No report selected'}
          detail={activeReport?.insight ?? 'Add reports to view insights.'}
          action={
            activeReport && (
            <span className="selection-pill selection-pill--warm">
              {activeReport.change}
            </span>
            )
          }
        >
          {activeReport ? (
            <>
              <div className="preview-stats">
                <div className="preview-stat">
                  <span>{activeReport.metricLabel}</span>
                  <strong>
                    {formatMetricValue(
                      activeReport.forecast,
                      activeReport.metricType,
                    )}
                  </strong>
                </div>
                <div className="preview-stat">
                  <span>Goal</span>
                  <strong>
                    {formatMetricValue(activeReport.goal, activeReport.metricType)}
                  </strong>
                </div>
                <div className="preview-stat">
                  <span>Gap to close</span>
                  <strong>
                    {formatMetricValue(
                      Math.max(activeReport.goal - activeReport.forecast, 0),
                      activeReport.metricType,
                    )}
                  </strong>
                </div>
              </div>

              <ReportChart report={activeReport} />
            </>
          ) : (
            <EmptyState title="No metrics to display" copy="The database returned no active reports for this view." />
          )}
        </Panel>
      </section>

      <section className="content-grid content-grid--2">
        <Panel
          kicker="Sales desk"
          title="Rep momentum"
          detail="This section can be wired to performance tables or a leaderboard service later."
        >
          <div className="rep-grid">
            {salesTeam.map((rep) => (
              <article key={rep.id} className="rep-card">
                <strong>{rep.name}</strong>
                <span>{rep.role}</span>
                <p>{rep.focus}</p>
                <p>Close rate: {rep.closeRate}%</p>
                <p>Quota attainment: {rep.quota}%</p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          kicker="Next follow-ups"
          title="Action queue from live activities"
          detail="The queue below updates from the Activities module."
        >
          <div className="task-list">
            {openActivities.map((activity) => (
              <div key={activity.id} className="task-item">
                <span className="task-dot" aria-hidden="true" />
                <p>
                  {activity.subject} • {activity.owner} • due{' '}
                  {formatDateLabel(activity.dueDate)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </>
  )
}
