import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, getToneClass } from '../utils'

export default function DashboardView({
  topKpis,
  stageSummary,
  pipelineValue,
  leads,
  contacts,
  companies,
  openTasks,
  linkHealth,
}) {
  const focusTasks = [...openTasks]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4)

  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="hero-text">
            TDT Powersteel CRM is a HubSpot-inspired in-house prototype designed to track
            leads, deals, and sales activities efficiently while making the pipeline easy to
            understand and the data easy to trust.
          </p>
          <div className="hero-highlights">
            <div className="highlight-pill">
              <span className="highlight-label">Purpose</span>
              <strong>Track leads, deals, and sales activity efficiently</strong>
            </div>
            <div className="highlight-pill">
              <span className="highlight-label">Decision support</span>
              <strong>See pipeline clearly and improve follow-ups</strong>
            </div>
            <div className="highlight-pill">
              <span className="highlight-label">Focused scope</span>
              <strong>Database, pipeline, tasks, and 5 KPI dashboard</strong>
            </div>
          </div>
        </div>

        <div className="hero-preview">
          <div className="hero-preview__card">
            <p className="sidebar-label">Current pipeline value</p>
            <strong>{formatCurrencyCompact(pipelineValue)}</strong>
            <span>
              Active opportunities are spread across new, qualified, proposal, and negotiation
              stages with a clean expected-revenue view.
            </span>
          </div>
          <div className="hero-preview__bands">
            <div className="hero-band"><span>Customer Database</span></div>
            <div className="hero-band"><span>Deal Pipeline Visualization</span></div>
            <div className="hero-band"><span>Task Tracking</span></div>
            <div className="hero-band"><span>Dashboard with 5 KPIs</span></div>
          </div>
        </div>
      </section>

      <section className="metrics-grid metrics-grid--five" aria-label="Core KPIs">
        {topKpis.map((kpi) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            meta={kpi.meta}
            accent={kpi.accent}
          />
        ))}
      </section>

      <section className="content-grid content-grid--2">
        <Panel
          kicker="Core principles"
          title="The prototype is centered on what matters first"
          detail="These principles guide the front-end structure and later database design."
        >
          <div className="principles-grid">
            <article className="principle-card">
              <strong>Clean Data</strong>
              <p>One record per lead, contact, and company with clear links.</p>
            </article>
            <article className="principle-card">
              <strong>Pipeline Visibility</strong>
              <p>Every deal stage shows count, expected revenue, and ownership.</p>
            </article>
            <article className="principle-card">
              <strong>Activity Tracking</strong>
              <p>Calls, follow-ups, and tasks are easy to log and update.</p>
            </article>
            <article className="principle-card">
              <strong>5 KPI Dashboard</strong>
              <p>New leads, active deals, deals per stage, conversion rate, and pipeline value.</p>
            </article>
            <article className="principle-card">
              <strong>Ease of Use</strong>
              <p>Simple layout, fast entry forms, and minimal friction for reps.</p>
            </article>
          </div>
        </Panel>

        <Panel
          kicker="Pipeline snapshot"
          title="Deals by stage with expected revenue"
          detail="This keeps opportunity movement visible without leaving the dashboard."
        >
          <div className="stage-list">
            {stageSummary.map((stage) => (
              <div key={stage.stage} className="stage-row">
                <div className="stage-meta">
                  <div>
                    <strong>{stage.stage}</strong>
                    <span>{stage.count} deals tracked</span>
                  </div>
                  <span>{formatCurrencyCompact(stage.value)}</span>
                </div>
                <div className="stage-track">
                  <div
                    className="stage-fill"
                    style={{
                      width: `${Math.max(
                        stage.value
                          ? Math.round((stage.value / Math.max(pipelineValue, 1)) * 100)
                          : stage.count * 12,
                        10,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="content-grid content-grid--2">
        <Panel
          kicker="Customer database"
          title="Linked record health"
          detail="Clean links make follow-ups, ownership, and reporting much more reliable."
        >
          <div className="simple-list">
            <article className="simple-list__item">
              <div>
                <strong>{leads.length} leads</strong>
                <p>Lead records ready for qualification tracking</p>
              </div>
              <span className="tone-pill is-warning">{linkHealth}% linked</span>
            </article>
            <article className="simple-list__item">
              <div>
                <strong>{contacts.length} contacts</strong>
                <p>Decision makers and buying contacts tied to companies</p>
              </div>
              <span className="tone-pill is-neutral">Directory</span>
            </article>
            <article className="simple-list__item">
              <div>
                <strong>{companies.length} companies</strong>
                <p>Accounts organized with owners and status</p>
              </div>
              <span className="tone-pill is-positive">Clean structure</span>
            </article>
          </div>
        </Panel>

        <Panel
          kicker="Task focus"
          title="Priority follow-ups"
          detail="Open work is visible from the dashboard so reps always know what is next."
        >
          <div className="simple-list">
            {focusTasks.map((task) => (
              <article key={task.id} className="simple-list__item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.owner} | due {formatDateLabel(task.dueDate)}</p>
                </div>
                <span className={`tone-pill ${getToneClass(task.priority)}`}>
                  {task.priority}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </>
  )
}
