import confetti from 'canvas-confetti'
import tbcArrow from './assets/tbc.png'
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import VictorySplash from './components/VictorySplash'
import ClosedWonCelebration from './components/ClosedWonCelebration'

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#f59e0b', '#f97316', '#eab308', '#ef4444', '#3b82f6', '#22c55e']
const BURST_SHAPES = ['square', 'circle']
const BURST_INTERVAL = 400

let _activeConfettiDismiss = null

export function celebrateWon(duration = 2000, onDismiss = null) {
  if (_activeConfettiDismiss) {
    _activeConfettiDismiss()
    _activeConfettiDismiss = null
  }

  confetti.reset()

  const end = Date.now() + duration
  let active = true
  let timeoutId = null

  function fireBurst() {
    if (!active) return

    confetti({
      particleCount: 28,
      spread: 110,
      origin: { x: 0.5, y: 0.55 },
      colors: CONFETTI_COLORS,
      shapes: BURST_SHAPES,
      scalar: 1.2,
      ticks: 200,
      zIndex: 10000,
    })

    confetti({
      particleCount: 10,
      angle: 55,
      spread: 65,
      origin: { x: 0, y: 0.65 },
      colors: CONFETTI_COLORS,
      shapes: ['square'],
      scalar: 0.9,
      startVelocity: 30,
      ticks: 180,
      zIndex: 10000,
    })

    confetti({
      particleCount: 10,
      angle: 125,
      spread: 65,
      origin: { x: 1, y: 0.65 },
      colors: CONFETTI_COLORS,
      shapes: ['square'],
      scalar: 0.9,
      startVelocity: 30,
      ticks: 180,
      zIndex: 10000,
    })

    if (Date.now() < end) timeoutId = setTimeout(fireBurst, BURST_INTERVAL)
  }

  fireBurst()

  const hint = document.createElement('div')
  hint.id = 'confetti-skip-hint'
  hint.textContent = '[ Esc to dismiss ]'
  Object.assign(hint.style, {
    position: 'fixed',
    top: '20px',
    right: '24px',
    zIndex: '10001',
    fontFamily: "'Manrope', 'Segoe UI', sans-serif",
    fontSize: '0.72rem',
    letterSpacing: '0.1em',
    color: 'rgba(255, 255, 255, 0.4)',
    pointerEvents: 'none',
    userSelect: 'none',
    opacity: '0',
    transition: 'opacity 0.3s ease',
  })
  document.body.appendChild(hint)
  requestAnimationFrame(() => { hint.style.opacity = '1' })

  let destroyed = false
  let deferredTimer = null

  function cleanup(immediate, callOnDismiss) {
    if (destroyed) return
    if (immediate) {
      destroyed = true
      _activeConfettiDismiss = null
      clearTimeout(timeoutId)
      clearTimeout(deferredTimer)
      confetti.reset()
      hint.remove()
      document.removeEventListener('keydown', onKeyDown)
      if (callOnDismiss && onDismiss) onDismiss()
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      clearTimeout(naturalTimer)
      cleanup(true, true)
    }
  }

  document.addEventListener('keydown', onKeyDown)

  _activeConfettiDismiss = () => {
    clearTimeout(naturalTimer)
    cleanup(true, true)
  }

  // Stop firing new particles when sound ends; let remaining particles fall naturally
  const naturalTimer = setTimeout(() => {
    active = false
    clearTimeout(timeoutId)
    hint.remove()
    document.removeEventListener('keydown', onKeyDown)
    deferredTimer = setTimeout(() => cleanup(true, false), 5000)
  }, duration)
}

export function dismissActiveConfetti() {
  if (_activeConfettiDismiss) {
    _activeConfettiDismiss()
    _activeConfettiDismiss = null
  }
}

// ─── JoJo "To Be Continued" Overlay ──────────────────────────────────────────
//
// Lifecycle:
//   triggerJoJo() → mounts overlay, returns { dismiss }
//   dismiss()            → tears down overlay cleanly
//
// The onDismiss callback is fired whenever the overlay is removed (ESC, click,
// or the caller programmatically calls dismiss()).

const JOJO_CSS_ID = 'jojo-overlay-styles'
const JOJO_OVERLAY_ID = 'jojo-overlay-root'

