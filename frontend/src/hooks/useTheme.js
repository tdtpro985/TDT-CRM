import { useState, useLayoutEffect } from 'react'

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
  useLayoutEffect(() => {
    const root = document.documentElement
    
    // Disable transitions during theme change to prevent flashes
    root.classList.add('is-theme-switching')
    
    root.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)

    // Remove the class after the next frame to re-enable transitions
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('is-theme-switching')
      })
    })

    return () => cancelAnimationFrame(timer)
  }, [theme])

  const setTheme = (newTheme) => {
    if (THEMES.includes(newTheme)) {
      setThemeState(newTheme)
    }
  }

  return { theme, setTheme, themes: THEMES }
}
