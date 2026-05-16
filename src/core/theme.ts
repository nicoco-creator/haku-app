// ── Theme definitions ─────────────────────────────────────────────────────────

export type UILayout = 'grid' | 'compact' | 'list' | 'otome'

export interface UITheme {
  id:          string
  label:       string
  emoji:       string
  description: string
  // Background gradient color stops
  bg1:         string
  bg2:         string
  bg3:         string
  bgPos:       string   // e.g. "30% 40%"
  // Glass card tint (dark mode)
  frost:       string
  frostBorder: string
  // Glass card tint (light mode — pastel themes)
  frostLight:       string
  frostBorderLight: string
  // Card border-radius (px value as string, e.g. "24px")
  cardRadius:  string
  // Home layout variant
  layout:      UILayout
  // If true, ThemeSyncer forces white text regardless of page
  alwaysDark:  boolean
  // Preview swatch colors shown in theme picker
  swatches:    [string, string, string]
}

export const UI_THEMES: readonly UITheme[] = [
  {
    id:          'default',
    label:       'デフォルト',
    emoji:       '🌸',
    description: 'やわらかいクリームのひかり',
    bg1: '#FAF5EE', bg2: '#F5F1EC', bg3: '#EDE6DD', bgPos: '30% 40%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(45,42,62,0.08)',
    frostBorderLight: 'rgba(45,42,62,0.15)',
    cardRadius:  '24px',
    layout:      'grid',
    alwaysDark:  false,
    swatches:    ['#FAF5EE', '#EDE6DD', '#A8C8E8'],
  },
  {
    id:          'sakura',
    label:       'さくら',
    emoji:       '🌸',
    description: 'ほんのり染まるさくら色',
    bg1: '#FEF0F5', bg2: '#FAE0EC', bg3: '#F3D0E2', bgPos: '40% 35%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(210,140,165,0.11)',
    frostBorderLight: 'rgba(210,140,165,0.22)',
    cardRadius:  '28px',
    layout:      'grid',
    alwaysDark:  false,
    swatches:    ['#FEF0F5', '#F3D0E2', '#E8B4C8'],
  },
  {
    id:          'lavender',
    label:       'ラベンダー',
    emoji:       '💜',
    description: 'すっきり並んだラベンダーリスト',
    bg1: '#F5F0FD', bg2: '#EDE4FA', bg3: '#E2D5F5', bgPos: '35% 45%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(130,100,180,0.09)',
    frostBorderLight: 'rgba(130,100,180,0.18)',
    cardRadius:  '14px',
    layout:      'list',
    alwaysDark:  false,
    swatches:    ['#F5F0FD', '#E2D5F5', '#B4A4D8'],
  },
  {
    id:          'mint',
    label:       'ミント',
    emoji:       '🌿',
    description: '機能一覧がすっきり見えるコンパクト配置',
    bg1: '#EDFBF5', bg2: '#DBF5E8', bg3: '#CEECDE', bgPos: '45% 50%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(60,140,100,0.09)',
    frostBorderLight: 'rgba(60,140,100,0.18)',
    cardRadius:  '16px',
    layout:      'compact',
    alwaysDark:  false,
    swatches:    ['#EDFBF5', '#CEECDE', '#78C898'],
  },
  {
    id:          'sky',
    label:       'スカイ',
    emoji:       '☁️',
    description: 'ふわりと広がる青空',
    bg1: '#EEF5FD', bg2: '#DDEAF8', bg3: '#CDDCF2', bgPos: '30% 30%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(80,120,180,0.09)',
    frostBorderLight: 'rgba(80,120,180,0.18)',
    cardRadius:  '20px',
    layout:      'grid',
    alwaysDark:  false,
    swatches:    ['#EEF5FD', '#CDDCF2', '#A8C8E8'],
  },
  {
    id:          'peach',
    label:       'ピーチ',
    emoji:       '🍑',
    description: 'あたたかくやさしいひだまり',
    bg1: '#FDF6ED', bg2: '#FAE8D0', bg3: '#F4DBBF', bgPos: '50% 40%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(200,140,80,0.09)',
    frostBorderLight: 'rgba(200,140,80,0.18)',
    cardRadius:  '24px',
    layout:      'grid',
    alwaysDark:  false,
    swatches:    ['#FDF6ED', '#F4DBBF', '#C8A050'],
  },
  {
    id:          'otome',
    label:       '乙女ゲーム',
    emoji:       '🎀',
    description: '選択肢を選ぶような、ときめく配置',
    bg1: '#FDF0F8', bg2: '#F9E2F2', bg3: '#F2D0E8', bgPos: '40% 30%',
    frost:            'rgba(255,255,255,0.07)',
    frostBorder:      'rgba(255,255,255,0.14)',
    frostLight:       'rgba(210,140,170,0.10)',
    frostBorderLight: 'rgba(210,140,170,0.22)',
    cardRadius:  '8px',
    layout:      'otome',
    alwaysDark:  false,
    swatches:    ['#FDF0F8', '#F2D0E8', '#E8A0C0'],
  },
]

// ── Apply / Load ──────────────────────────────────────────────────────────────

const LS_KEY = 'haku_ui_theme'

export function applyTheme(theme: UITheme): void {
  const root = document.documentElement
  root.style.setProperty('--haku-bg-1',   theme.bg1)
  root.style.setProperty('--haku-bg-2',   theme.bg2)
  root.style.setProperty('--haku-bg-3',   theme.bg3)
  root.style.setProperty('--haku-bg-pos', theme.bgPos)
  root.style.setProperty('--haku-frost',        theme.frost)
  root.style.setProperty('--haku-frost-border', theme.frostBorder)
  root.style.setProperty('--haku-frost-light',        theme.frostLight)
  root.style.setProperty('--haku-frost-border-light', theme.frostBorderLight)
  root.style.setProperty('--haku-card-radius', theme.cardRadius)
  if (theme.alwaysDark) {
    root.style.setProperty('--haku-text-primary',   '#F0EEF8')
    root.style.setProperty('--haku-text-secondary', '#A89FC0')
  }
  localStorage.setItem(LS_KEY, theme.id)
}

export function loadAndApplyTheme(): UITheme {
  const id    = localStorage.getItem(LS_KEY) ?? 'default'
  const theme = UI_THEMES.find(t => t.id === id) ?? UI_THEMES[0]
  if (typeof document !== 'undefined') applyTheme(theme)
  return theme
}
