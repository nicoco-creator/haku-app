import { create } from 'zustand'
import type { AccentName } from '../ui/tokens'

type AlertLevel = 0 | 1 | 2 | 3
type CompanionMood = 'neutral' | 'warm' | 'alert' | 'quiet'
type Theme = 'light' | 'dark'

const LS_PAUSED   = 'haku_alert_paused'
const LS_OK_UNTIL = 'haku_alert_ok_until'
const LS_L2D_URL  = 'haku_live2d_model'

function _initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const p = window.location.pathname
  return p.includes('/study') || p.includes('/vault') ? 'dark' : 'light'
}

interface AppState {
  theme: Theme
  backgroundTint: string | null
  alertLevel: AlertLevel
  companionMood: CompanionMood
  alertPaused: boolean
  alertOkUntil: number | null
  live2dModelUrl: string | null
  setTheme: (mode: Theme) => void
  setBackgroundTint: (tint: string | null) => void
  setAlertLevel: (level: AlertLevel) => void
  setCompanionMood: (mood: CompanionMood) => void
  setAlertPaused: (paused: boolean) => void
  setAlertOkUntil: (until: number | null) => void
  setLive2dModelUrl: (url: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme:          _initialTheme(),
  backgroundTint: null,
  alertLevel:     0,
  companionMood:  'neutral',
  alertPaused:    localStorage.getItem(LS_PAUSED) === 'true',
  alertOkUntil:   (() => { const v = localStorage.getItem(LS_OK_UNTIL); return v ? Number(v) : null })(),
  live2dModelUrl: localStorage.getItem(LS_L2D_URL),
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
  setLive2dModelUrl: (url) => {
    if (url) localStorage.setItem(LS_L2D_URL, url)
    else     localStorage.removeItem(LS_L2D_URL)
    set({ live2dModelUrl: url })
  },
}))

export type { AccentName, AlertLevel, CompanionMood }
