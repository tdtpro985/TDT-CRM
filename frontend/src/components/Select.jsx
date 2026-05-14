import { useState } from 'react'

export default function Select({ value, onChange, options, placeholder, readOnly, className = '' }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div 
      className={`custom-select-container ${className}`} 
      style={{ position: 'relative', width: '100%' }}
      onMouseEnter={() => !readOnly && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div 
        className={`custom-select-trigger ${readOnly ? 'input--readonly' : ''}`}
        style={{
          width: '100%',
          padding: 'var(--pad-control)',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--border)',
          background: 'var(--bg-input)',
          color: 'var(--text-strong)',
          fontSize: 'var(--fs-sm)',
          cursor: readOnly ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          minHeight: '38px'
        }}
      >
        <span>{selected?.label || placeholder || 'Select...'}</span>
        {!readOnly && <span style={{ fontSize: '10px', opacity: 0.5 }}>▼</span>}
      </div>

      {open && !readOnly && (
        <div 
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: '#1a1f2e',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            marginTop: '4px',
            boxShadow: 'var(--shadow-strong)',
            overflow: 'hidden',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {options.map(o => (
            <div 
              key={o.value} 
              className={`custom-select-option ${o.value === value ? 'is-selected' : ''}`}
              style={{
                padding: '10px 14px',
                fontSize: 'var(--fs-sm)',
                color: o.value === value ? 'var(--accent-strong)' : 'var(--text)',
                background: o.value === value ? 'rgba(255,152,0,0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                onChange(o.value)
                setOpen(false)
              }}
              onMouseEnter={(e) => {
                if (o.value !== value) e.target.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                if (o.value !== value) e.target.style.background = 'transparent'
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
