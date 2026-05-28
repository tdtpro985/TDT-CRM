import confetti from 'canvas-confetti'

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
