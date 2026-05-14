import { create } from 'zustand'
import type { AccentName } from '../ui/tokens'

type AlertLevel = 0 | 1 | 2 | 3
type CompanionMood = 'neutral' | 'warm' | 'alert' | 'quiet'

interface AppState {
  backgroundTint: string | null
  alertLevel: AlertLevel
  companionMood: CompanionMood
  setBackgroundTint: (tint: string | null) => void
  setAlertLevel: (level: AlertLevel) => void
  setCompanionMood: (mood: CompanionMood) => void
}

export const useAppStore = create<AppState>((set) => ({
  backgroundTint: null,
  alertLevel: 0,
  companionMood: 'neutral',
  setBackgroundTint: (tint) => set({ backgroundTint: tint }),
  setAlertLevel: (level) => set({ alertLevel: level }),
  setCompanionMood: (mood) => set({ companionMood: mood }),
}))

export type { AccentName, AlertLevel, CompanionMood }
