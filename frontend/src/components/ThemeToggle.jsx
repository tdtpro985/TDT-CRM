import './ThemeToggle.css'

export default function ThemeToggle({ theme, onThemeChange }) {
  const themes = [
    { id: 'dark', label: 'Dark', icon: '🌙' },
    { id: 'light', label: 'Light', icon: '☀️' },
    { id: 'neon', label: 'Neon', icon: '✨' },
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
            <span className="theme-toggle-icon">{t.icon}</span>
            <span className="theme-toggle-name">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
