import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { glassCard, colors, type Mood } from './tokens'
import { useAppStore } from '../core/store'
import { FushigiLive2D, DEFAULT_MODEL_URL } from './FushigiLive2D'

const BASE       = import.meta.env.BASE_URL
const USE_LIVE2D = import.meta.env.VITE_USE_LIVE2D === 'true'

interface Props {
  mode: 'hero' | 'mini'
  mood?: Mood
  message?: string
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  alpha: number; r: number
  born: number
}

function TypewriterText({ text }: { text: string }) {
  const chars = [...text]
  const total = chars.length
  return (
    <>
      <style>{`@keyframes charIn{to{opacity:1}}`}</style>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            opacity: 0,
            animation: 'charIn 0.08s ease forwards',
            animationDelay: `${(i / total) * 1.5}s`,
            whiteSpace: 'pre',
          }}
        >
          {char}
        </span>
      ))}
    </>
  )
}

const moodFilter: Record<Mood, CSSProperties> = {
  default: {},
  sleepy:  { filter: 'brightness(0.88) saturate(0.75)' },
  smile:   { filter: 'brightness(1.08) saturate(1.15) hue-rotate(-5deg)' },
  worried: { filter: 'brightness(0.85) hue-rotate(12deg) saturate(0.85)' },
}

const SMILE_FILTER = 'brightness(1.08) saturate(1.15) hue-rotate(-5deg)'

export function FushigiOrb({ mode, mood = 'default', message }: Props) {
  const navigate           = useNavigate()
  const alertLevel         = useAppStore((s) => s.alertLevel)
  const theme              = useAppStore((s) => s.theme)
  const live2dModelUrl     = useAppStore((s) => s.live2dModelUrl)
  const isDark             = theme === 'dark'
  const modelUrl           = live2dModelUrl ?? DEFAULT_MODEL_URL
  const canvasRef          = useRef<HTMLCanvasElement>(null)
  const orbRef             = useRef<HTMLDivElement>(null)
  const imgRef             = useRef<HTMLImageElement>(null)
  const particles          = useRef<Particle[]>([])
  const animRef            = useRef<number>(0)
  const smiling            = useRef(false)
  const [live2dError, setLive2dError] = useState(false)
  const useLive2D = USE_LIVE2D && !live2dError

  // Reset error when model URL changes (allows retry with new model)
  useEffect(() => { setLive2dError(false) }, [modelUrl])

  useEffect(() => {
    if (mode !== 'hero') return
    const canvas = canvasRef.current
    const orb    = orbRef.current
    if (!canvas || !orb) return
    const ctx = canvas.getContext('2d')!

    const syncSize = () => {
      canvas.width  = orb.clientWidth
      canvas.height = orb.clientHeight
    }
    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(orb)

    const loop = (now: number) => {
      animRef.current = requestAnimationFrame(loop)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.current = particles.current.filter(p => {
        const age = now - p.born
        if (age >= 800) return false
        p.alpha = (1 - age / 800) * 0.7
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.04
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(192,216,240,${p.alpha.toFixed(3)})`
        ctx.fill()
        return true
      })

      const img = imgRef.current
      if (img) {
        const hasParticles = particles.current.length > 0
        if (hasParticles && !smiling.current) {
          smiling.current = true
          img.style.filter = SMILE_FILTER
        } else if (!hasParticles && smiling.current) {
          smiling.current = false
          img.style.filter = (moodFilter[mood].filter as string | undefined) ?? ''
        }
      }
    }
    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [mode, mood])

  const handlePointerMove = (e: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) => {
    if (particles.current.length >= 50) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x  = e.clientX - rect.left
    const y  = e.clientY - rect.top
    const cx = rect.width  / 2
    const cy = rect.height / 2
    if ((x - cx) ** 2 + (y - cy) ** 2 > cx * cy) return

    const now   = performance.now()
    const count = Math.floor(Math.random() * 2) + 1
    for (let i = 0; i < count && particles.current.length < 50; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 0.3,
        alpha: 0.7,
        r: Math.random() * 4 + 2,
        born: now,
      })
    }
  }

  const foggedFilter = alertLevel >= 2
    ? 'blur(28px) brightness(0.92)'
    : 'blur(12px)'

  if (mode === 'mini') {
    return (
      <button
        onClick={() => navigate('/')}
        aria-label="ホームに戻る"
        style={{
          width: 56, height: 56, borderRadius: '50%',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)'}`,
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
          backdropFilter: foggedFilter,
          WebkitBackdropFilter: foggedFilter,
          cursor: 'pointer', overflow: 'hidden',
          padding: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box',
          transition: 'backdrop-filter 3s ease-in-out',
        }}
      >
        {useLive2D
          ? <FushigiLive2D key={modelUrl} mode="mini" modelUrl={modelUrl} onError={() => setLive2dError(true)} />
          : <img
              src={`${BASE}fushigi-placeholder.png`}
              alt="" width={50} height={50}
              style={{ borderRadius: '50%', objectFit: 'cover', ...moodFilter[mood] }}
            />
        }
      </button>
    )
  }

  const orbSize = 'min(220px, 42vw)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div
        ref={orbRef}
        onPointerMove={handlePointerMove}
        style={{
          ...(isDark ? glassCard : { ...glassCard, background: 'rgba(255,255,255,0.55)', boxShadow: '0 8px 32px rgba(160,140,120,0.18), inset 0 1px 0 rgba(255,255,255,0.7)' }),
          backdropFilter: alertLevel >= 2 ? 'blur(28px) brightness(0.92)' : glassCard.backdropFilter,
          WebkitBackdropFilter: alertLevel >= 2 ? 'blur(28px) brightness(0.92)' : glassCard.WebkitBackdropFilter,
          position: 'relative',
          borderRadius: '50%',
          width: orbSize, height: orbSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
          cursor: 'default',
          transition: 'backdrop-filter 3s ease-in-out',
        }}
      >
        {useLive2D
          ? <FushigiLive2D key={modelUrl} mode="hero" modelUrl={modelUrl} onError={() => setLive2dError(true)} />
          : <img
              ref={imgRef}
              src={`${BASE}fushigi-placeholder.png`}
              alt="フシギちゃん"
              style={{
                width: '88%', height: '88%',
                objectFit: 'cover', borderRadius: '50%',
                ...moodFilter[mood],
                transition: 'filter 0.3s ease',
              }}
            />
        }
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 1,
          }}
        />
      </div>

      {message && (
        <p style={{
          fontFamily: "'Noto Serif JP', serif",
          fontWeight: 300,
          fontSize: 'clamp(13px, 3.5vw, 16px)',
          color: colors.text.primary,
          textAlign: 'center',
          margin: 0, lineHeight: 1.8, maxWidth: '280px', minHeight: '3.2em',
          // 明るいモード時は読みやすさのため気泡背景を追加
          ...(isDark ? {} : {
            background: 'rgba(168,200,232,0.35)',
            borderRadius: 14,
            padding: '8px 16px',
          }),
        }}>
          <TypewriterText text={message} />
        </p>
      )}
    </div>
  )
}
