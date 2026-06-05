function SkMetricCard() {
  return (
    <div className="sk-metric-card">
      <div className="sk sk--line-sm u-w-60" />
      <div className="sk sk--value u-w-40 u-margin-t-10" />
      <div className="sk sk--line-sm u-w-80 u-margin-t-8" />
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
        <div key={i} className={`sk sk--line ${i % 3 === 0 ? 'u-w-90' : i % 3 === 1 ? 'u-w-75' : 'u-w-85'}`} />
      ))}
    </div>
  )
}

function SkListRow() {
  return (
    <div className="sk-list-row">
      <div className="sk sk--avatar" />
      <div className="sk-list-row__lines">
        <div className="sk sk--line u-w-55" />
        <div className="sk sk--line-sm u-w-35" />
      </div>
    </div>
  )
}

function SkPanel({ lines = 4, children }) {
  return (
    <div className="sk-panel">
      <div className="sk sk--line u-w-40 u-margin-b-4" />
      <div className="sk sk--line-sm u-w-25 u-margin-b-20" />
      {children || <SkLines count={lines} />}
    </div>
  )
}

function SkContactCard() {
  return (
    <div className="sk-contact-card">
      <div className="sk sk--line u-w-65" />
      <div className="sk sk--line-sm u-w-40" />
    </div>
  )
}

function SkHero() {
  return (
    <div className="sk-hero">
      <div className="sk-hero__left">
        <div className="sk sk--line u-w-55" />
        <div className="sk sk--line-sm u-w-80" />
        <div className="sk sk--line-sm u-w-70" />
        <div className="u-flex-gap-sm u-margin-t-8">
          <div className="sk sk--pill" />
          <div className="sk sk--pill" />
          <div className="sk sk--pill" />
        </div>
      </div>
      <div className="sk-hero__right">
        <div className="sk sk--line-sm u-w-60" />
        <div className="sk sk--value u-w-70 u-margin-t-8" />
        <div className="sk sk--line-sm u-w-80 u-margin-t-8" />
      </div>
    </div>
  )
}

function SkStageTotals() {
  return (
    <div className="sk-panel">
      <div className="sk sk--line u-w-45 u-margin-b-4" />
      <div className="sk sk--line-sm u-w-70 u-margin-b-16" />
      <div className="sk-stage-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="sk-stage-card">
            <div className="sk-stage-card__left">
              <div className="sk sk--line u-w-90px" />
              <div className="sk sk--line-sm u-w-55px" />
            </div>
            <div className="sk sk--pill u-w-64px" />
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
        <div className="u-flex-column-gap-sm">
          <div className="sk sk--line u-w-90px" />
          <div className="sk sk--line-sm u-w-55px" />
        </div>
        <div className="sk sk--pill u-w-56px" />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="sk-kanban-card">
          <div className="u-flex-between-start-gap-sm">
            <div className="sk sk--line u-w-65" />
            <div className="sk sk--pill u-w-36px" />
          </div>
          <div className="sk sk--line-sm u-w-50 u-margin-t-6" />
          <div className="sk-divider" />
          <div className="sk sk--pill u-w-80px u-margin-b-10" />
          {Array.from({ length: 3 }, (_, j) => (
            <div key={j} className="sk-info-row">
              <div className="sk sk--line-sm u-w-40px" />
              <div className="sk sk--line-sm u-w-70px" />
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
          <div className="sk sk--line u-w-50 u-margin-b-16" />
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
                <div className="u-flex-between-gap-sm">
                  <div className="sk sk--line u-w-55" />
                  <div className="sk sk--pill u-w-60px" />
                </div>
                <div className="sk sk--line-sm u-w-70 u-margin-t-6" />
                <div className="sk sk--line-sm u-w-45 u-margin-t-4" />
                <div className="u-flex-between u-margin-t-10">
                  <div className="sk sk--line-sm u-w-80px" />
                  <div className="sk sk--btn u-w-110px u-h-26px u-margin-t-0" />
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
        <SkMetricsRow count={5} />
        <div className="sk-two-col">
          <SkPanel lines={5} />
          <SkPanel lines={5} />
        </div>
        <div className="sk-two-col">
          <SkPanel lines={4} />
          <SkPanel lines={4} />
        </div>
        <div className="sk-two-col">
          <SkPanel lines={3} />
          <SkPanel lines={3} />
        </div>
        <SkPanel lines={5} />
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
