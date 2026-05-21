function SkMetricCard() {
  return (
    <div className="sk-metric-card">
      <div className="sk sk--line-sm" style={{ width: '60%' }} />
      <div className="sk sk--value" style={{ width: '40%', marginTop: 10 }} />
      <div className="sk sk--line-sm" style={{ width: '80%', marginTop: 8 }} />
    </div>
  )
}

function SkMetricsRow({ count = 4 }) {
  return (
    <div className="sk-metrics-row">
      {Array.from({ length: count }, (_, i) => <SkMetricCard key={i} />)}
    </div>
  )
}

function SkLines({ count = 4 }) {
  return (
    <div className="sk-lines">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="sk sk--line" style={{ width: i % 3 === 0 ? '90%' : i % 3 === 1 ? '75%' : '85%' }} />
      ))}
    </div>
  )
}

function SkListRow() {
  return (
    <div className="sk-list-row">
      <div className="sk sk--avatar" />
      <div className="sk-list-row__lines">
        <div className="sk sk--line" style={{ width: '55%' }} />
        <div className="sk sk--line-sm" style={{ width: '35%' }} />
      </div>
    </div>
  )
}

function SkPanel({ lines = 4, children }) {
  return (
    <div className="sk-panel">
      <div className="sk sk--line" style={{ width: '40%', marginBottom: 4 }} />
      <div className="sk sk--line-sm" style={{ width: '25%', marginBottom: 20 }} />
      {children || <SkLines count={lines} />}
    </div>
  )
}

function SkContactCard() {
  return (
    <div className="sk-contact-card">
      <div className="sk sk--line" style={{ width: '65%' }} />
      <div className="sk sk--line-sm" style={{ width: '40%' }} />
    </div>
  )
}

function SkHero() {
  return (
    <div className="sk-hero">
      <div className="sk-hero__left">
        <div className="sk sk--line" style={{ width: '55%' }} />
        <div className="sk sk--line-sm" style={{ width: '80%' }} />
        <div className="sk sk--line-sm" style={{ width: '70%' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div className="sk sk--pill" />
          <div className="sk sk--pill" />
          <div className="sk sk--pill" />
        </div>
      </div>
      <div className="sk-hero__right">
        <div className="sk sk--line-sm" style={{ width: '60%' }} />
        <div className="sk sk--value" style={{ width: '70%', marginTop: 8 }} />
        <div className="sk sk--line-sm" style={{ width: '80%', marginTop: 8 }} />
      </div>
    </div>
  )
}

function SkStageTotals() {
  return (
    <div className="sk-panel">
      <div className="sk sk--line" style={{ width: '45%', marginBottom: 4 }} />
      <div className="sk sk--line-sm" style={{ width: '70%', marginBottom: 16 }} />
      <div className="sk-stage-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="sk-stage-card">
            <div className="sk-stage-card__left">
              <div className="sk sk--line" style={{ width: 90 }} />
              <div className="sk sk--line-sm" style={{ width: 55 }} />
            </div>
            <div className="sk sk--pill" style={{ width: 64 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SkKanbanColumn() {
  return (
    <div className="sk-kanban-col">
      <div className="sk-lane-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="sk sk--line" style={{ width: 90 }} />
          <div className="sk sk--line-sm" style={{ width: 55 }} />
        </div>
        <div className="sk sk--pill" style={{ width: 56 }} />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="sk-kanban-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div className="sk sk--line" style={{ width: '65%' }} />
            <div className="sk sk--pill" style={{ width: 36 }} />
          </div>
          <div className="sk sk--line-sm" style={{ width: '50%', marginTop: 6 }} />
          <div className="sk-divider" />
          <div className="sk sk--pill" style={{ width: 80, marginBottom: 10 }} />
          {Array.from({ length: 3 }, (_, j) => (
            <div key={j} className="sk-info-row">
              <div className="sk sk--line-sm" style={{ width: 40 }} />
              <div className="sk sk--line-sm" style={{ width: 70 }} />
            </div>
          ))}
          <div className="sk sk--btn" />
        </div>
      ))}
    </div>
  )
}

export default function PageSkeleton({ view }) {
  if (view === 'pipeline') {
    return (
      <div className="sk-page">
        <SkMetricsRow count={4} />
        <div className="sk-panel">
          <div className="sk sk--line" style={{ width: '50%', marginBottom: 16 }} />
          <div className="sk-kanban">
            {Array.from({ length: 4 }, (_, i) => <SkKanbanColumn key={i} />)}
          </div>
        </div>
        <SkStageTotals />
      </div>
    )
  }

  if (view === 'database') {
    return (
      <div className="sk-page">
        <SkMetricsRow count={3} />
        <div className="sk-two-col sk-two-col--45-55">
          <SkPanel>
            {Array.from({ length: 7 }, (_, i) => <SkContactCard key={i} />)}
          </SkPanel>
          <SkPanel lines={5} />
        </div>
      </div>
    )
  }

  if (view === 'tasks') {
    return (
      <div className="sk-page">
        <SkMetricsRow count={4} />
        <div className="sk-two-col">
          <SkPanel>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="sk-activity-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div className="sk sk--line" style={{ width: '55%' }} />
                  <div className="sk sk--pill" style={{ width: 60 }} />
                </div>
                <div className="sk sk--line-sm" style={{ width: '70%', marginTop: 6 }} />
                <div className="sk sk--line-sm" style={{ width: '45%', marginTop: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <div className="sk sk--line-sm" style={{ width: 80 }} />
                  <div className="sk sk--btn" style={{ width: 110, height: 26, marginTop: 0 }} />
                </div>
              </div>
            ))}
          </SkPanel>
          <SkPanel lines={6} />
        </div>
      </div>
    )
  }

  if (view === 'dashboard') {
    return (
      <div className="sk-page">
        <SkHero />
        <SkMetricsRow count={5} />
        <div className="sk-two-col">
          <SkPanel lines={5} />
          <SkPanel lines={5} />
        </div>
        <div className="sk-two-col">
          <SkPanel lines={4} />
          <SkPanel lines={4} />
        </div>
      </div>
    )
  }

  // admin, admin/profile, admin/analytics — generic table skeleton
  return (
    <div className="sk-page">
      <SkPanel lines={8} />
    </div>
  )
}
