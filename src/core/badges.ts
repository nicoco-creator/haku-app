const KEY = 'haku_badges'

export interface BadgeDef {
  id: string
  emoji: string
  name: string
  hint: string         // shown before earned
  message: string      // Fushigi message shown after earning
}

export interface EarnedBadge {
  id: string
  earnedAt: string     // ISO date string
}

export const BADGE_DEFS: readonly BadgeDef[] = [
  {
    id: 'silent_pioneer',
    emoji: '🌑',
    name: '静寂の開拓者',
    hint: 'タイマーと、深いところへ行った人だけが受け取れる。',
    message: 'あなたは静寂の中に入ることができました。それは、かなり勇気のいることです。',
  },
  {
    id: 'secret_sharer',
    emoji: '🗝️',
    name: '秘密の共有者',
    hint: '小さな共犯関係を、何度も積み重ねた人へ。',
    message: '一緒に、こっそりやりましたね。誰にも言わなくていいです。',
  },
  {
    id: 'night_witness',
    emoji: '🌙',
    name: '夜更かしの目撃者',
    hint: '夜の深い時間に、タイマーと向き合った記録。',
    message: '深夜に、ひとりでここにいたんですね。ちゃんと見ていましたよ。',
  },
]

function load(): EarnedBadge[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(badges: EarnedBadge[]): void {
  localStorage.setItem(KEY, JSON.stringify(badges))
}

export function loadEarnedBadges(): EarnedBadge[] {
  return load()
}

export function isEarned(id: string): boolean {
  return load().some((b) => b.id === id)
}

export function earnBadge(id: string): EarnedBadge | null {
  const existing = load()
  if (existing.some((b) => b.id === id)) return null
  const entry: EarnedBadge = { id, earnedAt: new Date().toISOString() }
  save([...existing, entry])
  return entry
}

// Called after timer completion
export function checkTimerBadges(): string[] {
  const newly: string[] = []
  if (earnBadge('silent_pioneer')) newly.push('silent_pioneer')

  const hour = new Date().getHours()
  if (hour >= 23 || hour < 4) {
    if (earnBadge('night_witness')) newly.push('night_witness')
  }

  return newly
}

// Called after mission completion
export function checkMissionBadges(cumulativeCount: number): string[] {
  const newly: string[] = []
  if (cumulativeCount >= 3) {
    if (earnBadge('secret_sharer')) newly.push('secret_sharer')
  }
  return newly
}
