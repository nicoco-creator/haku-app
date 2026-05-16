import { create } from 'zustand'
import type { AccentName } from '../ui/tokens'
import { loadAndApplyTheme } from './theme'

type AlertLevel    = 0 | 1 | 2 | 3
type CompanionMood = 'neutral' | 'warm' | 'alert' | 'quiet'
type Theme         = 'light' | 'dark'

const LS_PAUSED   = 'haku_alert_paused'
const LS_OK_UNTIL = 'haku_alert_ok_until'

function _initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const p = window.location.pathname
  return p.includes('/study') || p.includes('/vault') ? 'dark' : 'light'
}

// Apply saved UI theme on store init (sets CSS vars immediately)
const _savedUITheme = typeof document !== 'undefined' ? loadAndApplyTheme() : null

interface AppState {
  // page light/dark mode
  theme:          Theme
  backgroundTint: string | null
  alertLevel:     AlertLevel
  companionMood:  CompanionMood
  alertPaused:    boolean
  alertOkUntil:   number | null
  // UI theme (模様替え)
  uiThemeId:         string
  uiThemeAlwaysDark: boolean
  // BGM player
  bgmTrackKey:  string | null   // 'gen:rain' | 'imp:42'
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
  setUiTheme: (id, alwaysDark) => set({ uiThemeId: id, uiThemeAlwaysDark: alwaysDark }),
  setBgmTrack:   (key, name) => set({ bgmTrackKey: key, bgmTrackName: name, bgmPlaying: true }),
  setBgmPlaying: (v) => set({ bgmPlaying: v }),
  setBgmVolume:  (v) => set({ bgmVolume: v }),
  stopBgm: () => set({ bgmTrackKey: null, bgmTrackName: '', bgmPlaying: false }),
}))

export type { AccentName, AlertLevel, CompanionMood }
