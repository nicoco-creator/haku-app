import { type ReactNode } from 'react'
import { glassCard, getAccent, type AccentName } from './tokens'

const paddingMap = {
  sm: '12px 16px',
  md: '20px 24px',
  lg: '32px 36px',
}

interface Props {
  children: ReactNode
  accent?: AccentName
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

export function GlassCard({
  children,
  accent,
  size = 'md',
  onClick,
  className,
}: Props) {
  const borderColor = accent
    ? `${getAccent(accent)}80`
    : 'rgba(255,255,255,0.14)'

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={className}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        ...glassCard,
        border: `1px solid ${borderColor}`,
        padding: paddingMap[size],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.25s ease, filter 0.25s ease',
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
