import { useEffect, useRef, useState } from 'react'

// PIXI and pixi-live2d-display are loaded dynamically inside useEffect.
// Static top-level imports of these packages cause module-init crashes
// when window.Live2DCubismCore isn't available yet.

const BASE      = import.meta.env.BASE_URL
const MODEL_URL = `${BASE}live2d/fushigi/Snowbear.haku.model3.json`

const IDLE_EXPRS  = ['脸红', '星星眼', '爱心眼', '鼓嘴', '星星眼扩展', '爱心眼扩展1']
const CLICK_EXPRS = ['脸红', '星星眼', '爱心眼', '泪眼汪汪', '爱心眼扩展2', '鼓嘴']

interface Props {
  mode:     'hero' | 'mini'
  onError?: () => void
}

export function FushigiLive2D({ mode, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef   = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRef     = useRef<any>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let dead = false
    let exprTimer: ReturnType<typeof setInterval> | null = null

    ;(async () => {
      try {
        // Dynamic imports — module errors are caught instead of crashing the app
        const [PIXI, { Live2DModel }] = await Promise.all([
          import('pixi.js'),
          import('pixi-live2d-display'),
        ])
        if (dead) return

        const isMini = mode === 'mini'
        // mini: 140×160 canvas, CSS-cropped to 56×56 circle showing the head
        const w = isMini ? 140 : Math.max(el.clientWidth,  200)
        const h = isMini ? 160 : Math.max(el.clientHeight, 200)

        const app = new PIXI.Application({
          backgroundAlpha: 0,
          width:  w,
          height: h,
          resolution:  Math.min(window.devicePixelRatio ?? 1, 1.5),
          autoDensity: true,
        })
        app.ticker.maxFPS = 30
        appRef.current = app

        const view = app.view as HTMLCanvasElement
        view.style.position = 'absolute'
        if (isMini) {
          view.style.left = `${(56 - w) / 2}px`
          view.style.top  = '-20px'
        } else {
          view.style.left = '0'
          view.style.top  = '0'
        }
        el.appendChild(view)

        const model = await Live2DModel.from(MODEL_URL)
        if (dead) { model.destroy(); app.destroy(true); return }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(model as any).autoInteract = false
        modelRef.current = model
        app.stage.addChild(model)

        // Scale + center model in canvas
        const nw    = model.width
        const nh    = model.height
        const scale = Math.min(w / nw, h / nh)
        model.scale.set(scale)
        model.x = (w - nw * scale) / 2
        model.y = (h - nh * scale) / 2

        setLoading(false)

        // Idle breathing / body sway via direct parameter writes
        let t = 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const core = (model as any).internalModel?.coreModel
        if (core) {
          app.ticker.add(() => {
            t += 0.016
            try {
              core.setParameterValueById('ParamAngleX',      Math.sin(t * 0.6)  * 12)
              core.setParameterValueById('ParamAngleY',      Math.sin(t * 0.4)  *  6)
              core.setParameterValueById('ParamAngleZ',      Math.sin(t * 0.25) *  4)
              core.setParameterValueById('ParamBodyRotateX', Math.sin(t * 0.6)  *  6)
              core.setParameterValueById('ParamBodyRotateZ', Math.sin(t * 0.25) *  3)
              core.setParameterValueById('ParamBreath',      (Math.sin(t * 0.5) + 1) * 0.5)
            } catch { /* parameter absent — silent */ }
          })
        }

        // Random idle expression every 30 s, clears after 3 s
        exprTimer = setInterval(() => {
          const m = modelRef.current
          if (!m) return
          m.expression(IDLE_EXPRS[Math.floor(Math.random() * IDLE_EXPRS.length)])
          setTimeout(() => modelRef.current?.expression(), 3000)
        }, 30_000)

      } catch (err) {
        console.error('[FushigiLive2D] init error:', err)
        if (!dead) onErrorRef.current?.()
      }
    })()

    return () => {
      dead = true
      if (exprTimer) clearInterval(exprTimer)
      modelRef.current?.destroy()
      modelRef.current = null
      appRef.current?.destroy(true)
      appRef.current = null
    }
  }, [mode])

  const focus = (clientX: number, clientY: number, rect: DOMRect) => {
    modelRef.current?.focus(
      ((clientX - rect.left) / rect.width)  * 2 - 1,
      ((clientY - rect.top)  / rect.height) * 2 - 1,
    )
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) =>
    focus(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const t0 = e.touches[0]
    if (t0) focus(t0.clientX, t0.clientY, e.currentTarget.getBoundingClientRect())
  }

  const handleClick = () => {
    const m = modelRef.current
    if (!m || loading) return
    m.expression(CLICK_EXPRS[Math.floor(Math.random() * CLICK_EXPRS.length)])
    setTimeout(() => modelRef.current?.expression(), 3000)
  }

  const spinner = (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid rgba(168,200,232,0.3)',
        borderTopColor: '#A8C8E8',
        animation: 'live2dSpin 1s linear infinite',
      }} />
    </div>
  )

  if (mode === 'mini') {
    return (
      <>
        <style>{`@keyframes live2dSpin{to{transform:rotate(360deg)}}`}</style>
        <div
          ref={containerRef}
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onTouchMove={handleTouchMove}
          style={{
            width: 56, height: 56,
            position: 'relative', overflow: 'hidden',
            borderRadius: '50%', flexShrink: 0,
          }}
        >
          {loading && spinner}
        </div>
      </>
    )
  }

  return (
    <>
      <style>{`@keyframes live2dSpin{to{transform:rotate(360deg)}}`}</style>
      <div
        ref={containerRef}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onTouchMove={handleTouchMove}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      >
        {loading && spinner}
      </div>
    </>
  )
}
