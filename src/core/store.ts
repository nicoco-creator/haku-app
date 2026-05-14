import { create } from 'zustand'
import type { AccentName } from '../ui/tokens'

type AlertLevel = 0 | 1 | 2 | 3
type CompanionMood = 'neutral' | 'warm' | 'alert' | 'quiet'

const LS_PAUSED   = 'haku_alert_paused'
const LS_OK_UNTIL = 'haku_alert_ok_until'

interface AppState {
  backgroundTint: string | null
  alertLevel: AlertLevel
  companionMood: CompanionMood
  alertPaused: boolean
  alertOkUntil: number | null   // UNIX ms: "私はいま大丈夫" の有効期限
  setBackgroundTint: (tint: string | null) => void
  setAlertLevel: (level: AlertLevel) => void
  setCompanionMood: (mood: CompanionMood) => void
  setAlertPaused: (paused: boolean) => void
  setAlertOkUntil: (until: number | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  backgroundTint: null,
  alertLevel: 0,
  companionMood: 'neutral',
  alertPaused:   localStorage.getItem(LS_PAUSED) === 'true',
  alertOkUntil:  (() => { const v = localStorage.getItem(LS_OK_UNTIL); return v ? Number(v) : null })(),
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
}))

export type { AccentName, AlertLevel, CompanionMood }
