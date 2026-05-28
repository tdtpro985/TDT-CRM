import { useEffect } from 'react'

const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
)

export default function Modal({ title, kicker, isOpen, onClose, children }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="deal-modal-overlay" onClick={onClose}>
      <div className="deal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deal-modal__header">
          <div>
            {kicker && <span className="deal-modal__kicker">{kicker}</span>}
            <h2>{title}</h2>
          </div>
          <button type="button" className="deal-modal__close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body-scroll">
          {children}
        </div>
      </div>
    </div>
  )
}
