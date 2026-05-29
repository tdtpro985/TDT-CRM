import { useState, useEffect, useRef } from 'react'
import Panel from '../components/Panel'
import { apiFetch, API_BASE } from '../api'

const OUTCOMES = [
  { key: 'won', label: ' Win Sound', icon: '' },
  { key: 'lost', label: ' Lost Sound', icon: '' },
]

export default function AdminCelebrationMusicView({ showToast }) {
  const [entries, setEntries] = useState({ won: [], lost: [] })
  const [loading, setLoading] = useState(true)
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
          <h3 className="profile-info-name">Celebration Music</h3>
          <span className="profile-info-meta">Configure sounds for Closed Won and Closed Lost. Upload up to 4 sounds per outcome — a random one plays when a deal closes.</span>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="profile-grid">
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
