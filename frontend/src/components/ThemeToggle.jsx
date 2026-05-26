import './ThemeToggle.css'
import { IconMoon, IconSun, IconSparkle } from './Icons'

export default function ThemeToggle({ theme, onThemeChange }) {
  const themes = [
    { id: 'dark', label: 'Dark', icon: IconMoon },
    { id: 'light', label: 'Light', icon: IconSun },
    { id: 'neon', label: 'Neon', icon: IconSparkle },
  ]

  return (
    <div className="theme-toggle">
      <p className="theme-toggle-label">Theme</p>
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
            <span className="theme-toggle-icon"><t.icon /></span>
            <span className="theme-toggle-name">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
