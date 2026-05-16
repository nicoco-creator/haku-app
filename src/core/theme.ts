// ── Theme definitions ─────────────────────────────────────────────────────────

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
  // Glass card tint
  frost:       string
  frostBorder: string
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
    frost:       'rgba(255,255,255,0.07)',
    frostBorder: 'rgba(255,255,255,0.14)',
    alwaysDark:  false,
    swatches:    ['#FAF5EE', 'rgba(45,42,62,0.09)', '#A8C8E8'],
  },
  {
    id:          'night',
    label:       '夜空',
    emoji:       '🌙',
    description: '深い紫の夜の空間',
    bg1: '#2A2050', bg2: '#1C1A2E', bg3: '#14122A', bgPos: '30% 40%',
    frost:       'rgba(255,255,255,0.07)',
    frostBorder: 'rgba(255,255,255,0.14)',
    alwaysDark:  true,
    swatches:    ['#1C1A2E', 'rgba(255,255,255,0.07)', '#A8C8E8'],
  },
  {
    id:          'cute',
    label:       'かわいい',
    emoji:       '🩷',
    description: 'あまく、やわらかいばら色',
    bg1: '#2E1A28', bg2: '#1E1228', bg3: '#120E1E', bgPos: '40% 60%',
    frost:       'rgba(232,180,200,0.11)',
    frostBorder: 'rgba(232,180,200,0.25)',
    alwaysDark:  true,
    swatches:    ['#2E1A28', 'rgba(232,180,200,0.11)', '#E8B4C8'],
  },
  {
    id:          'stylish',
    label:       'おしゃれ',
    emoji:       '🖤',
    description: 'モノトーンのミニマル空間',
    bg1: '#1A1A1E', bg2: '#0D0D10', bg3: '#08080A', bgPos: '50% 50%',
    frost:       'rgba(255,255,255,0.05)',
    frostBorder: 'rgba(255,255,255,0.09)',
    alwaysDark:  true,
    swatches:    ['#0D0D10', 'rgba(255,255,255,0.05)', '#9890B0'],
  },
  {
    id:          'game',
    label:       'ゲーム風',
    emoji:       '🎮',
    description: 'ネオンが光るサイバー空間',
    bg1: '#0A1A3A', bg2: '#050E1E', bg3: '#020408', bgPos: '20% 30%',
    frost:       'rgba(91,92,230,0.13)',
    frostBorder: 'rgba(91,92,230,0.35)',
    alwaysDark:  true,
    swatches:    ['#050E1E', 'rgba(91,92,230,0.13)', '#5B5CE6'],
  },
  {
    id:          'healing',
    label:       '癒し',
    emoji:       '🌿',
    description: 'しんとした深い森のなか',
    bg1: '#142018', bg2: '#0E160E', bg3: '#080C08', bgPos: '40% 60%',
    frost:       'rgba(120,180,130,0.09)',
    frostBorder: 'rgba(120,180,130,0.22)',
    alwaysDark:  true,
    swatches:    ['#0E160E', 'rgba(120,180,130,0.09)', '#78B482'],
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
