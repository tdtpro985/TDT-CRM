import confetti from 'canvas-confetti'

// ─── Confetti ─────────────────────────────────────────────────────────────────

export function celebrateWon() {
  const duration = 2000
  const end = Date.now() + duration

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#f59e0b', '#f97316', '#eab308'],
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#f59e0b', '#f97316', '#eab308'],
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()

  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#f59e0b', '#f97316', '#eab308', '#ef4444', '#3b82f6', '#22c55e'],
  })
}

export function celebrateLost() {
  confetti({
    particleCount: 40,
    spread: 70,
    origin: { y: 0 },
    colors: ['#6b7280', '#9ca3af', '#d1d5db'],
    gravity: 0.6,
    scalar: 0.6,
    drift: 0.5,
  })
}

// ─── JoJo "To Be Continued" Overlay ──────────────────────────────────────────
//
// Lifecycle:
//   triggerJoJo(outcome) → mounts overlay, returns { dismiss }
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
      mix-blend-mode: multiply;
      pointer-events: none;
    }
    #${JOJO_OVERLAY_ID} .jojo-filter.is-won {
      background: rgba(200, 160, 60, 0.28);
      /* Sepia-like warm tint on top of the dim */
    }
    #${JOJO_OVERLAY_ID} .jojo-filter.is-lost {
      background: rgba(30, 30, 30, 0.55);
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
      animation: jojo-slide-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
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

    .jojo-tbc-label {
      font-family: 'Arial Black', 'Arial Bold', 'Impact', sans-serif;
      font-size: clamp(1.2rem, 4vw, 2.4rem);
      font-weight: 900;
      letter-spacing: 0.04em;
      line-height: 1;
      color: #f5c400;
      text-shadow:
        2px 2px 0 #000,
        -1px -1px 0 #000,
        1px -1px 0 #000,
        -1px 1px 0 #000;
      text-transform: uppercase;
      margin-bottom: 6px;
      user-select: none;
    }

    .jojo-arrow-line {
      display: flex;
      align-items: center;
      gap: 0;
    }

    .jojo-arrow-shaft {
      height: 8px;
      width: clamp(160px, 28vw, 420px);
      background: #f5c400;
      box-shadow: 2px 2px 0 #000, 0 2px 0 #000;
    }

    .jojo-arrow-head {
      width: 0;
      height: 0;
      border-top: 22px solid transparent;
      border-bottom: 22px solid transparent;
      border-left: 40px solid #f5c400;
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

export function triggerJoJo(outcome = 'won', onDismiss = null) {
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
  filter.className = `jojo-filter ${outcome === 'won' ? 'is-won' : 'is-lost'}`

  const skipHint = document.createElement('div')
  skipHint.className = 'jojo-skip-hint'
  skipHint.textContent = '[ Esc to skip ]'

  const arrowWrap = document.createElement('div')
  arrowWrap.className = 'jojo-arrow-wrap'

  const label = document.createElement('div')
  label.className = 'jojo-tbc-label'
  label.textContent = 'To Be Continued'

  const arrowLine = document.createElement('div')
  arrowLine.className = 'jojo-arrow-line'

  const shaft = document.createElement('div')
  shaft.className = 'jojo-arrow-shaft'

  const head = document.createElement('div')
  head.className = 'jojo-arrow-head'

  arrowLine.appendChild(shaft)
  arrowLine.appendChild(head)
  arrowWrap.appendChild(label)
  arrowWrap.appendChild(arrowLine)

  root.appendChild(dimmer)
  root.appendChild(filter)
  root.appendChild(skipHint)
  root.appendChild(arrowWrap)

  // ── Apply page-level CSS filter to the body ──────────────────────────────
  const prevFilter = document.body.style.filter
  const prevTransition = document.body.style.transition
  document.body.style.transition = 'filter 0.4s ease'
  if (outcome === 'won') {
    document.body.style.filter = 'sepia(0.65) contrast(1.15) saturate(0.8)'
  } else {
    document.body.style.filter = 'grayscale(1) contrast(1.2)'
  }

  // ── Mount ─────────────────────────────────────────────────────────────────
  document.body.appendChild(root)

  let dismissed = false

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
