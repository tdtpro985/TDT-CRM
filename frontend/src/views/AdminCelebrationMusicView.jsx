import { useState, useEffect, useRef } from 'react'
import Panel from '../components/Panel'
import { apiFetch, API_BASE } from '../api'

const OUTCOMES = [
  { key: 'won', label: ' Win Sound', icon: '' },
  { key: 'lost', label: ' Lost Sound', icon: '' },
]

const WON_ANIMATION_OPTIONS = [
  { value: 'confetti', label: 'Confetti' },
  { value: 'victory', label: 'Pipeline Secured' },
  { value: 'none', label: 'None' },
]

const LOST_ANIMATION_OPTIONS = [
  { value: 'jojo', label: 'To Be Continued' },
  { value: 'none', label: 'None' },
]

export default function AdminCelebrationMusicView({ showToast }) {
  const [entries, setEntries] = useState({ won: [], lost: [] })
  const [loading, setLoading] = useState(true)
  const [urlInput, setUrlInput] = useState({ won: '', lost: '' })
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(null)

  // Animation settings
  const [animation, setAnimation] = useState({ won: 'confetti', lost: 'none' })
  const [animLoading, setAnimLoading] = useState(true)
  const [animSaving, setAnimSaving] = useState(false)

  useEffect(() => {
    fetchMusic()
    fetchAnimation()
  }, [])

  async function fetchMusic() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/settings/celebration-music')
      if (res.ok) {
        const data = await res.json()
        const grouped = { won: [], lost: [] }
        data.forEach((e) => {
          if (grouped[e.outcome]) grouped[e.outcome].push(e)
        })
        setEntries(grouped)
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }

  async function fetchAnimation() {
    setAnimLoading(true)
    try {
      const res = await apiFetch('/api/admin/settings/celebration-animation')
      if (res.ok) {
        const data = await res.json()
        setAnimation({ won: data.won ?? 'confetti', lost: data.lost ?? 'confetti' })
      }
    } catch {
      // silent fail
    } finally {
      setAnimLoading(false)
    }
  }

  async function saveAnimation(outcome, value) {
    setAnimSaving(true)
    try {
      const res = await apiFetch('/api/admin/settings/celebration-animation', {
        method: 'PUT',
        body: JSON.stringify({ [outcome]: value }),
      })
      if (res.ok) {
        setAnimation((a) => ({ ...a, [outcome]: value }))
        showToast('Animation style saved!')
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to save animation')
      }
    } catch {
      showToast('Network error')
    } finally {
      setAnimSaving(false)
    }
  }

  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(null)
  }

  function playPreview(url) {
    stopPlayback()
    if (!url) return
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
    const audio = new Audio(fullUrl)
    audioRef.current = audio
    setPlaying(url)
    audio.play().catch(() => {
      setPlaying(null)
    })
    audio.addEventListener('ended', () => {
      if (audioRef.current === audio) {
        setPlaying(null)
        audioRef.current = null
      }
    })
  }

  async function handleAddUrl(outcome) {
    const url = urlInput[outcome].trim()
    if (!url) {
      showToast('Enter a URL first.')
      return
    }
    try {
      const res = await apiFetch(`/api/admin/settings/celebration-music/${outcome}`, {
        method: 'POST',
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        showToast('URL added!')
        setUrlInput((u) => ({ ...u, [outcome]: '' }))
        await fetchMusic()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to add URL')
      }
    } catch {
      showToast('Network error')
    }
  }

  async function handleDelete(entryId) {
    try {
      const res = await apiFetch(`/api/admin/settings/celebration-music/entry/${entryId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Sound removed.')
        await fetchMusic()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to delete')
      }
    } catch {
      showToast('Network error')
    }
  }

  async function handleFileUpload(outcome, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('outcome', outcome)
    try {
      const res = await apiFetch('/api/admin/settings/celebration-music/upload', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        showToast('Sound uploaded and saved!')
        await fetchMusic()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Upload failed')
      }
    } catch {
      showToast('Upload failed')
    }
    e.target.value = ''
  }

  return (
    <div className="celebration-music-admin">
      <div className="profile-info-card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="profile-avatar">
          <span role="img" aria-label="music">♪</span>
        </div>
        <div className="profile-info-text">
          <h3 className="profile-info-name">Celebration Settings</h3>
          <span className="profile-info-meta">Configure sounds and animations for Closed Won and Closed Lost. Upload up to 4 sounds per outcome — a random one plays when a deal closes.</span>
        </div>
      </div>

      {/* ── Animation Style ──────────────────────────────────────────────── */}
      <Panel className="panel--content-height" kicker="Visual effects" title="Celebration Animation">
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
          Choose what animation plays when a deal closes. You can set a different style for wins and losses.
        </p>
        {animLoading ? (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <div className="profile-grid">
            {[
              { key: 'won', label: 'Closed Won Animation', options: WON_ANIMATION_OPTIONS },
              { key: 'lost', label: 'Closed Lost Animation', options: LOST_ANIMATION_OPTIONS },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <span style={{
                  display: 'block',
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-sm)',
                }}>
                  {label}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {options.map((opt) => {
                    const isActive = animation[key] === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={animSaving}
                        onClick={() => saveAnimation(key, opt.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--space-sm)',
                          padding: 'var(--space-sm) var(--space-md)',
                          background: isActive ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                          border: isActive
                            ? '1.5px solid var(--accent)'
                            : '1.5px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: animSaving ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          transition: 'border-color 0.15s, background 0.15s',
                          width: '100%',
                        }}
                      >
                        <span style={{
                          fontSize: 'var(--fs-sm)',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--accent)' : 'var(--text)',
                        }}>
                          {opt.label}
                        </span>
                        {isActive && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: 'var(--fs-xs)',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            flexShrink: 0,
                            alignSelf: 'center',
                          }}>
                            ✓ Active
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div style={{ marginTop: 'var(--space-xl)' }} />

      {/* ── Sounds ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {OUTCOMES.map(({ key, label }) => {
            const outcomeEntries = entries[key] || []
            const isPlaying = (url) => playing === url
            return (
              <Panel key={key} kicker={label} title={`Closed ${key === 'won' ? 'Won' : 'Lost'} Sound`}>
                {/* Saved sounds list */}
                {outcomeEntries.length > 0 && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-xs)' }}>
                      Saved sounds ({outcomeEntries.length})
                    </span>
                    {outcomeEntries.map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                          padding: 'var(--space-xs) var(--space-sm)',
                          marginBottom: 'var(--space-xs)',
                          background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.original_filename || entry.url.substring(0, 50) + (entry.url.length > 50 ? '...' : '')}
                        </span>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: '2px 10px', fontSize: 'var(--fs-sm)' }}
                          disabled={!entry.url}
                          onClick={() => isPlaying(entry.url) ? stopPlayback() : playPreview(entry.url)}
                        >
                          {isPlaying(entry.url) ? ' Stop' : ' Play'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          style={{ padding: '2px 10px', fontSize: 'var(--fs-sm)', color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(entry.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload new file */}
                <label className="field">
                  <span>Upload audio file <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(auto-saved)</span></span>
                  <input
                    type="file"
                    accept=".mp3,.wav,.ogg,.m4a,.aac,.webm,audio/*"
                    onChange={(e) => handleFileUpload(key, e)}
                  />
                </label>

                {/* Or paste URL */}
                <label className="field">
                  <span>Or paste a URL</span>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input
                      type="url"
                      value={urlInput[key]}
                      onChange={(e) => setUrlInput((u) => ({ ...u, [key]: e.target.value }))}
                      placeholder="https://example.com/sound.mp3"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!urlInput[key].trim()}
                      onClick={() => handleAddUrl(key)}
                    >
                      Add
                    </button>
                  </div>
                </label>
              </Panel>
            )
          })}
        </div>
        )}
    </div>
  )
}
