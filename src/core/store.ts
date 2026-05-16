import { create } from 'zustand'
import type { AccentName } from '../ui/tokens'
import { loadAndApplyTheme, applyTheme, applyCardRadius, loadSavedRadius, UI_THEMES } from './theme'
import type { UILayout } from './theme'

type AlertLevel    = 0 | 1 | 2 | 3
type CompanionMood = 'neutral' | 'warm' | 'alert' | 'quiet'
type Theme         = 'light' | 'dark'

const LS_PAUSED   = 'haku_alert_paused'
const LS_OK_UNTIL = 'haku_alert_ok_until'
const LS_LAYOUT   = 'haku_ui_layout'

function _initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const p = window.location.pathname
  return p.includes('/study') || p.includes('/vault') ? 'dark' : 'light'
}

// Apply saved UI theme and radius on store init
const _savedUITheme = typeof document !== 'undefined' ? loadAndApplyTheme() : null
const _savedRadius  = typeof document !== 'undefined' ? (() => {
  const r = loadSavedRadius()
  applyCardRadius(r)
  return r
})() : '20px'
const _savedLayout  = (typeof localStorage !== 'undefined'
  ? (localStorage.getItem(LS_LAYOUT) as UILayout | null)
  : null) ?? 'grid2'

interface AppState {
  // page light/dark mode
  theme:          Theme
  backgroundTint: string | null
  alertLevel:     AlertLevel
  companionMood:  CompanionMood
  alertPaused:    boolean
  alertOkUntil:   number | null
  // UI theme — color only
  uiThemeId:         string
  uiThemeAlwaysDark: boolean
  // UI layout (独立設定)
  uiLayout:       UILayout
  // Card radius (独立設定)
  uiCardRadius:   string
  // BGM player
  bgmTrackKey:  string | null
  bgmTrackName: string
  bgmPlaying:   boolean
  bgmVolume:    number
  // actions
  setTheme:          (mode: Theme) => void
  setBackgroundTint: (tint: string | null) => void
  setAlertLevel:     (level: AlertLevel) => void
  setCompanionMood:  (mood: CompanionMood) => void
  setAlertPaused:    (paused: boolean) => void
  setAlertOkUntil:   (until: number | null) => void
  setUiTheme:        (id: string, alwaysDark: boolean) => void
  setUiLayout:       (layout: UILayout) => void
  setUiCardRadius:   (radius: string) => void
  setBgmTrack:       (key: string, name: string) => void
  setBgmPlaying:     (v: boolean) => void
  setBgmVolume:      (v: number) => void
  stopBgm:           () => void
}

export const useAppStore = create<AppState>((set) => ({
  theme:          _initialTheme(),
  backgroundTint: null,
  alertLevel:     0,
  companionMood:  'neutral',
  alertPaused:    localStorage.getItem(LS_PAUSED) === 'true',
  alertOkUntil:   (() => { const v = localStorage.getItem(LS_OK_UNTIL); return v ? Number(v) : null })(),
  uiThemeId:         _savedUITheme?.id ?? 'default',
  uiThemeAlwaysDark: _savedUITheme?.alwaysDark ?? false,
  uiLayout:          _savedLayout,
  uiCardRadius:      _savedRadius,
  bgmTrackKey:  null,
  bgmTrackName: '',
  bgmPlaying:   false,
  bgmVolume:    0.6,

  setTheme:          (mode)  => set({ theme: mode }),
  setBackgroundTint: (tint)  => set({ backgroundTint: tint }),
  setAlertLevel:     (level) => set({ alertLevel: level }),
  setCompanionMood:  (mood)  => set({ companionMood: mood }),
  setAlertPaused: (paused) => {
    localStorage.setItem(LS_PAUSED, String(paused))
    set({ alertPaused: paused })
  },
  setAlertOkUntil: (until) => {
    if (until === null) localStorage.removeItem(LS_OK_UNTIL)
    else                localStorage.setItem(LS_OK_UNTIL, String(until))
    set({ alertOkUntil: until })
  },
  setUiTheme: (id, alwaysDark) => {
    const theme = UI_THEMES.find(t => t.id === id)
    if (theme) applyTheme(theme)
    set({ uiThemeId: id, uiThemeAlwaysDark: alwaysDark })
  },
  setUiLayout: (layout) => {
    localStorage.setItem(LS_LAYOUT, layout)
    set({ uiLayout: layout })
  },
  setUiCardRadius: (radius) => {
    applyCardRadius(radius)
    set({ uiCardRadius: radius })
  },
  setBgmTrack:   (key, name) => set({ bgmTrackKey: key, bgmTrackName: name, bgmPlaying: true }),
  setBgmPlaying: (v) => set({ bgmPlaying: v }),
  setBgmVolume:  (v) => set({ bgmVolume: v }),
  stopBgm: () => set({ bgmTrackKey: null, bgmTrackName: '', bgmPlaying: false }),
}))

export type { AccentName, AlertLevel, CompanionMood }
