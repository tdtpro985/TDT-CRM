import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import { formatCurrencyCompact, formatDateLabel, isSrRole } from '../utils'
import { ITEMS_PER_PAGE } from '../constants'

export default function DashboardView({
  topKpis,
  stageSummary,
  pipelineValue,
  leads,
  contacts,
  companies,
  openTasks,
  linkHealth,
  currentUser,
}) {
  const navigate = useNavigate()
  const isSr = isSrRole(currentUser?.role)
  const stageListRef = useRef(null)
  const [visible, setVisible] = useState(false)

  const priorityCounts = {
    High: openTasks.filter(t => t.priority === 'High').length,
    Medium: openTasks.filter(t => t.priority === 'Medium').length,
    Low: openTasks.filter(t => t.priority === 'Low').length,
  }

  useEffect(() => {
    const el = stageListRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const focusTasks = (() => {
    const high = openTasks.filter(t => t.priority === 'High')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    if (high.length > 0) return high.slice(0, 4)

    const medium = openTasks.filter(t => t.priority === 'Medium')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    if (medium.length > 0) return medium.slice(0, 4)

    const low = openTasks.filter(t => t.priority === 'Low')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    return low.slice(0, 4)
  })()

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
            route={kpi.route}
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
          <div ref={stageListRef} className="stage-list">
            {stageSummary.map((stage, i) => (
              <div key={stage.stage} className="stage-row">
                <div className="stage-meta">
                  <div>
                    <strong>{stage.stage}</strong>
                    <span> - {stage.count} deals tracked</span>
                  </div>
                  <span>{formatCurrencyCompact(stage.value)}</span>
                </div>
                {stage.stage !== 'Closed Won' && stage.stage !== 'Closed Lost' && (
                  <div className="stage-track">
                    <div
                      className={`stage-fill${visible ? ' visible' : ''}`}
                      style={{
                        width: `${stage.count > 0
                          ? Math.min(Math.round((stage.count / ITEMS_PER_PAGE) * 100), 100)
                          : 0}%`,
                        animationDelay: visible ? `${i * 0.1}s` : undefined,
                      }}
                    />
                  </div>
                )}

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
          action={
            <div className="priority-indicators">
              <span className="priority-indicator">
                <span className="priority-dot is-high" />
                <span>{priorityCounts.High}</span>
              </span>
              <span className="priority-indicator">
                <span className="priority-dot is-medium" />
                <span>{priorityCounts.Medium}</span>
              </span>
              <span className="priority-indicator">
                <span className="priority-dot is-low" />
                <span>{priorityCounts.Low}</span>
              </span>
            </div>
          }
        >
          <div className="simple-list">
            {focusTasks.map((task) => {
              const priorityClass = `is-priority-${task.priority.toLowerCase()}`
              return (
                <article
                  key={task.id}
                  className={`simple-list__item ${priorityClass} u-border-l-3-transparent u-cursor-pointer`}
                  onClick={() => navigate('/tasks', { state: { highlightTaskId: task.id } })}
                >
                  <div className="u-flex-1 u-min-w-0">
                    <strong className="u-truncate u-block">
                      {task.title}
                    </strong>
                    <p className="u-margin-t-4 u-fs-11 u-text-muted">
                      {!isSr ? `${task.owner} | ` : ''}due {formatDateLabel(task.dueDate)}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>
      </section>
    </>
  )
}
