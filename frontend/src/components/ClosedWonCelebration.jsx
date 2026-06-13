import { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import '../styles/closed-won-celebration.css'

const THEME_COLORS = {
  light: ['#475569', '#ffffff', '#ff8a00'],
  dark:  ['#ffd700', '#c0c0c0', '#ffffff'],
}

export default function ClosedWonCelebration({ audio, theme, onDismiss }) {
  const [stage, setStage] = useState('active')
  const intervalRef = useRef(null)
  const dismissedRef = useRef(false)
  const audioRef = useRef(audio)

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
      a.onended = null
    }
    clearInterval(intervalRef.current)
    confetti.reset()
    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    const neonAccent = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim()
    const colors = theme === 'neon'
      ? [neonAccent || '#ff8a00', '#ffffff']
      : (THEME_COLORS[theme] ?? THEME_COLORS.dark)

    function fireBurst() {
      confetti({ particleCount: 35, spread: 120, origin: { x: 0.5, y: 0.55 }, colors, zIndex: 10000 })
      confetti({ particleCount: 12, angle: 55,  spread: 70,  origin: { x: 0, y: 0.65 }, colors, zIndex: 10000, startVelocity: 30 })
      confetti({ particleCount: 12, angle: 125, spread: 70,  origin: { x: 1, y: 0.65 }, colors, zIndex: 10000, startVelocity: 30 })
    }

    fireBurst()
    intervalRef.current = setInterval(fireBurst, 400)

    const a = audioRef.current
    if (a) {
      a.onended = () => {
        clearInterval(intervalRef.current)
        confetti.reset()
        setStage('outro')
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') handleDismiss()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      clearInterval(intervalRef.current)
      if (a) a.onended = null
    }
  }, [handleDismiss]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stage !== 'outro') return
    const t = setTimeout(() => onDismiss?.(), 300)
    return () => clearTimeout(t)
  }, [stage, onDismiss])

  return (
    <div
      className={`cwc-backdrop cwc-backdrop--${theme}${stage === 'outro' ? ' cwc-outro' : ''}`}
      onClick={handleDismiss}
    >
      <span className="cwc-skip-hint">[ Esc to skip ]</span>
      <div className="cwc-content" onClick={e => e.stopPropagation()}>
        <h1 className="cwc-title">DEAL SECURED</h1>
      </div>
    </div>
  )
}
