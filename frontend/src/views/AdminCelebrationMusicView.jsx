import { useState, useEffect, useRef } from 'react'
import Panel from '../components/Panel'
import { apiFetch } from '../api'

const OUTCOMES = [
  { key: 'won', label: ' Win Sound', icon: '' },
  { key: 'lost', label: ' Lost Sound', icon: '' },
]

export default function AdminCelebrationMusicView({ showToast }) {
  const [entries, setEntries] = useState({ won: null, lost: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({ won: false, lost: false })
  const [urlInput, setUrlInput] = useState({ won: '', lost: '' })
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(null)

  useEffect(() => {
    fetchMusic()
  }, [])

  async function fetchMusic() {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/settings/celebration-music')
      if (res.ok) {
        const data = await res.json()
        const map = { won: null, lost: null }
        data.forEach((e) => { map[e.outcome] = e })
        setEntries(map)
        setUrlInput({
          won: map.won?.url || '',
          lost: map.lost?.url || '',
        })
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
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
    const audio = new Audio(url)
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

  async function handleSave(outcome) {
    const url = urlInput[outcome]
    if (!url.trim()) {
      showToast('Enter a URL or upload a file first.')
      return
    }
    setSaving((s) => ({ ...s, [outcome]: true }))
    try {
      const res = await apiFetch(`/api/admin/settings/celebration-music/${outcome}`, {
        method: 'PUT',
        body: JSON.stringify({ url: url.trim() }),
      })
      if (res.ok) {
        showToast(`${outcome === 'won' ? 'Win' : 'Lost'} sound updated!`)
        await fetchMusic()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to save')
      }
    } catch {
      showToast('Network error')
    } finally {
      setSaving((s) => ({ ...s, [outcome]: false }))
    }
  }

  async function handleDelete(outcome) {
    setSaving((s) => ({ ...s, [outcome]: true }))
    try {
      const res = await apiFetch(`/api/admin/settings/celebration-music/${outcome}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast(`${outcome === 'won' ? 'Win' : 'Lost'} sound cleared.`)
        setUrlInput((u) => ({ ...u, [outcome]: '' }))
        await fetchMusic()
      }
    } catch {
      showToast('Network error')
    } finally {
      setSaving((s) => ({ ...s, [outcome]: false }))
    }
  }

  async function handleFileUpload(outcome, e) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await apiFetch('/api/admin/settings/celebration-music/upload', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        setUrlInput((u) => ({ ...u, [outcome]: data.url }))
        showToast('File uploaded — save to apply.')
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
          <h3 className="profile-info-name">Celebration Music</h3>
          <span className="profile-info-meta">Configure sounds for Closed Won and Closed Lost</span>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="profile-grid">
          {OUTCOMES.map(({ key, label }) => {
            const entry = entries[key]
            const currentUrl = urlInput[key]
            const isPlaying = playing === currentUrl
            return (
              <Panel key={key} kicker={label} title={`Closed ${key === 'won' ? 'Won' : 'Lost'} Sound`}>
                {entry && (
                  <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
                      Current: {entry.original_filename || entry.source_type === 'internal' ? 'Uploaded file' : entry.url.substring(0, 60) + (entry.url.length > 60 ? '...' : '')}
                    </span>
                  </div>
                )}

                <label className="field">
                  <span>Audio URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(paste a direct link or upload below)</span></span>
                  <input
                    type="url"
                    value={urlInput[key]}
                    onChange={(e) => setUrlInput((u) => ({ ...u, [key]: e.target.value }))}
                    placeholder="https://example.com/sound.mp3"
                    style={{ width: '100%' }}
                  />
                </label>

                <label className="field">
                  <span>Or upload an audio file</span>
                  <input
                    type="file"
                    accept=".mp3,.wav,.ogg,.m4a,.aac,.webm,audio/*"
                    onChange={(e) => handleFileUpload(key, e)}
                  />
                </label>

                <div className="profile-form-actions" style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!currentUrl}
                    onClick={() => playPreview(urlInput[key])}
                  >
                    {isPlaying ? ' Stop' : ' Play'}
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={saving[key] || !urlInput[key].trim()}
                    onClick={() => handleSave(key)}
                  >
                    {saving[key] ? 'Saving...' : 'Save'}
                  </button>
                  {entry && (
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={saving[key]}
                      onClick={() => handleDelete(key)}
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </Panel>
            )
          })}
        </div>
      )}
    </div>
  )
}
