import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrencyCompact } from '../utils'
import '../styles/victory-splash.css'
import hereComesTheMoneyMp3 from '../assets/sounds/here-comes-the-money.mp3'

// ─── Phase 1 sub-components ──────────────────────────────────────────────────
// Each receives only { profilePicUrl, userInitials } and renders purely via CSS.

function NeonHook({ profilePicUrl, userInitials }) {
  return (
    <>
      <svg className="neon-slash neon-slash--top" viewBox="0 0 100 50"
           preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0 L100 0 L100 42 L0 50 Z" className="neon-slash__path" />
      </svg>
      <svg className="neon-slash neon-slash--bottom" viewBox="0 0 100 50"
           preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 8 L100 0 L100 50 L0 50 Z" className="neon-slash__path" />
      </svg>

      <div className="hud-target">
        <div className="hud-corner hud-corner--tl" />
        <div className="hud-corner hud-corner--tr" />
        <div className="hud-corner hud-corner--bl" />
        <div className="hud-corner hud-corner--br" />
        <div className="hud-crosshair hud-crosshair--h" />
        <div className="hud-crosshair hud-crosshair--v" />
        <div className="hud-scan-ring" />
        <div className="hud-avatar">
          {profilePicUrl
            ? <img src={profilePicUrl} alt="" className="hud-avatar__img" />
            : <span className="hud-avatar__initials">{userInitials}</span>}
        </div>
      </div>
    </>
  )
}

function DarkHook({ profilePicUrl, userInitials }) {
  return (
    <>
      <div className="press-banner press-banner--top" aria-hidden="true" />
      <div className="press-banner press-banner--bottom" aria-hidden="true" />
      <div className="press-center">
        <div className="press-rim">
          {profilePicUrl
            ? <img src={profilePicUrl} alt="" className="press-rim__img" />
            : <span className="press-rim__initials">{userInitials}</span>}
        </div>
      </div>
    </>
  )
}

function LightHook({ profilePicUrl, userInitials }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 - 90) * (Math.PI / 180)
    return {
      x1: 60 + 50 * Math.cos(angle),
      y1: 60 + 50 * Math.sin(angle),
      x2: 60 + 58 * Math.cos(angle),
      y2: 60 + 58 * Math.sin(angle),
    }
  })

  return (
    <>
      <div className="gate-panel gate-panel--left"  aria-hidden="true" />
      <div className="gate-panel gate-panel--right" aria-hidden="true" />
      <div className="draft-center">
        <svg className="draft-lattice" viewBox="0 0 200 120"
             xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <line x1="10"  y1="60"  x2="190" y2="60"  className="draft-line draft-line--1" />
          <line x1="10"  y1="10"  x2="10"  y2="110" className="draft-line draft-line--2" />
          <line x1="190" y1="10"  x2="190" y2="110" className="draft-line draft-line--3" />
          <line x1="10"  y1="10"  x2="190" y2="10"  className="draft-line draft-line--4" />
          <line x1="10"  y1="110" x2="190" y2="110" className="draft-line draft-line--5" />
          <line x1="10"  y1="10"  x2="100" y2="60"  className="draft-line draft-line--6" />
          <line x1="100" y1="60"  x2="190" y2="10"  className="draft-line draft-line--7" />
          <line x1="10"  y1="110" x2="100" y2="60"  className="draft-line draft-line--8" />
          <line x1="100" y1="60"  x2="190" y2="110" className="draft-line draft-line--9" />
        </svg>
        <div className="draft-stamp">
          {profilePicUrl
            ? <img src={profilePicUrl} alt="" className="draft-stamp__img" />
            : <span className="draft-stamp__initials">{userInitials}</span>}
          <svg className="draft-stamp__ticks" viewBox="0 0 120 120"
               xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {ticks.map((t, i) => (
              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} className="draft-tick" />
            ))}
          </svg>
        </div>
      </div>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * VictorySplash — "Here Comes the Money" full-viewport celebration overlay.
 *
 * Stage machine:
 *   money-hook (0ms) → exiting (5350ms) → money-drop (5500ms) → outro (audio.onended) → [unmount]
 *
 * Phase 1 visual branches on `theme` prop ('dark' | 'light' | 'neon').
 * All animation timings are anchored to the song structure — see Audio Map in plan.
 */
export default function VictorySplash({ dealName, dealValue, companyName, profilePicUrl, userInitials, theme = 'dark', onDismiss }) {
  const [stage, setStage] = useState('money-hook')
  const timers = useRef([])
  const audioRef = useRef(null)
  const dismissed = useRef(false)

  const cleanup = useCallback(() => {
    if (dismissed.current) return
    dismissed.current = true
    timers.current.forEach(t => clearTimeout(t))
    timers.current = []
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch { /* noop */ }
      audioRef.current = null
    }
    onDismiss?.()
  }, [onDismiss])

  // Audio + timeline boot
  useEffect(() => {
    const audio = new Audio(hereComesTheMoneyMp3)
    audioRef.current = audio
    audio.play().catch(() => {})

    // Exit 150ms before beat drop
    timers.current.push(setTimeout(() => setStage('exiting'), 5350))
    // Beat drop — "HERE COMES THE MONEY" shout at ~5.5s
    timers.current.push(setTimeout(() => setStage('money-drop'), 5500))
    audio.onended = () => setStage('outro')

    return cleanup // route-unmount guard
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Outro → unmount after CSS fade
  useEffect(() => {
    if (stage === 'outro') {
      timers.current.push(setTimeout(cleanup, 800))
    }
  }, [stage, cleanup])

  // ESC kill-switch
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') cleanup() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cleanup])

  const accountLabel = companyName || dealName
  const isHookVisible = stage === 'money-hook' || stage === 'exiting'

  return (
    <div
      className={`victory-splash stage-${stage}`}
      onClick={cleanup}
      role="dialog"
      aria-modal="true"
      aria-label="Deal Secured celebration"
    >
      <div className="victory-splash__esc">[ Esc to skip ]</div>

      {/* Phase 1 — Theme-specific intro animation */}
      {isHookVisible && (
        <div className={`money-hook money-hook--${theme}${stage === 'exiting' ? ' is-exiting' : ''}`}>
          {theme === 'neon'  && <NeonHook  profilePicUrl={profilePicUrl} userInitials={userInitials} />}
          {theme === 'dark'  && <DarkHook  profilePicUrl={profilePicUrl} userInitials={userInitials} />}
          {theme === 'light' && <LightHook profilePicUrl={profilePicUrl} userInitials={userInitials} />}
          {/* Fallback for any unknown theme value */}
          {theme !== 'neon' && theme !== 'dark' && theme !== 'light' &&
            <DarkHook profilePicUrl={profilePicUrl} userInitials={userInitials} />}
        </div>
      )}

      {/* Phase 2 — ₱ glyph rain + data splash (all themes) */}
      {(stage === 'money-drop' || stage === 'outro') && (
        <>
          <div className="money-particles" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className={`peso-glyph peso-glyph--${i}`}>&#x20B1;</div>
            ))}
          </div>
          <div className="money-splash-content">
            <div className="money-splash__frame">
              <h1 className="victory-title">DEAL SECURED</h1>
              <div className="victory-divider" />
              <p className="money-splash__value">+ {formatCurrencyCompact(dealValue)} Added</p>
              <p className="money-splash__account">Account: {accountLabel}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
