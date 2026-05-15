import { type ReactNode, type CSSProperties } from 'react'
import { glassCard, glassCardLarge, getAccent, type AccentName } from './tokens'
import { useAppStore } from '../core/store'

const paddingMap = {
  sm: '12px 16px',
  md: '20px 24px',
  lg: '32px 36px',
}

const glassLight: CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px) saturate(120%)',
  WebkitBackdropFilter: 'blur(20px) saturate(120%)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(160,140,120,0.18), inset 0 1px 0 rgba(255,255,255,0.7)',
}

interface Props {
  children:   ReactNode
  accent?:    AccentName
  size?:      'sm' | 'md' | 'lg'
  onClick?:   () => void
  className?: string
  style?:     CSSProperties
  large?:     boolean
}

export function GlassCard({
  children,
  accent,
  size = 'md',
  onClick,
  className,
  style,
  large,
}: Props) {
  const theme  = useAppStore((s) => s.theme)
  const isDark = theme === 'dark'

  const base        = isDark ? (large ? glassCardLarge : glassCard) : glassLight
  const alphaHex    = isDark ? '80' : '99'   // 0.50 dark / 0.60 light
  const borderColor = accent
    ? `${getAccent(accent)}${alphaHex}`
    : isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)'

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={className}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        ...base,
        border: `1px solid ${borderColor}`,
        padding: paddingMap[size],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.25s ease, filter 0.25s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!onClick) return
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-2px)'
        el.style.filter = 'brightness(1.05)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.filter = ''
      }}
      onMouseDown={(e) => {
        if (!onClick) return
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-1px)'
        el.style.filter = 'brightness(1.02)'
      }}
    >
      {children}
    </div>
  )
}
