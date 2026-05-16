/**
 * PWA ローカル通知モジュール
 *
 * ServiceWorker 経由で showNotification() を呼ぶ。
 * スケジュールは setTimeout/setInterval で管理し localStorage に永続化。
 * アプリ再起動時は restoreSchedules() でタイマーを復元すること。
 */

const SCHED_KEY    = 'haku_notif_schedules'
const SETTINGS_KEY = 'haku_notif_settings'
const ALERT_KEY    = 'haku_alert_notif_date'
const ICON         = '/haku-app/icons/icon-192.png'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimedNotif {
  enabled: boolean
  hour:    number
  minute:  number
  body:    string
}

interface SimpleNotif {
  enabled: boolean
  body:    string
}

export interface NotifSettings {
  morning:  TimedNotif
  study:    TimedNotif
  alert:    SimpleNotif
  night:    TimedNotif
  monthEnd: SimpleNotif
}

export interface Schedule {
  id:           string
  hour:         number
  minute:       number
  title:        string
  body:         string
  monthEndOnly?: boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_NOTIF_SETTINGS: NotifSettings = {
  morning:  { enabled: false, hour: 7,  minute: 0, body: '今日も始まりますね。昨夜はよく眠れましたか？' },
  study:    { enabled: false, hour: 17, minute: 0, body: 'そろそろ勉強の時間ですね。今日は何を攻略しますか？' },
  alert:    { enabled: false, body: '少し気になることがあります。フシギちゃんに話してみませんか？' },
  night:    { enabled: false, hour: 23, minute: 0, body: '今日も一日、どうでしたか？' },
  monthEnd: { enabled: false, body: '今月もお疲れ様でした。振り返りを書いてみませんか？' },
}

export const NOTIF_IDS = {
  morning:  'haku_morning',
  study:    'haku_study',
  alert:    'haku_alert',
  night:    'haku_night',
  monthEnd: 'haku_month_end',
} as const

// ── In-memory timers ──────────────────────────────────────────────────────────

const _timers    = new Map<string, ReturnType<typeof setTimeout>>()
const FIRED_PFX  = 'haku_notif_fired_'   // key prefix for last-fired date per schedule

// ── Helpers ───────────────────────────────────────────────────────────────────

function _loadSchedules(): Schedule[] {
  try { return JSON.parse(localStorage.getItem(SCHED_KEY) ?? '[]') as Schedule[] }
  catch { return [] }
}

function _saveSchedules(list: Schedule[]): void {
  localStorage.setItem(SCHED_KEY, JSON.stringify(list))
}

function _msUntilNext(hour: number, minute: number): number {
  const now  = new Date()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

function _isLastDayOfMonth(): boolean {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate()
}

async function _show(title: string, body: string, icon?: string): Promise<void> {
  const opts: NotificationOptions = { body, icon: icon ?? ICON, badge: ICON }
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, opts)
      return
    } catch { /* fall through to legacy */ }
  }
  if (Notification.permission === 'granted') {
    new Notification(title, opts)
  }
}

function _startTimer(s: Schedule): void {
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const firedKey = FIRED_PFX + s.id

  const fire = () => {
    if (s.monthEndOnly && !_isLastDayOfMonth()) return
    const today = todayStr()
    if (localStorage.getItem(firedKey) === today) return  // already fired today
    localStorage.setItem(firedKey, today)
    void _show(s.title, s.body)
  }

  // Catch-up: if the scheduled time has already passed today but not yet fired,
  // show the notification immediately when the app is opened.
  const now   = new Date()
  const sched = new Date()
  sched.setHours(s.hour, s.minute, 0, 0)
  if (now >= sched) fire()

  const t = setTimeout(() => {
    fire()
    const interval = setInterval(fire, 24 * 60 * 60 * 1000)
    _timers.set(s.id, interval)
  }, _msUntilNext(s.hour, s.minute))
  _timers.set(s.id, t)
}

// ── Settings persistence ──────────────────────────────────────────────────────

export function loadNotifSettings(): NotifSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<NotifSettings>
    return {
      morning:  { ...DEFAULT_NOTIF_SETTINGS.morning,  ...stored.morning  },
      study:    { ...DEFAULT_NOTIF_SETTINGS.study,    ...stored.study    },
      alert:    { ...DEFAULT_NOTIF_SETTINGS.alert,    ...stored.alert    },
      night:    { ...DEFAULT_NOTIF_SETTINGS.night,    ...stored.night    },
      monthEnd: { ...DEFAULT_NOTIF_SETTINGS.monthEnd, ...stored.monthEnd },
    }
  } catch {
    return { ...DEFAULT_NOTIF_SETTINGS }
  }
}

export function saveNotifSettings(settings: NotifSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// ── Public API ────────────────────────────────────────────────────────────────

export const notif = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied')  return false
    const result = await Notification.requestPermission()
    return result === 'granted'
  },

  scheduleDaily(
    id: string,
    hour: number,
    minute: number,
    title: string,
    body: string,
    opts?: { monthEndOnly?: boolean },
  ): void {
    this.cancel(id)

    const schedule: Schedule = { id, hour, minute, title, body, ...opts }
    const list = _loadSchedules().filter(s => s.id !== id)
    list.push(schedule)
    _saveSchedules(list)

    _startTimer(schedule)
  },

  show(title: string, body: string, icon?: string): void {
    void _show(title, body, icon)
  },

  cancel(id: string): void {
    const t = _timers.get(id)
    if (t !== undefined) {
      clearTimeout(t)
      clearInterval(t)
      _timers.delete(id)
    }
    localStorage.removeItem(FIRED_PFX + id)
    _saveSchedules(_loadSchedules().filter(s => s.id !== id))
  },

  listSchedules(): Schedule[] {
    return _loadSchedules()
  },

  restoreSchedules(): void {
    for (const s of _loadSchedules()) {
      if (_timers.has(s.id)) continue
      _startTimer(s)
    }
  },
}

// ── Alert notification (called from metrics.ts) ───────────────────────────────

export function fireAlertNotifIfEnabled(): void {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const today = new Date().toISOString().slice(0, 10)
  if (localStorage.getItem(ALERT_KEY) === today) return

  const settings = loadNotifSettings()
  if (!settings.alert.enabled) return

  localStorage.setItem(ALERT_KEY, today)
  notif.show('フシギちゃんより', settings.alert.body)
}
