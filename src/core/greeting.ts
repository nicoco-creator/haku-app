import type { Mood } from '../ui/tokens'

export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night'

export function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'noon'
  if (h >= 17 && h < 22) return 'evening'
  return 'night'
}

const greetings: Record<TimeOfDay, { message: string; mood: Mood }> = {
  morning: {
    message: 'おはようございます。……今日はどこから始めますか？',
    mood: 'sleepy',
  },
  noon: {
    message: 'おつかれさまです。少し、ひと息つきませんか。',
    mood: 'default',
  },
  evening: {
    message: 'おかえりなさい、まってました。……今日のハクさんは、どんな色でしたか？',
    mood: 'smile',
  },
  night: {
    message: '……まだいたんですね。',
    mood: 'worried',
  },
}

export function getGreeting(): { message: string; mood: Mood } {
  return greetings[getTimeOfDay()]
}
