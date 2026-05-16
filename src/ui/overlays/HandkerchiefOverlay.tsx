import { useRef, useEffect, useState } from 'react'
import { colors } from '../tokens'

// Canvas is kept small for iPad performance; CSS scales it to fill the viewport.
const CW = 320
const CH = 568
const BRUSH = 48
const CLEAR_THRESHOLD = 0.62  // 62% cleared

interface Props {
  onClose: () => void
}

export function HandkerchiefOverlay({ onClose }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const drawing    = useRef(false)
  const wipedRef   = useRef(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill with warm sepia fog
    ctx.fillStyle = 'rgba(30, 22, 18, 0.88)'
    ctx.fillRect(0, 0, CW, CH)

    // Sample coverage every 700ms
    const check = setInterval(() => {
      if (wipedRef.current) return
      const data = ctx.getImageData(0, 0, CW, CH).data
      let transparent = 0
      const total = CW * CH
      // sample every 16th pixel (alpha channel = index 3)
      for (let i = 3; i < data.length; i += 4 * 16) {
        if (data[i] < 12) transparent++
      }
      if (transparent / (total / 16) >= CLEAR_THRESHOLD) {
        wipedRef.current = true
        clearInterval(check)
        setFading(true)
        setTimeout(onClose, 700)
      }
    }, 700)

    return () => clearInterval(check)
  }, [onClose])

  const erase = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (CW / rect.width)
    const y = (clientY - rect.top)  * (CH / rect.height)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,1)'
    ctx.fill()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        opacity: fading ? 0 : 1,
        transition: fading ? 'opacity 0.7s ease' : 'none',
      }}
      onPointerDown={(e) => { drawing.current = true; erase(e.clientX, e.clientY) }}
      onPointerMove={(e) => { if (drawing.current) erase(e.clientX, e.clientY) }}
      onPointerUp={() => { drawing.current = false }}
      onPointerLeave={() => { drawing.current = false }}
    >
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
      />

      {/* Hint text — pointer-events:none so it doesn't block drawing */}
      <p style={{
        position: 'absolute', bottom: 36, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 12, color: `${colors.text.secondary}99`,
        margin: 0, letterSpacing: '0.06em',
        pointerEvents: 'none',
      }}>
        画面をなぞって、もやを晴らして
      </p>
    </div>
  )
}
