import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCurrencyCompact } from '../utils'
import '../styles/victory-splash.css'
import slashSfx from '../assets/sounds/slash.mp3'
import bgTrack from '../assets/sounds/last-surprise.mp3'

/**
 * VictorySplash — "Pipeline Secured" full-viewport celebration overlay.
 *
 * Stage machine:
 *   slash (0ms) → wireframe-cut (500ms) → victory-splash (1500ms) → outro (3500ms) → [unmount 4100ms]
 *
 * Props:
 *   dealName   – string, deal name from snapshot
 *   dealValue  – number, raw PHP value
 *   onDismiss  – () => void, called on unmount/skip
 */
export default function VictorySplash({ dealName, dealValue, onDismiss }) {
  const [stage, setStage] = useState('slash')
  const timers = useRef([])
  const slashAudio = useRef(null)
  const bgAudio = useRef(null)
  const dismissed = useRef(false)

  const cleanup = useCallback(() => {
    if (dismissed.current) return
    dismissed.current = true

    // Clear all timers
    timers.current.forEach(t => clearTimeout(t))
    timers.current = []

    // Stop audio
    ;[slashAudio, bgAudio].forEach(ref => {
      if (ref.current) {
        try {
          ref.current.pause()
          ref.current.currentTime = 0
        } catch { /* noop */ }
        ref.current = null
      }
    })

    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    // Play slash SFX immediately
    const slash = new Audio(slashSfx)
    slashAudio.current = slash
    slash.play().catch(() => {})

    // Stage transitions
    timers.current.push(
      setTimeout(() => {
        setStage('wireframe-cut')
        // Start background music
        const bg = new Audio(bgTrack)
        bgAudio.current = bg
        bg.play().catch(() => {})

        const bgDurationMs = (bg.duration && isFinite(bg.duration) && bg.duration > 0)
          ? Math.round(bg.duration * 1000)
          : 3600

        const musicStart = 500
        const outroLead = 800

        timers.current.push(
          setTimeout(() => setStage('outro'), musicStart + bgDurationMs - outroLead)
        )
        timers.current.push(
          setTimeout(() => cleanup(), musicStart + bgDurationMs)
        )
      }, 500)
    )

    timers.current.push(
      setTimeout(() => setStage('victory-splash'), 1500)
    )

    // ESC listener
    function onKeyDown(e) {
      if (e.key === 'Escape') cleanup()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [cleanup])

  const showWireframe = stage === 'wireframe-cut' || stage === 'victory-splash' || stage === 'outro'
  const showFullscreen = stage === 'victory-splash' || stage === 'outro'

  return (
    <div
      className={`victory-splash${stage === 'outro' ? ' stage-outro' : ''}`}
      onClick={cleanup}
      role="dialog"
      aria-modal="true"
      aria-label="Pipeline Secured celebration"
    >
      {/* ESC hint */}
      <div className="victory-splash__esc">[ Esc to skip ]</div>

      {/* Stage 1 — Slash banners */}
      {(stage === 'slash' || stage === 'wireframe-cut') && (
        <>
          <div className="victory-slash-a" />
          <div className="victory-slash-b" />
        </>
      )}

      {/* Stage 2 — Wireframe banner */}
      {showWireframe && !showFullscreen && (
        <div className={`victory-wireframe${showWireframe ? ' is-active' : ''}`}>
          <div className="victory-wireframe__text">PIPELINE SECURED</div>
        </div>
      )}

      {/* Stage 3 — Victory splash full-screen */}
      {showFullscreen && (
        <div className={`victory-fullscreen${showFullscreen ? ' is-active' : ''}`}>
          <h1 className="victory-title is-visible">PIPELINE SECURED</h1>
          <div className="victory-divider is-visible" />
          <p className="victory-metric is-visible">
            ⭐ {formatCurrencyCompact(dealValue)}  ·  Deal Secured
          </p>
          <p className="victory-deal-name is-visible">{dealName}</p>
        </div>
      )}
    </div>
  )
}
