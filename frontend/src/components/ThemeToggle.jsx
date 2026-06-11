import { useState } from 'react'
import './ThemeToggle.css'
import { IconMoon, IconSun, IconSparkle } from './Icons'

const NEON_COLOR_SWATCHES = [
  { id: 'pink',    color: '#FF00FF', label: 'Pink' },
  { id: 'cyan',    color: '#00FFFF', label: 'Cyan' },
  { id: 'green',   color: '#39FF14', label: 'Green' },
  { id: 'yellow',  color: '#FFFF00', label: 'Yellow' },
  { id: 'purple',  color: '#CC00FF', label: 'Purple' },
  { id: 'blue',    color: '#00BFFF', label: 'Blue' },
  { id: 'red',     color: '#FF003C', label: 'Red' },
  { id: 'orange',  color: '#FF4800', label: 'Orange' },
  { id: 'rainbow', color: null,      label: 'Rainbow', isRainbow: true },
]

export default function ThemeToggle({ theme, onThemeChange, neonColor, onNeonColorChange, onSaveDefault, defaultTheme, defaultNeonColor }) {
  const [saved, setSaved] = useState(false)
  const [savedDefault, setSavedDefault] = useState({ theme: defaultTheme ?? 'dark', neonColor: defaultNeonColor ?? 'pink' })

  const themes = [
    { id: 'dark',  label: 'Dark',  icon: IconMoon },
    { id: 'light', label: 'Light', icon: IconSun },
    { id: 'neon',  label: 'Neon',  icon: IconSparkle },
  ]

  function handleSave() {
    onSaveDefault(theme, neonColor)
    setSavedDefault({ theme, neonColor })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="theme-toggle">
      <div className="theme-toggle-header">
        <p className="theme-toggle-label">Theme</p>
        {onSaveDefault && (
          <button
            type="button"
            className={`theme-save-btn ${saved ? 'is-saved' : ''}`}
            onClick={handleSave}
            title="Save theme as default for your account"
          >
            {saved ? '✓ Saved' : 'Save default'}
          </button>
        )}
      </div>
      <div className="theme-toggle-buttons">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`theme-toggle-btn ${theme === t.id ? 'is-active' : ''}`}
            onClick={() => onThemeChange(t.id)}
            title={`Switch to ${t.label} theme`}
            aria-label={`Switch to ${t.label} theme`}
            aria-pressed={theme === t.id}
          >
            {t.id === savedDefault.theme && <span className="theme-default-badge" aria-hidden="true" />}
            <span className="theme-toggle-icon"><t.icon /></span>
            <span className="theme-toggle-name">{t.label}</span>
          </button>
        ))}
      </div>

      {theme === 'neon' && (
        <div className="neon-color-picker">
          {NEON_COLOR_SWATCHES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`neon-color-dot ${s.isRainbow ? 'neon-color-dot--rainbow' : ''} ${neonColor === s.id ? 'is-active' : ''} ${savedDefault.theme === 'neon' && s.id === savedDefault.neonColor ? 'is-default' : ''}`}
              style={!s.isRainbow ? { background: s.color } : undefined}
              onClick={() => onNeonColorChange(s.id)}
              title={s.label}
              aria-label={`Neon ${s.label}`}
              aria-pressed={neonColor === s.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