function injectStyles() {
  if (document.getElementById(JOJO_CSS_ID)) return
  const style = document.createElement('style')
  style.id = JOJO_CSS_ID
  style.textContent = `
    /* ── JoJo overlay backdrop ─────────────────────────────────────── */
    #${JOJO_OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      cursor: pointer;
      animation: jojo-fade-in 0.35s ease forwards;
    }

    #${JOJO_OVERLAY_ID}.is-dismissing {
      animation: jojo-fade-out 0.5s ease forwards;
    }

    @keyframes jojo-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes jojo-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    /* Dimmer */
    #${JOJO_OVERLAY_ID} .jojo-dimmer {
      position: absolute;
      inset: 0;
      background: rgba(5, 8, 18, 0.72);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
    }

    /* Page-level filter overlay (pseudo-screen-burn) */
    #${JOJO_OVERLAY_ID} .jojo-filter {
      position: absolute;
      inset: 0;
      background: rgba(255, 19, 240, 0.24);
      mix-blend-mode: multiply;
      pointer-events: none;
    }

    /* ── "To Be Continued" arrow ─────────────────────────────────────── */
    .jojo-arrow-wrap {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 0 0 52px 40px;
      transform: translateX(-110%);
    }

    .jojo-arrow-wrap.is-visible {
      animation: jojo-slide-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0s forwards;
    }

    @keyframes jojo-slide-in {
      to { transform: translateX(0); }
    }

    .jojo-arrow-wrap.is-dismissing {
      animation: jojo-slide-out 0.4s ease forwards !important;
    }
    @keyframes jojo-slide-out {
      to { transform: translateX(-110%); }
    }

    .jojo-arrow-img {
      display: block;
      height: auto;
      width: clamp(160px, 28vw, 420px);
      filter: drop-shadow(2px 2px 0 #000);
    }

    /* ── ESC hint ───────────────────────────────────────────────────── */
    .jojo-skip-hint {
      position: absolute;
      top: 20px;
      right: 24px;
      z-index: 3;
      font-family: 'Manrope', 'Segoe UI', sans-serif;
      font-size: 0.72rem;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.32);
      pointer-events: none;
      user-select: none;
      animation: jojo-fade-in 1s ease 1.5s both;
    }
  `
  document.head.appendChild(style)
}

let _activeJoJo = null

export function triggerJoJo(onDismiss = null) {
  // Clean up any previous overlay
  if (_activeJoJo) {
    _activeJoJo.forceRemove()
    _activeJoJo = null
  }

  injectStyles()

  // ── Build DOM ──────────────────────────────────────────────────────────────
  const root = document.createElement('div')
  root.id = JOJO_OVERLAY_ID
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'To Be Continued')

  const dimmer = document.createElement('div')
  dimmer.className = 'jojo-dimmer'

  const filter = document.createElement('div')
  filter.className = 'jojo-filter'

  const skipHint = document.createElement('div')
  skipHint.className = 'jojo-skip-hint'
  skipHint.textContent = '[ Esc to skip ]'

  const arrowWrap = document.createElement('div')
  arrowWrap.className = 'jojo-arrow-wrap'

  const arrowLine = document.createElement('div')
  arrowLine.className = 'jojo-arrow-line'

  const arrowImg = document.createElement('img')
  arrowImg.src = tbcArrow
  arrowImg.alt = 'To Be Continued'
  arrowImg.className = 'jojo-arrow-img'

  arrowLine.appendChild(arrowImg)
  arrowWrap.appendChild(arrowLine)

  root.appendChild(dimmer)
  root.appendChild(filter)
  root.appendChild(skipHint)
  root.appendChild(arrowWrap)

  // ── Apply page-level CSS filter to the body ──────────────────────────────
  const prevFilter = document.body.style.filter
  const prevTransition = document.body.style.transition
  document.body.style.transition = 'filter 0.4s ease'
  document.body.style.filter = 'sepia(0.3) contrast(1.3) saturate(1.1) hue-rotate(290deg)'

  // ── Mount ─────────────────────────────────────────────────────────────────
  document.body.appendChild(root)

  let dismissed = false
  const arrowTimer = setTimeout(() => {
    arrowWrap.classList.add('is-visible')
  }, 4500)

  function restore() {
    document.body.style.transition = 'filter 0.5s ease'
    document.body.style.filter = prevFilter
    setTimeout(() => {
      document.body.style.transition = prevTransition
    }, 600)
  }

  function dismiss() {
    if (dismissed) return
    dismissed = true
    clearTimeout(arrowTimer)
    _activeJoJo = null

    // Animate out
    root.classList.add('is-dismissing')
    arrowWrap.classList.add('is-dismissing')
    restore()

    setTimeout(() => {
      root.remove()
      if (onDismiss) onDismiss()
    }, 500)
  }

  // Force-remove without animation (used when a new jojo triggers)
  function forceRemove() {
    if (dismissed) return
    dismissed = true
    clearTimeout(arrowTimer)
    root.remove()
    restore()
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      cleanup()
      dismiss()
    }
  }

  function onClick(e) {
    // Only dismiss on clicks directly on the dimmer/root, not on the arrow
    if (e.target === root || e.target === dimmer) {
      cleanup()
      dismiss()
    }
  }

  function cleanup() {
    document.removeEventListener('keydown', onKeyDown)
    root.removeEventListener('click', onClick)
  }

  document.addEventListener('keydown', onKeyDown)
  root.addEventListener('click', onClick)

  _activeJoJo = { dismiss, forceRemove }

  return { dismiss, forceRemove }
}

