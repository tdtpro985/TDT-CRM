import { useState, useEffect, useMemo } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'

const API_BASE = 'http://localhost:5000'

const BRANCHES = [
  'Manila', 'Batangas', 'Cavite', 'CDO', 'Cebu', 'Davao',
  'Isabela', 'Iloilo', 'Ilocos', 'Gensan', 'Legazpi',
  'Palawan', 'Powerstore', 'Headquarters',
]

const ROLES = ['Sales Rep', 'Sales Manager', 'Admin']

const EMPTY_FORM = { username: '', password: '', name: '', email: '', role: 'Sales Rep', branch: '' }

export default function AdminView({ currentUser, showToast }) {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch]         = useState('')
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editingId, setEditingId]   = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [formError, setFormError]   = useState('')
  const [saving, setSaving]         = useState(false)

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`)
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const branchCounts = useMemo(() => {
    const counts = {}
    users.forEach((u) => { counts[u.branch] = (counts[u.branch] ?? 0) + 1 })
    return counts
  }, [users])

  const filteredUsers = useMemo(() => users.filter((u) => {
    const matchBranch = branchFilter === 'all' || u.branch === branchFilter
    const q = search.toLowerCase()
    const matchSearch = !q || [u.name, u.username, u.email, u.role, u.branch].some((v) => v?.toLowerCase().includes(q))
    return matchBranch && matchSearch
  }), [users, branchFilter, search])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(user) {
    setEditingId(user.id)
    setForm({ username: user.username, password: '', name: user.name, email: user.email ?? '', role: user.role, branch: user.branch })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError('')
  }

  function handleFormChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setFormError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.username.trim() || !form.branch) {
      setFormError('Name, username, and branch are required.')
      return
    }
    if (!editingId && !form.password.trim()) {
      setFormError('Password is required for new accounts.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const url    = editingId ? `${API_BASE}/api/admin/users/${editingId}` : `${API_BASE}/api/admin/users`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to save.')
        return
      }
      showToast(editingId ? 'Account updated.' : 'Account created.')
      closeForm()
      await loadUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId) {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Account deleted.')
      setDeleteConfirm(null)
      await loadUsers()
    }
  }

  const roleColor = { Admin: 'accent', 'Sales Manager': 'alt', 'Sales Rep': 'surface' }

  return (
    <>
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total Accounts"  value={users.length.toLocaleString()} meta="All user accounts across every branch" accent="accent" />
        <MetricCard label="Branches Active" value={Object.keys(branchCounts).length.toLocaleString()} meta="Branches with at least one user account" accent="surface" />
        <MetricCard label="Admins"          value={(users.filter((u) => u.role === 'Admin').length).toLocaleString()} meta="Accounts with admin-level access" accent="alt" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel kicker="Access control" title="Branch Account Management" detail="Create and manage user accounts for each branch. Admins can set roles, reset passwords, and remove accounts.">

          {/* Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-toolbar__filters">
              <select
                className="admin-select"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">All branches ({users.length})</option>
                {BRANCHES.map((b) => branchCounts[b] ? (
                  <option key={b} value={b}>{b} ({branchCounts[b]})</option>
                ) : null)}
              </select>

              <input
                className="admin-search"
                type="search"
                placeholder="Search name, username, role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="primary-button" onClick={openCreate}>
              + New Account
            </button>
          </div>

          {/* Create / Edit Form */}
          {showForm && (
            <div className="admin-form-wrap">
              <div className="admin-form-header">
                <h3 className="admin-form-title">{editingId ? 'Edit Account' : 'Create New Account'}</h3>
                <button type="button" className="admin-form-close" onClick={closeForm}>✕</button>
              </div>
              <form className="admin-form" onSubmit={handleSave} noValidate>
                <div className="admin-form-grid">
                  <label className="field">
                    <span>Full name</span>
                    <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Juan dela Cruz" />
                  </label>
                  <label className="field">
                    <span>Username</span>
                    <input name="username" value={form.username} onChange={handleFormChange} placeholder="e.g. manila.tdtpowersteel" />
                  </label>
                  <label className="field">
                    <span>{editingId ? 'New password (leave blank to keep)' : 'Password'}</span>
                    <input name="password" type="password" value={form.password} onChange={handleFormChange} placeholder={editingId ? 'Leave blank to keep current' : 'Set a strong password'} />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="user@tdt.com" />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select name="role" value={form.role} onChange={handleFormChange}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span>Branch</span>
                    <select name="branch" value={form.branch} onChange={handleFormChange}>
                      <option value="" disabled>Select branch…</option>
                      {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </label>
                </div>

                {formError && <p className="admin-form-error">{formError}</p>}

                <div className="admin-form-actions">
                  <button type="button" className="secondary-button" onClick={closeForm}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={saving}>
                    {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users Table */}
          {loading ? (
            <p style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading accounts…</p>
          ) : filteredUsers.length === 0 ? (
            <div className="admin-empty">
              <p>No accounts match your filter.</p>
              {search && <button type="button" className="secondary-button" onClick={() => setSearch('')}>Clear search</button>}
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Branch</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={user.id === currentUser?.id ? 'admin-table__row--self' : ''}>
                      <td className="admin-table__name">{user.name}</td>
                      <td className="admin-table__mono">{user.username}</td>
                      <td>{user.branch}</td>
                      <td>
                        <span className={`admin-role-pill admin-role-pill--${roleColor[user.role] ?? 'surface'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="admin-table__muted">{user.email || '—'}</td>
                      <td className="admin-table__actions">
                        <button type="button" className="admin-action-btn" onClick={() => openEdit(user)}>Edit</button>
                        {user.id !== currentUser?.id && (
                          deleteConfirm === user.id ? (
                            <span className="admin-delete-confirm">
                              <span>Sure?</span>
                              <button type="button" className="admin-action-btn admin-action-btn--danger" onClick={() => handleDelete(user.id)}>Yes, delete</button>
                              <button type="button" className="admin-action-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            </span>
                          ) : (
                            <button type="button" className="admin-action-btn admin-action-btn--danger" onClick={() => setDeleteConfirm(user.id)}>Delete</button>
                          )
                        )}
                        {user.id === currentUser?.id && <span className="admin-table__self-tag">You</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Branch breakdown sidebar */}
        <Panel kicker="By branch" title="Account Distribution">
          <div className="admin-branch-list">
            {BRANCHES.filter((b) => branchCounts[b]).map((b) => (
              <button
                key={b}
                type="button"
                className={`admin-branch-row ${branchFilter === b ? 'is-active' : ''}`}
                onClick={() => setBranchFilter(branchFilter === b ? 'all' : b)}
              >
                <span className="admin-branch-row__name">{b}</span>
                <span className="admin-branch-row__count">{branchCounts[b]}</span>
              </button>
            ))}
            {Object.keys(branchCounts).length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', padding: '8px 0' }}>No accounts yet.</p>
            )}
          </div>
        </Panel>
      </section>
    </>
  )
}
