import { useState, useEffect } from 'react'

const THEMES = ['dark', 'light', 'neon']
const STORAGE_KEY = 'crm-theme-preference'
const DEFAULT_THEME = 'dark'

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // Try to load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.includes(saved)) {
      return saved
    }
    return DEFAULT_THEME
  })

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (newTheme) => {
    if (THEMES.includes(newTheme)) {
      setThemeState(newTheme)
    }
  }

  return { theme, setTheme, themes: THEMES }
}
