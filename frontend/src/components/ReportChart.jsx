import { formatMetricValue } from '../utils'

export default function ReportChart({ report }) {
  const previewMax = Math.max(...report.series.map((point) => point.value), 1)

  return (
    <div className="chart-frame">
      {report.series.map((point) => (
        <div key={point.label} className="chart-column">
          <span className="chart-value">
            {formatMetricValue(point.value, report.metricType)}
          </span>
          <div className="chart-track">
            <div
              className="chart-fill"
              style={{
                height: `${Math.max((point.value / previewMax) * 100, 14)}%`,
              }}
            />
          </div>
          <span className="chart-label">{point.label}</span>
        </div>
      ))}
    </div>
  )
}
