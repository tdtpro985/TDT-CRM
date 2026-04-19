import { useEffect } from 'react'

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
          <button type="button" className="deal-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body-scroll">
          {children}
        </div>
      </div>
    </div>
  )
}
