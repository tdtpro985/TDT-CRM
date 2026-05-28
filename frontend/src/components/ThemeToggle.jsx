import './ThemeToggle.css'

const IconMoon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
)
const IconSun = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
)
const IconSparkles = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 3.824L17.736 8.736 13.912 10.648 12 14.472l-1.912-3.824L6.264 8.736l3.824-1.912L12 3zM18 13l1.275 2.549L21.824 16.824 19.275 18.099 18 20.648l-1.275-2.549-2.549-1.275 2.549-1.275L18 13zM6 15l.956 1.912L8.868 17.868 6.912 18.824 6 20.736l-.956-1.912-1.912-.956.956-.956L6 15z"/></svg>
)

export default function ThemeToggle({ theme, onThemeChange }) {
  const themes = [
    { id: 'dark', label: 'Dark', icon: <IconMoon /> },
    { id: 'light', label: 'Light', icon: <IconSun /> },
    { id: 'neon', label: 'Neon', icon: <IconSparkles /> },
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
