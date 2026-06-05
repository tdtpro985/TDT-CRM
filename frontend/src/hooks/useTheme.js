import { useState, useLayoutEffect, useEffect } from 'react'

const THEMES = ['dark', 'light', 'neon']
const STORAGE_KEY = 'crm-theme-preference'
const NEON_COLOR_KEY = 'crm-neon-color'
const DEFAULT_THEME = 'dark'
const DEFAULT_NEON_COLOR = 'pink'

const STATIC_COLORS = ['pink', 'cyan', 'green', 'yellow', 'purple', 'blue', 'red', 'orange']
const NEON_COLORS = [...STATIC_COLORS, 'rainbow']

const NEON_COLOR_MAP = {
  pink:   { accent: '#FF00FF', accentRgb: '255, 0, 255',   accentStrong: '#ff4df2', accentStrongRgb: '255, 77, 242', textSecondary: '#ffdafc', textMuted: '#ffb8f7' },
  cyan:   { accent: '#00FFFF', accentRgb: '0, 255, 255',   accentStrong: '#4dfff5', accentStrongRgb: '77, 255, 245', textSecondary: '#d0ffff', textMuted: '#a0f0f0' },
  green:  { accent: '#39FF14', accentRgb: '57, 255, 20',   accentStrong: '#6bff4d', accentStrongRgb: '107, 255, 77', textSecondary: '#daffcc', textMuted: '#b0f090' },
  yellow: { accent: '#FFFF00', accentRgb: '255, 255, 0',   accentStrong: '#ffff4d', accentStrongRgb: '255, 255, 77', textSecondary: '#fffff0', textMuted: '#f0f0a0' },
  purple: { accent: '#CC00FF', accentRgb: '204, 0, 255',   accentStrong: '#dd4dff', accentStrongRgb: '221, 77, 255', textSecondary: '#f0d0ff', textMuted: '#e0b0ff' },
  blue:   { accent: '#00BFFF', accentRgb: '0, 191, 255',   accentStrong: '#4dd5ff', accentStrongRgb: '77, 213, 255', textSecondary: '#c0f0ff', textMuted: '#90d8f0' },
  red:    { accent: '#FF003C', accentRgb: '255, 0, 60',    accentStrong: '#ff4d7a', accentStrongRgb: '255, 77, 122', textSecondary: '#ffccd8', textMuted: '#ffaabb' },
  orange: { accent: '#FF4800', accentRgb: '255, 72, 0',    accentStrong: '#ff7240', accentStrongRgb: '255, 114, 64', textSecondary: '#ffe0cc', textMuted: '#ffbf99' },
}

const STYLE_TAG_ID = '__neon-color-override__'

function getOrCreateStyleTag() {
  let el = document.getElementById(STYLE_TAG_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_TAG_ID
    document.head.appendChild(el)
  }
  return el
}

function applyNeonColor(colorKey) {
  const c = NEON_COLOR_MAP[colorKey] || NEON_COLOR_MAP.pink
  getOrCreateStyleTag().textContent = [
    '[data-theme="neon"] {',
    `  --accent: ${c.accent} !important;`,
    `  --accent-rgb: ${c.accentRgb} !important;`,
    `  --accent-strong: ${c.accentStrong} !important;`,
    `  --accent-strong-rgb: ${c.accentStrongRgb} !important;`,
    `  --text-secondary: ${c.textSecondary} !important;`,
    `  --text-muted: ${c.textMuted} !important;`,
    '}',
  ].join('\n')
}

function clearNeonColor() {
  const el = document.getElementById(STYLE_TAG_ID)
  if (el) el.textContent = ''
}

// Called synchronously at the top of logout handlers — clears sessionStorage and
// removes the injected style tag before React re-renders with the login page.
export function resetThemeToDefaults() {
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(NEON_COLOR_KEY)
  clearNeonColor()
  document.documentElement.removeAttribute('data-theme')
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.includes(saved)) return saved
    try {
      const user = JSON.parse(sessionStorage.getItem('crm_user') || 'null')
      if (user?.theme && THEMES.includes(user.theme)) return user.theme
    } catch { /* ignore */ }
    return DEFAULT_THEME
  })

  const [neonColor, setNeonColorState] = useState(() => {
    const saved = sessionStorage.getItem(NEON_COLOR_KEY)
    if (saved && NEON_COLORS.includes(saved)) return saved
    try {
      const user = JSON.parse(sessionStorage.getItem('crm_user') || 'null')
      if (user?.neonColor && NEON_COLORS.includes(user.neonColor)) return user.neonColor
    } catch { /* ignore */ }
    return DEFAULT_NEON_COLOR
  })

  // Apply theme + neon color variables to DOM
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.add('is-theme-switching')
    root.setAttribute('data-theme', theme)
    sessionStorage.setItem(STORAGE_KEY, theme)

    if (theme === 'neon') {
      const colorKey = neonColor === 'rainbow' ? STATIC_COLORS[0] : neonColor
      applyNeonColor(colorKey)
    } else {
      clearNeonColor()
    }

    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('is-theme-switching')
      })
    })
    return () => cancelAnimationFrame(timer)
  }, [theme, neonColor])

  // Rainbow auto-cycle effect
  useEffect(() => {
    if (theme !== 'neon' || neonColor !== 'rainbow') return
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % STATIC_COLORS.length
      applyNeonColor(STATIC_COLORS[idx])
    }, 2000)
    return () => clearInterval(interval)
  }, [theme, neonColor])

  const setTheme = (newTheme) => {
    if (!THEMES.includes(newTheme)) return
    setThemeState(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    sessionStorage.setItem(STORAGE_KEY, newTheme)
    if (newTheme !== 'neon') clearNeonColor()
  }

  const setNeonColor = (color) => {
    if (!NEON_COLORS.includes(color)) return
    setNeonColorState(color)
    sessionStorage.setItem(NEON_COLOR_KEY, color)
    // Apply immediately on click without waiting for re-render
    if (document.documentElement.getAttribute('data-theme') === 'neon') {
      applyNeonColor(color === 'rainbow' ? STATIC_COLORS[0] : color)
    }
  }

  return { theme, setTheme, themes: THEMES, neonColor, setNeonColor, neonColors: NEON_COLORS }
}
