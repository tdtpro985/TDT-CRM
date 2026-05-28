import { useState, useEffect, useMemo, useRef } from 'react'
import Panel from '../components/Panel'
import MetricCard from '../components/MetricCard'
import Modal from '../components/Modal'
import { apiFetch } from '../api'
import { REGION_BRANCHES, ITEMS_PER_PAGE } from '../constants'
<<<<<<< Updated upstream
import { getPaginatedData } from '../utils'
import { IconSearch } from '../components/Icons'
=======
import { getPaginatedData, isValidEmail } from '../utils'
>>>>>>> Stashed changes

import Pagination from '../components/Pagination'

const ROLES = ['Sales Rep', 'Sales Manager', 'Admin']

const EMPTY_FORM  = { username: '', password: '', name: '', email: '', role: 'Sales Rep', branch: '' }

export default function AdminView({ currentUser, showToast, onLoadingChange }) {
  const BRANCHES = useMemo(() => Object.values(REGION_BRANCHES).flat().sort(), [])
  const PAGE_SIZE = 5
  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [branchFilter, setBranchFilter] = useState('all')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [editingId, setEditingId]     = useState(null)
  const [showForm, setShowForm]       = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [formError, setFormError]     = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving]           = useState(false)
  const [importing, setImporting]     = useState(false)
  const [importResult, setImportResult] = useState(null)
  const importFileRef = useRef(null)

  async function loadUsers() {
    setLoading(true)
    onLoadingChange?.(true)
    try {
      const res = await apiFetch(`/api/admin/users`)
      if (res.ok) setUsers(await res.json())
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const branchCounts = useMemo(() => {
    const counts = {}
    users.forEach((u) => { counts[u.branch] = (counts[u.branch] ?? 0) + 1 })
    return counts
  }, [users])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchBranch = branchFilter === 'all' || u.branch === branchFilter
      const q = search.toLowerCase()
      const matchSearch = !q || [u.name, u.username, u.email, u.role, u.branch].some((v) => v?.toLowerCase().includes(q))
      return matchBranch && matchSearch
    })
  }, [users, branchFilter, search])

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE)

  const pagedUsers = useMemo(() => getPaginatedData(filteredUsers, page, PAGE_SIZE), [filteredUsers, page])


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
    setFieldErrors({})
  }

  function handleFormChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setFormError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    const newFieldErrors = {}
    if (!form.name.trim()) newFieldErrors.name = 'Full name is required'
    if (!form.username.trim()) newFieldErrors.username = 'Username is required'
    if (!editingId && !form.password.trim()) newFieldErrors.password = 'Password is required'
    if (form.email && !isValidEmail(form.email)) newFieldErrors.email = 'Invalid email address'
    if (!form.branch) newFieldErrors.branch = 'Branch is required'
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors)
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const url    = editingId ? `/api/admin/users/${editingId}` : `/api/admin/users`
      const method = editingId ? 'PUT' : 'POST'
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to save.'); return }
      showToast(editingId ? 'Account updated.' : 'Account created.')
      closeForm()
      await loadUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId) {
    const res = await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Account deleted.')
      setDeleteConfirm(null)
      await loadUsers()
    }
  }

  async function handleImportCustomers(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const form = new FormData()
    form.append('file', file)
    setImporting(true)
    try {
      const res  = await apiFetch('/api/admin/import/customers', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Import failed')
      } else {
        setImportResult(data)
      }
    } catch {
      showToast('Import failed — check your file and try again.')
    } finally {
      setImporting(false)
    }
  }

  const roleColor = { Admin: 'accent', 'Sales Manager': 'alt', 'Sales Rep': 'surface' }

  return (
    <>
      {/* Account Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingId ? 'Edit Account' : 'New Account'}
        kicker="Account Management"
      >
        <form className="admin-form" onSubmit={handleSave} noValidate>
          <div className="admin-form-grid">
            <label className="field">
              <span>Full name</span>
              <input name="name" value={form.name} onChange={handleFormChange} placeholder="e.g. Juan dela Cruz" className={fieldErrors.name ? 'u-border-alert' : ''} />
              {fieldErrors.name && <p className="u-fs-10 u-alert u-margin-t-4">{fieldErrors.name}</p>}
            </label>
            <label className="field">
              <span>Username</span>
              <input name="username" value={form.username} onChange={handleFormChange} placeholder="e.g. manila.tdtpowersteel" className={fieldErrors.username ? 'u-border-alert' : ''} />
              {fieldErrors.username && <p className="u-fs-10 u-alert u-margin-t-4">{fieldErrors.username}</p>}
            </label>
            <label className="field">
              <span>{editingId ? 'New password (leave blank to keep)' : 'Password'}</span>
              <input name="password" type="password" value={form.password} onChange={handleFormChange} placeholder={editingId ? 'Leave blank to keep current' : 'Set a strong password'} className={fieldErrors.password ? 'u-border-alert' : ''} />
              {fieldErrors.password && <p className="u-fs-10 u-alert u-margin-t-4">{fieldErrors.password}</p>}
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" value={form.email} onChange={handleFormChange} placeholder="branch@tdt.com" className={fieldErrors.email ? 'u-border-alert' : ''} />
              {fieldErrors.email && <p className="u-fs-10 u-alert u-margin-t-4">{fieldErrors.email}</p>}
            </label>
            <label className="field">
              <span>Role</span>
              <select name="role" value={form.role} onChange={handleFormChange}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Branch</span>
              <select name="branch" value={form.branch} onChange={handleFormChange} className={fieldErrors.branch ? 'u-border-alert' : ''}>
                <option value="" disabled>Select branch…</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {fieldErrors.branch && <p className="u-fs-10 u-alert u-margin-t-4">{fieldErrors.branch}</p>}
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
      </Modal>

      {/* Import Result Modal */}
      <Modal
        isOpen={!!importResult}
        onClose={() => setImportResult(null)}
        title="Import Complete"
        kicker="Excel customer import"
      >
        {importResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span className="admin-role-pill admin-role-pill--positive">{importResult.inserted} inserted</span>
              <span className="admin-role-pill admin-role-pill--surface">{importResult.skipped} skipped (already exist)</span>
            </div>
            {importResult.errors?.length > 0 && (
              <div>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: '6px' }}>Row errors (first 50 shown):</p>
                <ul style={{ fontSize: 'var(--fs-xs)', color: 'var(--alert)', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            <button type="button" className="primary-button" onClick={() => setImportResult(null)}>Done</button>
          </div>
        )}
      </Modal>

      {/* KPI row */}
      <section className="metrics-grid metrics-grid--compact">
        <MetricCard label="Total Accounts"  value={users.length.toLocaleString()} meta="All user accounts across every branch" accent="accent" />
        <MetricCard label="Branches Active" value={Object.keys(branchCounts).length.toLocaleString()} meta="Branches with at least one account" accent="surface" />
        <MetricCard label="Admins"          value={users.filter((u) => u.role === 'Admin').length.toLocaleString()} meta="Accounts with admin-level access" accent="alt" />
      </section>

      <section className="content-grid content-grid--primary">
        <Panel kicker="Access control" title="Branch Accounts">

          {/* Toolbar */}
          <div className="admin-toolbar">
            <div className="admin-toolbar__filters">
              <select className="admin-select" value={branchFilter} onChange={(e) => {
                setBranchFilter(e.target.value)
                setPage(1)
              }}>
                <option value="all">All branches ({users.length})</option>
                {BRANCHES.map((b) => branchCounts[b] ? (
                  <option key={b} value={b}>{b} ({branchCounts[b]})</option>
                ) : null)}
              </select>
              <label className="search-field">
                <span className="search-icon" aria-hidden="true"><IconSearch size={16} /></span>
                <input
                  type="search"
                  placeholder="Search name, username, role…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="ghost-button u-fs-sm u-pad-4-10"
                disabled={importing}
                onClick={() => importFileRef.current?.click()}
              >
                {importing ? 'Importing…' : '↑ Import Excel'}
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImportCustomers}
              />
              <button type="button" className="primary-button" onClick={openCreate}>+ New Account</button>
            </div>
          </div>

          {/* Users Table */}
          {importing ? (
            <div className="u-pad-32 u-text-center u-text-muted">
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Importing Excel file…</p>
              <p style={{ fontSize: 'var(--fs-sm)' }}>This may take a moment. Please wait.</p>
            </div>
          ) : loading ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Username</th><th>Branch</th><th>Role</th><th>Email</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="sk sk--line" style={{ width: '130px' }} /></td>
                      <td><div className="sk sk--line" style={{ width: '110px' }} /></td>
                      <td><div className="sk sk--line" style={{ width: '70px' }} /></td>
                      <td><div className="sk sk--pill" /></td>
                      <td><div className="sk sk--line" style={{ width: '120px' }} /></td>
                      <td><div className="sk sk--line" style={{ width: '55px' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  {pagedUsers.map((user) => (
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
                        {user.id !== currentUser?.id ? (
                          deleteConfirm === user.id ? (
                            <span className="admin-delete-confirm">
                              <span>Sure?</span>
                              <button type="button" className="admin-action-btn admin-action-btn--danger" onClick={() => handleDelete(user.id)}>Yes</button>
                              <button type="button" className="admin-action-btn" onClick={() => setDeleteConfirm(null)}>No</button>
                            </span>
                          ) : (
                            <button type="button" className="admin-action-btn admin-action-btn--danger" onClick={() => setDeleteConfirm(user.id)}>Delete</button>
                          )
                        ) : (
                          <span className="admin-table__self-tag">You</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} prevLabel="Prev" className="analytics-pagination" />
        </Panel>

        {/* Branch breakdown sidebar */}
        <Panel kicker="By branch" title="Account Distribution" detail="Click a branch to filter the table.">
          <div className="admin-branch-list">
            {BRANCHES.filter((b) => branchCounts[b]).map((b) => (
              <button
                key={b}
                type="button"
                className={`admin-branch-row ${branchFilter === b ? 'is-active' : ''}`}
                onClick={() => {
                  setBranchFilter(branchFilter === b ? 'all' : b)
                  setPage(1)
                }}
              >
                <span className="admin-branch-row__name">{b}</span>
                <span className="admin-branch-row__count">{branchCounts[b]}</span>
              </button>
            ))}
            {Object.keys(branchCounts).length === 0 && (
              <p className="admin-empty-text">No accounts yet.</p>
            )}
          </div>
        </Panel>
      </section>
    </>
  )
}
