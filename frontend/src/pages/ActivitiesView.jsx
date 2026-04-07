import React from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import EmptyState from '../components/EmptyState'
import { formatDateLabel, getToneClass } from '../utils'
import { activityStatuses } from '../constants'

export default function ActivitiesView({
  activities, filteredActivities, todayAgenda, 
  activityFilter, setActivityFilter, handleActivityStatusToggle,
  activityForm, handleActivityFormChange, handleCreateActivity,
  deals, salesTeam
}) {
  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Open activities" value={activities.filter(a => a.status !== 'Completed').length.toLocaleString()} meta="Tasks needing immediate attention" accent="alt" />
        <MetricCard label="Scheduled calls" value={activities.filter(a => a.type === 'Call').length.toLocaleString()} meta="Planned outreach sessions" accent="surface" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel kicker="Daily agenda" title="Activity log">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Deal</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td><strong>{activity.subject}</strong></td>
                    <td>{activity.type}</td>
                    <td>{activity.dealName || 'Unassigned'}</td>
                    <td>{formatDateLabel(activity.dueDate)}</td>
                    <td><span className={`tone-pill ${getToneClass(activity.status)}`}>{activity.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="panel-stack">
          <Panel id="activity-form" kicker="Quick log" title="Log an activity">
            <form className="form-grid" onSubmit={handleCreateActivity}>
              <label className="field field--span-2">
                <span>Subject</span>
                <input name="subject" value={activityForm.subject} onChange={handleActivityFormChange} placeholder="Follow-up on pricing..." required />
              </label>
              <label className="field">
                <span>Type</span>
                <select name="type" value={activityForm.type} onChange={handleActivityFormChange}>
                  <option value="Call">Call</option>
                  <option value="Task">Task</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                </select>
              </label>
              <label className="field">
                <span>Deal</span>
                <select name="dealId" value={activityForm.dealId} onChange={handleActivityFormChange} required>
                  <option value="">Select a deal</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Due Date</span>
                <input name="dueDate" type="date" value={activityForm.dueDate} onChange={handleActivityFormChange} required />
              </label>
              <label className="field">
                <span>Owner</span>
                <select name="owner" value={activityForm.owner} onChange={handleActivityFormChange}>
                  <option value="Unassigned">Unassigned</option>
                  {salesTeam.map(rep => <option key={rep.id} value={rep.name}>{rep.name}</option>)}
                </select>
              </label>
              <label className="field field--span-2">
                <span>Notes</span>
                <textarea name="notes" value={activityForm.notes} onChange={handleActivityFormChange} placeholder="Context for the activity..."></textarea>
              </label>
              <button type="submit" className="primary-button field--span-2">Log Activity</button>
            </form>
          </Panel>
        </div>
      </section>
    </>
  )
}
