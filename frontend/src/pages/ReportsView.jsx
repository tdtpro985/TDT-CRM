import React from 'react'
import Panel from '../components/Panel'
import EmptyState from '../components/EmptyState'
import ReportChart from '../components/ReportChart'
import { formatMetricValue } from '../utils'
import { deliveryCadences, deliveryFormats, recipientGroups } from '../constants'

export default function ReportsView({
  filteredReports, selectedReportSet, activeReport, enabledReportsLabel,
  toggleReport, setActiveReportId,
  deliverySettings, handleDeliverySettingsChange, handleSaveDeliverySettings
}) {
  const reportList = filteredReports

  return (
    <section className="content-grid content-grid--primary">
      <Panel
        kicker="Library"
        title="Saved reports"
        detail="Report selection here stays in sync with the Sales Workspace page."
        action={<span className="selection-pill">{enabledReportsLabel}</span>}
      >
        {reportList.length === 0 ? (
          <EmptyState
            title="No reports match this search"
            copy="Clear the search to bring the report library back."
          />
        ) : (
          <div className="report-grid">
            {reportList.map((report) => (
              <article
                key={report.id}
                className={`report-card ${
                  activeReport.id === report.id ? 'is-selected' : ''
                }`}
              >
                <div className="report-card__top">
                  <span className="report-chip">{report.chip}</span>
                  <label className="switch-wrap">
                    <input
                      type="checkbox"
                      checked={selectedReportSet.has(report.id)}
                      onChange={() => toggleReport(report.id)}
                      aria-label={`Toggle ${report.title}`}
                    />
                    <span className="switch-visual" />
                  </label>
                </div>
                <strong>{report.title}</strong>
                <p>{report.description}</p>
                <div className="report-card__footer">
                  <span>{report.change}</span>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setActiveReportId(report.id)}
                  >
                    Preview report
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <div className="panel-stack">
        <Panel
          kicker="Preview"
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
                  <span>Selected set</span>
                  <strong>{enabledReportsLabel}</strong>
                </div>
              </div>

              <ReportChart report={activeReport} />
            </>
          ) : (
            <EmptyState title="No metrics to display" copy="The database returned no active reports for this view." />
          )}
        </Panel>

        <Panel
          id="report-settings"
          kicker="Delivery setup"
          title="Configure report delivery"
          detail="These settings are stored in local state now and are ready to be persisted later."
        >
          <form className="form-grid" onSubmit={handleSaveDeliverySettings}>
            <label className="field">
              <span>Cadence</span>
              <select
                name="cadence"
                value={deliverySettings.cadence}
                onChange={handleDeliverySettingsChange}
              >
                {deliveryCadences.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Format</span>
              <select
                name="format"
                value={deliverySettings.format}
                onChange={handleDeliverySettingsChange}
              >
                {deliveryFormats.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field--span-2">
              <span>Recipients</span>
              <select
                name="recipientGroup"
                value={deliverySettings.recipientGroup}
                onChange={handleDeliverySettingsChange}
              >
                {recipientGroups.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-line field--span-2">
              <input
                type="checkbox"
                name="includeSummary"
                checked={deliverySettings.includeSummary}
                onChange={handleDeliverySettingsChange}
              />
              <span>Include a written executive summary with every delivery</span>
            </label>

            <button type="submit" className="primary-button field--span-2">
              Save delivery settings
            </button>
          </form>
        </Panel>
      </div>
    </section>
  )
}
