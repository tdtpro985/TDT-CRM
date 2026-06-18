import { useState, useEffect, useCallback } from 'react'
import Panel from '../components/Panel'
import { apiFetch } from '../api'
import { REGION_BRANCHES } from '../constants'

const ALL_PERMISSIONS = [
  'deals:read', 'deals:write',
  'contacts:read', 'contacts:write',
  'companies:read', 'companies:write',
]

const EMPTY_FORM = { name: '', permissions: [], scopeType: 'global', branch: '', region: '' }

function formatLastUsed(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AdminApiKeysView({ showToast, onLoadingChange }) {
  const BRANCHES = Object.values(REGION_BRANCHES).flat().sort()
  const REGIONS = Object.keys(REGION_BRANCHES)

  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [newKey, setNewKey] = useState(null)
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [toggling, setToggling] = useState(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    onLoadingChange?.(true)
    try {
      const res = await apiFetch('/api/admin/api-keys')
      if (res.ok) setKeys(await res.json())
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }, [onLoadingChange])

  useEffect(() => { loadKeys() }, [loadKeys])

  function openForm() {
    setForm(EMPTY_FORM)
    setFormError('')
    setNewKey(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setFormError('')
    setNewKey(null)
  }

  function togglePerm(perm) {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm]
    }))
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!form.name.trim()) { setFormError('Key name is required'); return }
    if (form.permissions.length === 0) { setFormError('Select at least one permission'); return }
    setSaving(true)
    setFormError('')
    try {
      const body = {
        name: form.name.trim(),
        permissions: form.permissions,
        branch: form.scopeType === 'branch' ? form.branch : null,
        region: form.scopeType === 'region' ? form.region : null,
      }
      const res = await apiFetch('/api/admin/api-keys', { method: 'POST', body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error || 'Failed to create key'); return }
      setNewKey(data.key)
      await loadKeys()
      setForm(EMPTY_FORM)
    } catch {
      setFormError('Request failed. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(key) {
    setToggling(key.id)
    try {
      const res = await apiFetch(`/api/admin/api-keys/${key.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !key.isActive }),
      })
      if (res.ok) {
        setKeys(ks => ks.map(k => k.id === key.id ? { ...k, isActive: !key.isActive } : k))
        showToast?.(`Key "${key.name}" ${!key.isActive ? 'restored' : 'revoked'}`)
      }
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(key) {
    const res = await apiFetch(`/api/admin/api-keys/${key.id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setKeys(ks => ks.filter(k => k.id !== key.id))
      showToast?.(`Key "${key.name}" deleted`)
    }
    setDeleteConfirm(null)
  }

  async function copyKey(text) {
    try { await navigator.clipboard.writeText(text) } catch { /* fallback: noop */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* One-time key reveal banner */}
      {newKey && (
        <div className="admin-key-reveal" role="alert">
          <p className="u-font-600 u-margin-b-8">Key generated — copy it now. It will not be shown again.</p>
          <div className="admin-key-reveal__row">
            <code className="admin-key-reveal__code">{newKey}</code>
            <button type="button" className="secondary-button u-fs-xs" onClick={() => copyKey(newKey)}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button type="button" className="ghost-button u-fs-xs" onClick={() => setNewKey(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Create form (inline) */}
      {showForm && (
        <Panel kicker="Integration API" title="Generate New API Key">
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
            <label className="field">
              <span>Key name</span>
              <input
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError('') }}
                placeholder="e.g. Partner Integration, Reporting Bot"
              />
            </label>

            <div className="field">
              <span className="u-fs-sm u-font-600 u-block u-margin-b-8">Permissions</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm)}
                      onChange={() => togglePerm(perm)}
                    />
                    {perm}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="u-fs-sm u-font-600 u-block u-margin-b-8">Scope (optional)</span>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                {[['global', 'All data'], ['branch', 'Branch'], ['region', 'Region']].map(([val, label]) => (
                  <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: 'var(--fs-sm)' }}>
                    <input type="radio" name="scopeType" value={val} checked={form.scopeType === val}
                      onChange={() => setForm(f => ({ ...f, scopeType: val, branch: '', region: '' }))} />
                    {label}
                  </label>
                ))}
              </div>
              {form.scopeType === 'branch' && (
                <select className="admin-select" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                  <option value="">Select branch…</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              )}
              {form.scopeType === 'region' && (
                <select className="admin-select" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                  <option value="">Select region…</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}
            </div>

            {formError && <p className="admin-form-error">{formError}</p>}

            <div className="admin-form-actions">
              <button type="button" className="secondary-button" onClick={closeForm}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Generating…' : 'Generate key'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {/* Key list */}
      <Panel
        kicker="Integration API"
        title="API Key Management"
        detail="Keys authenticate external integrations. Each key has scoped permissions and can be revoked at any time."
        action={!showForm && (
          <button type="button" className="primary-button" onClick={openForm}>Generate New Key</button>
        )}
      >
        {loading ? (
          <p className="u-pad-16 u-text-muted u-fs-sm">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="u-pad-16 u-text-muted u-fs-sm">No API keys yet. Generate one to enable external integrations.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Permissions</th>
                  <th>Scope</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {keys.map(key => (
                  <tr key={key.id} style={{ opacity: key.isActive ? 1 : 0.55 }}>
                    <td className="u-font-600">{key.name}</td>
                    <td><code className="u-fs-xs">{key.keyPrefix}…</code></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(key.permissions || []).map(p => (
                          <span key={p} className="admin-role-pill admin-role-pill--surface u-fs-10">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="u-fs-xs u-text-muted">
                      {key.branch || key.region || 'Global'}
                    </td>
                    <td className="u-fs-xs u-text-muted">{formatLastUsed(key.lastUsedAt)}</td>
                    <td>
                      <span className={`admin-role-pill ${key.isActive ? 'admin-role-pill--positive' : 'admin-role-pill--warning'}`}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="ghost-button u-fs-xs"
                          disabled={toggling === key.id}
                          onClick={() => handleToggle(key)}
                        >
                          {toggling === key.id ? '…' : key.isActive ? 'Revoke' : 'Restore'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button u-fs-xs u-alert"
                          onClick={() => setDeleteConfirm(key)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <p className="modal-kicker">Confirm deletion</p>
              <h2 className="modal-title">Delete API key?</h2>
            </div>
            <div className="modal-body">
              <p className="u-fs-sm u-text-muted">
                <strong>{deleteConfirm.name}</strong> (<code>{deleteConfirm.keyPrefix}…</code>) will be permanently deleted.
                Any integration using this key will stop working immediately.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="secondary-button" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button type="button" className="primary-button" style={{ background: 'var(--alert)' }} onClick={() => handleDelete(deleteConfirm)}>
                Delete key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
