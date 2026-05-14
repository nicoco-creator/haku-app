import type { CSSProperties } from 'react'

export const colors = {
  bg: { base: '#1C1A2E', deep: '#14122A' },
  frost: 'rgba(255,255,255,0.07)',
  frostBorder: 'rgba(255,255,255,0.14)',
  text: { primary: '#F0EEF8', secondary: '#A89FC0' },
  accent: {
    blue:   '#A8C8E8',
    blush:  '#E8B4C8',
    indigo: '#5B5CE6',
    amber:  '#C8A050',
    ash:    '#6A6480',
    silver: '#9890B0',
  },
} as const

export type AccentName = keyof typeof colors.accent
export type Mood = 'default' | 'sleepy' | 'smile' | 'worried'

export function getAccent(name: AccentName): string {
  return colors.accent[name]
}

export const glassCard: CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(20px) saturate(120%)',
  WebkitBackdropFilter: 'blur(20px) saturate(120%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
}

export const glassCardLarge: CSSProperties = {
  ...glassCard,
  borderRadius: '28px',
}
