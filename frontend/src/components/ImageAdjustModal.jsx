import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

export default function ImageAdjustModal({ isOpen, onClose, imageUrl, currentZoom, currentOffsetX, currentOffsetY, currentRotation, onSave }) {
  const [zoom, setZoom] = useState(currentZoom || 1)
  const [offsetX, setOffsetX] = useState(currentOffsetX || 0)
  const [offsetY, setOffsetY] = useState(currentOffsetY || 0)
  const [rotation, setRotation] = useState(currentRotation || 0)
  const [isSaving, setIsSaving] = useState(false)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(currentZoom || 1)
      setOffsetX(currentOffsetX || 0)
      setOffsetY(currentOffsetY || 0)
      setRotation(currentRotation || 0)
    }
  }, [isOpen, currentZoom, currentOffsetX, currentOffsetY, currentRotation])

  const handleReset = () => {
    setZoom(1)
    setOffsetX(0)
    setOffsetY(0)
    setRotation(0)
  }

  const rotateLeft = () => setRotation((prev) => (prev - 90) % 360)
  const rotateRight = () => setRotation((prev) => (prev + 90) % 360)

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 10))
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.1))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(zoom, offsetY, offsetX, rotation)
      onClose()
    } catch (err) {
      console.error('Failed to save adjustment:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Manual Interaction Handlers ──────────────────────────────────────────

  const handlePointerDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragStartRef.current = { x: clientX, y: clientY }
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y
    
    dragStartRef.current = { x: clientX, y: clientY }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      
      // Pure 1:1 screen mapping to unscaled translate percentage
      let moveX = (deltaX / rect.width) * 100
      let moveY = (deltaY / rect.height) * 100

      setOffsetX(prev => prev + moveX)
      setOffsetY(prev => prev + moveY)
    }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const toolButtonStyle = { 
    background: 'var(--bg-surface-3)', 
    border: '1px solid var(--border)', 
    color: 'var(--text-strong)', 
    padding: '8px 16px', 
    borderRadius: 'var(--r-md)', 
    fontSize: '13px', 
    fontWeight: 600, 
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Profile Photo"
      kicker="Manual Adjustment"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '12px 0' }}>
        
        {/* Advanced Manipulator Area */}
        <div 
          ref={containerRef}
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            background: '#121212', 
            padding: '0',
            borderRadius: 'var(--r-lg)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '440px',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            border: '1px solid var(--border)'
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          {/* THE IMAGE (Matches Sidebar Layout EXACTLY) */}
          <div style={{
            width: '260px',
            height: '260px',
            position: 'relative',
            zIndex: 5
          }}>
            <img 
              src={imageUrl} 
              alt="Adjustment Preview" 
              draggable="false"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                pointerEvents: 'none'
              }}
            />

            {/* Bounding Box Grid (Locked to the scaled image frame) */}
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              pointerEvents: 'none',
              border: '2px solid rgba(255,255,255,0.6)',
              transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}>
              <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.4)' }} />
              <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.4)' }} />
              <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.4)' }} />
              <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.4)' }} />
            </div>
          </div>

          {/* Mask / Fixed Porthole (The static CRM output window) */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '260px',
              height: '260px',
              borderRadius: '50%',
              border: '2px dashed rgba(255,255,255,0.3)', 
              boxShadow: '0 0 0 2000px rgba(0,0,0,0.7)' 
            }} />
          </div>
          
          <div style={{ position: 'absolute', bottom: '24px', left: '0', right: '0', textAlign: 'center', color: 'white', opacity: 0.7, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', zIndex: 30 }}>
            Drag to Move • Use Buttons to Zoom
          </div>
        </div>

        {/* Manual Tool Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid var(--border)', paddingRight: '12px' }}>
            <button type="button" onClick={zoomOut} style={toolButtonStyle} title="Zoom Out">➖ Zoom</button>
            <button type="button" onClick={zoomIn} style={toolButtonStyle} title="Zoom In">➕ Zoom</button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={rotateLeft} style={toolButtonStyle}>↺ Rotate</button>
            <button type="button" onClick={rotateRight} style={toolButtonStyle}>↻ Rotate</button>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <button 
            type="button"
            className="secondary-button" 
            style={{ padding: '12px 20px' }}
            onClick={handleReset}
          >
            Reset
          </button>
          
          <button 
            type="button"
            className="primary-button" 
            style={{ flex: 1, padding: '12px' }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Applying...' : 'Confirm Profile Photo'}
          </button>
          
          <button 
            type="button"
            className="secondary-button" 
            style={{ padding: '12px 20px' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
