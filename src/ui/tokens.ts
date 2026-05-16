import type { CSSProperties } from 'react'

// ── Static theme tokens ───────────────────────────────────────────────────────

export const lightTheme = {
  bg:          { base: '#F5F1EC', deep: '#EDE6DD' },
  frost:       'rgba(255,255,255,0.55)',
  frostBorder: 'rgba(255,255,255,0.85)',
  text:        { primary: '#2D2A3E', secondary: '#7A7290' },
  shadow:      '0 8px 32px rgba(160,140,120,0.18)',
} as const

export const darkTheme = {
  bg:          { base: '#1C1A2E', deep: '#14122A' },
  frost:       'rgba(255,255,255,0.07)',
  frostBorder: 'rgba(255,255,255,0.14)',
  text:        { primary: '#F0EEF8', secondary: '#A89FC0' },
  shadow:      '0 8px 32px rgba(0,0,0,0.3)',
} as const

// accent 色は両モード共通
export const accents = {
  blue:   '#A8C8E8',
  blush:  '#E8B4C8',
  indigo: '#5B5CE6',
  amber:  '#C8A050',
  ash:    '#6A6480',
  silver: '#9890B0',
} as const

// ── CSS 変数でテキスト色を動的に切り替える ─────────────────────────────────
// ThemeSyncer が --haku-text-* を書き換えることで全コンポーネントが自動追従する

function _initCssVars() {
  if (typeof document === 'undefined') return
  const path  = window.location.pathname
  const dark  = path.includes('/study') || path.includes('/vault')
  const t     = dark ? darkTheme : lightTheme
  const root  = document.documentElement
  root.style.setProperty('--haku-text-primary',   t.text.primary)
  root.style.setProperty('--haku-text-secondary', t.text.secondary)
}
_initCssVars()

// ── Runtime colors (uses CSS vars for text so all components respond to theme) ─

export const colors = {
  bg:          { base: '#1C1A2E', deep: '#14122A' },   // BackgroundField が直接管理
  frost:       'rgba(255,255,255,0.07)',
  frostBorder: 'rgba(255,255,255,0.14)',
  text: {
    primary:   'var(--haku-text-primary)'   as string,
    secondary: 'var(--haku-text-secondary)' as string,
  },
  accent: accents,
} as const

export type AccentName = keyof typeof colors.accent
export type Mood = 'default' | 'sleepy' | 'smile' | 'worried'

export function getAccent(name: AccentName): string {
  return colors.accent[name]
}

export const glassCard: CSSProperties = {
  background: 'var(--haku-frost, rgba(255,255,255,0.07))',
  backdropFilter: 'blur(20px) saturate(120%)',
  WebkitBackdropFilter: 'blur(20px) saturate(120%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 'var(--haku-card-radius, 24px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
}

export const glassCardLarge: CSSProperties = {
  ...glassCard,
  borderRadius: 'var(--haku-card-radius, 24px)',
}