/**
 * Dismiss any active JoJo overlay — safe to call even if none is active.
 * Used by route-change cleanup in App.jsx.
 */
export function dismissActiveJoJo() {
  if (_activeJoJo) {
    _activeJoJo.dismiss()
    _activeJoJo = null
  }
}

// ─── Victory Splash "Deal Secured" Overlay ─────────────────────────────────────

let _activeVictorySplash = null

/**
 * Mount the Victory Splash celebration overlay.
 * @param {{ name: string, value: number }} dealMeta – deal snapshot
 * @param {(() => void)|null} onDismiss – optional callback after overlay is removed
 */
export function triggerVictorySplash(dealMeta, onDismiss = null) {
  // Tear down any previous instance
  if (_activeVictorySplash) {
    _activeVictorySplash.forceRemove()
    _activeVictorySplash = null
  }

  const container = document.createElement('div')
  container.id = 'victory-splash-root'
  document.body.appendChild(container)
  const root = createRoot(container)

  let removed = false

  function remove() {
    if (removed) return
    removed = true
    _activeVictorySplash = null
    try { root.unmount() } catch { /* noop */ }
    container.remove()
    onDismiss?.()
  }

  function forceRemove() {
    if (removed) return
    removed = true
    _activeVictorySplash = null
    try { root.unmount() } catch { /* noop */ }
    container.remove()
  }

  _activeVictorySplash = { dismiss: remove, forceRemove }

  const theme = document.documentElement.getAttribute('data-theme') || 'dark'

  root.render(
    createElement(VictorySplash, {
      dealName: dealMeta.name,
      dealValue: dealMeta.value,
      companyName: dealMeta.companyName ?? null,
      profilePicUrl: dealMeta.profilePicUrl ?? null,
      userInitials: dealMeta.userInitials ?? '?',
      theme,
      onDismiss: remove,
    })
  )

  return { dismiss: remove, forceRemove }
}

/**
 * Dismiss any active Victory Splash overlay — safe to call even if none is active.
 * Used by route-change cleanup.
 */
export function dismissActiveVictorySplash() {
  if (_activeVictorySplash) {
    _activeVictorySplash.dismiss()
    _activeVictorySplash = null
  }
}

// ─── Closed Won Celebration Overlay ──────────────────────────────────────────

let _activeClosedWonCelebration = null

export function triggerClosedWonCelebration(audio, onDismiss = null) {
  if (_activeClosedWonCelebration) {
    _activeClosedWonCelebration.forceRemove()
    _activeClosedWonCelebration = null
  }

  const container = document.createElement('div')
  container.id = 'closed-won-celebration-root'
  document.body.appendChild(container)
  const root = createRoot(container)

  let removed = false

  function remove() {
    if (removed) return
    removed = true
    _activeClosedWonCelebration = null
    try { root.unmount() } catch { /* noop */ }
    container.remove()
    onDismiss?.()
  }

  function forceRemove() {
    if (removed) return
    removed = true
    _activeClosedWonCelebration = null
    try { root.unmount() } catch { /* noop */ }
    container.remove()
  }

  _activeClosedWonCelebration = { dismiss: remove, forceRemove }

  const theme = document.documentElement.getAttribute('data-theme') || 'dark'

  root.render(
    createElement(ClosedWonCelebration, {
      audio,
      theme,
      onDismiss: remove,
    })
  )

  return { dismiss: remove, forceRemove }
}

export function dismissActiveClosedWonCelebration() {
  if (_activeClosedWonCelebration) {
    _activeClosedWonCelebration.dismiss()
    _activeClosedWonCelebration = null
  }
}


