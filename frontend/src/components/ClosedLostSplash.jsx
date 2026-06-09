import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrencyCompact } from '../utils'
import '../styles/closed-lost-splash.css'
import wagKaNaMp3 from '../assets/sounds/wag-ka-na-magpaliwanag.mp3'

// ─── Glitch canvas effect (neon theme only) ───────────────────────────────

function GlitchCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    let running = true

    function draw() {
      if (!running) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const w = Math.random() * 120 + 8
        const h = Math.random() * 3 + 1
        ctx.fillStyle = `rgba(255, 0, 0, ${Math.random() * 0.12})`
        ctx.fillRect(x, y, w, h)
      }
      setTimeout(() => { if (running) requestAnimationFrame(draw) }, 60)
    }

    draw()
    return () => { running = false }
  }, [])

  return <canvas ref={canvasRef} className="lost-glitch-canvas" aria-hidden="true" />
}

// ─── Card content (shared between reason-lock and tear halves) ────────────

function CardContent({ lostReason = '', theme }) {
  const colonIdx = lostReason.indexOf(': ')
  const category = colonIdx !== -1 ? lostReason.slice(0, colonIdx) : lostReason
  const notes    = colonIdx !== -1 ? lostReason.slice(colonIdx + 2) : null

  return (
    <div className={`lost-card lost-card--${theme}`}>
      <div className="lost-card__label">Lost Reason</div>
      <div className="lost-card__category">{category}</div>
      {notes && <div className="lost-card__notes">{notes}</div>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

/**
 * ClosedLostSplash — "Wag Ka Na Magpaliwanag" full-viewport deal-loss overlay.
 *
 * Stage machine:
 *   reason-lock (0ms) → reason-tear (1200ms) → outro (audio.onended) → [unmount]
 */
export default function ClosedLostSplash({
  dealName,
  dealValue,
  companyName,
  lostReason,
  theme = 'dark',
  onDismiss,
}) {
  const [stage, setStage] = useState('reason-lock')
  const timers    = useRef([])
  const audioRef  = useRef(null)
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
    const audio = new Audio(wagKaNaMp3)
    audioRef.current = audio
    audio.play().catch(() => {})

    // At 1.2s the vocal line ends — trigger the tear
    timers.current.push(setTimeout(() => setStage('reason-tear'), 1200))
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

  const showCard       = stage === 'reason-lock'
  const showTear       = stage === 'reason-tear' || stage === 'outro'
  const showParticles  = theme === 'dark' && showTear
  const showGlitch     = theme === 'neon'

  return (
    <div
      className={`lost-splash lost-splash--${theme} stage-${stage}`}
      onClick={cleanup}
      role="dialog"
      aria-modal="true"
      aria-label="Deal terminated"
    >
      <div className="lost-splash__esc">[ Esc to skip ]</div>

      {showGlitch && <GlitchCanvas />}

      {/* Phase 1 — Lost reason card */}
      {showCard && (
        <div className="lost-card-wrap">
          <CardContent lostReason={lostReason} theme={theme} />
        </div>
      )}

      {/* Phase 2 — Tear halves + DEAL TERMINATED */}
      {showTear && (
        <>
          <div className="lost-card-half-wrap lost-card-half-wrap--top">
            <CardContent lostReason={lostReason} theme={theme} />
          </div>
          <div className="lost-card-half-wrap lost-card-half-wrap--bottom">
            <CardContent lostReason={lostReason} theme={theme} />
          </div>

          {showParticles && (
            <div className="lost-particles" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className={`lost-particle lost-particle--${i}`} />
              ))}
            </div>
          )}

          <div className="lost-terminated-content">
            <div className="lost-terminated-frame">
              <h1 className="lost-terminated-title">DEAL TERMINATED</h1>
              <div className="lost-terminated-divider" />
              <p className="lost-terminated-deal-name">{dealName}</p>
              <p className="lost-terminated-value">- {formatCurrencyCompact(dealValue)} Dropped</p>
              {companyName && (
                <p className="lost-terminated-account">Account: {companyName}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
