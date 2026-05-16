/**
 * セッション横断のメタデータ管理
 * バッジ判定に必要な「いつ・何回・どのパターンで使ったか」を永続化する。
 * badges.ts に import されるため、badges.ts をここから import してはいけない。
 */

const K = {
  firstLaunch:   'haku_meta_first_launch',   // ISO date string (first ever launch)
  loginDays:     'haku_meta_login_days',      // JSON string[] ('YYYY-MM-DD')
  seasons:       'haku_meta_seasons',         // JSON string[] ('spring'|'summer'|'autumn'|'winter')
  timerMinutes:  'haku_meta_timer_minutes',   // number (cumulative focus minutes)
  teaCount:      'haku_meta_tea_count',       // number (timer completions with a word to dissolve)
  lettersRead:   'haku_meta_letters_read',    // number (cumulative letters read)
  weekendNight:  'haku_meta_weekend_night',   // '1' if ever launched Fri 20:00+ or Sat
  missionStreak: 'haku_meta_mission_streak',  // JSON { lastDate: string, count: number }
  monthlyActive: 'haku_meta_monthly_active',  // JSON { 'YYYY-MM': true, ... }
} as const

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getNum(key: string): number {
  return parseInt(localStorage.getItem(key) ?? '0', 10)
}

function getJSON<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    return v ?? fallback
  } catch {
    return fallback
  }
}

// ── Getters ──────────────────────────────────────────────────────────────────

export function getFirstLaunchDate(): string | null {
  return localStorage.getItem(K.firstLaunch)
}

export function getLoginDays(): string[] {
  return getJSON<string[]>(K.loginDays, [])
}

export function getSeasons(): string[] {
  return getJSON<string[]>(K.seasons, [])
}

export function getTimerMinutes(): number {
  return getNum(K.timerMinutes)
}

export function getTeaCount(): number {
  return getNum(K.teaCount)
}

export function getLettersRead(): number {
  return getNum(K.lettersRead)
}

export function getWeekendNightVisited(): boolean {
  return localStorage.getItem(K.weekendNight) === '1'
}

export function getMissionStreak(): { lastDate: string; count: number } {
  return getJSON(K.missionStreak, { lastDate: '', count: 0 })
}

export function getMonthlyActive(): Record<string, true> {
  return getJSON(K.monthlyActive, {})
}

// ── Session recording ────────────────────────────────────────────────────────

/**
 * Called once on app startup. Returns true if this is the very first launch.
 */
export function recordSession(): boolean {
  const isFirst = !localStorage.getItem(K.firstLaunch)
  if (isFirst) {
    localStorage.setItem(K.firstLaunch, new Date().toISOString())
  }

  // Unique login days
  const today = todayStr()
  const days = getLoginDays()
  if (!days.includes(today)) {
    days.push(today)
    localStorage.setItem(K.loginDays, JSON.stringify(days))
  }

  // Season detection (Northern Hemisphere mapping)
  const month  = new Date().getMonth() + 1  // 1–12
  const season = month >= 3 && month <= 5  ? 'spring'
               : month >= 6 && month <= 8  ? 'summer'
               : month >= 9 && month <= 11 ? 'autumn'
               :                             'winter'
  const seasons = getSeasons()
  if (!seasons.includes(season)) {
    seasons.push(season)
    localStorage.setItem(K.seasons, JSON.stringify(seasons))
  }

  // Friday 20:00+ or Saturday → weekend night flag (permanent)
  const now  = new Date()
  const dow  = now.getDay()    // 0=Sun, 5=Fri, 6=Sat
  const hour = now.getHours()
  if ((dow === 5 && hour >= 20) || dow === 6) {
    localStorage.setItem(K.weekendNight, '1')
  }

  return isFirst
}

// ── Activity recording ───────────────────────────────────────────────────────

export function recordTimerComplete(durationMin: number, hasWord: boolean): void {
  localStorage.setItem(K.timerMinutes, String(getTimerMinutes() + durationMin))

  if (hasWord) {
    localStorage.setItem(K.teaCount, String(getTeaCount() + 1))
  }

  markMonthlyActive()
}

export function recordMissionComplete(): void {
  const today     = todayStr()
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const streak    = getMissionStreak()

  let newCount: number
  if (streak.lastDate === today) {
    newCount = streak.count           // same day — idempotent
  } else if (streak.lastDate === yesterday) {
    newCount = streak.count + 1       // consecutive day
  } else {
    newCount = 1                      // streak reset
  }

  localStorage.setItem(K.missionStreak, JSON.stringify({ lastDate: today, count: newCount }))
  markMonthlyActive()
}

export function recordLetterRead(): void {
  localStorage.setItem(K.lettersRead, String(getLettersRead() + 1))
}

function markMonthlyActive(): void {
  const ym  = new Date().toISOString().slice(0, 7)  // 'YYYY-MM'
  const map = getMonthlyActive()
  if (!map[ym]) {
    map[ym] = true
    localStorage.setItem(K.monthlyActive, JSON.stringify(map))
  }
}

// ── Computed helpers used by badges.ts ───────────────────────────────────────

export function has12ConsecutiveMonthsActive(): boolean {
  const map  = getMonthlyActive()
  const keys = Object.keys(map).sort()
  if (keys.length < 12) return false

  for (let i = 0; i <= keys.length - 12; i++) {
    const [y0s, m0s] = keys[i].split('-')
    const y0 = Number(y0s)
    const m0 = Number(m0s) - 1  // 0-indexed

    let consecutive = true
    for (let j = 0; j < 12; j++) {
      const total = y0 * 12 + m0 + j
      const yr = Math.floor(total / 12)
      const mo = (total % 12) + 1
      const key = `${yr}-${String(mo).padStart(2, '0')}`
      if (!map[key]) { consecutive = false; break }
    }
    if (consecutive) return true
  }
  return false
}
