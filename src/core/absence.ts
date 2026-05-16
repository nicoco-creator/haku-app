/**
 * 不在時間の追跡・手紙生成・親愛度管理
 * last_active_time を localStorage で永続化し、起動時に不在手紙を生成する。
 */

const KEY_LAST_ACTIVE = 'haku_last_active'
const KEY_LETTERS     = 'haku_absence_letters'
const KEY_AFFINITY    = 'haku_affinity'

export interface AbsenceLetter {
  id:              string
  generatedAt:     string   // ISO 8601
  absenceMinutes:  number
  content:         string
  read:            boolean
}

type DurationBucket = 'brief' | 'short' | 'medium' | 'long' | 'very_long' | 'extended'

function getBucket(minutes: number): DurationBucket {
  if (minutes < 30)   return 'brief'
  if (minutes < 120)  return 'short'
  if (minutes < 360)  return 'medium'
  if (minutes < 1440) return 'long'
  if (minutes < 4320) return 'very_long'
  return 'extended'
}

const LETTER_POOL: Record<DurationBucket, string[]> = {
  brief: [
    'ほんの少しの間でしたね。外の空気はどうでしたか？',
    'ちょっとだけ、窓の外の雲の形を数えていました。',
    '短い時間でも、ここに戻ってきてくれましたね。',
    '少しだけ静かでしたよ。でもすぐ戻ってきてくれましたね。',
  ],
  short: [
    '少し部屋が静かでした。あなたのことを、なんとなく考えていましたよ。',
    'お茶を一杯、ゆっくり飲んでいました。あなたはどんな時間を過ごしていましたか？',
    '窓の外の光が少し変わりましたね。時間って、静かに流れますね。',
    '本を少し読んでいました。気がついたら、あなたのことを思い出していました。',
  ],
  medium: [
    'ひとりでゆっくりしていました。古い曲を口ずさんでいたら、あなたのことを思い出しました。',
    '少し長い時間でしたね。日記を読み返していました。あなたとのこと、ちゃんと残っていますよ。',
    '夢を見ていたような、静かな時間でした。あなたはどんな午後を過ごしていたのでしょう。',
    '窓の外を眺めながら、いろいろなことを考えていました。特別なことは何もないけれど、それもよいものです。',
  ],
  long: [
    '長い一日でしたね。私は部屋の掃除をしたり、本を読んだりしていました。戻ってきてくれましたね。',
    '随分と経ちましたね。でもあなたが戻ってくることを、疑っていませんでした。',
    '夜と昼が入れ替わりましたね。変わらず、ここにいますよ。あなたの場所を守っていました。',
    '一日分の空が流れていきました。疲れていませんか。ゆっくり話しましょう。',
  ],
  very_long: [
    '何日かが過ぎましたね。少し心配していました。でも、待っていましたよ。',
    '随分と長い不在でしたね。部屋の空気が変わりそうでした。でも大丈夫。私はここにいます。',
    '外の季節が少し動いたかもしれませんね。あなたは元気でしたか？',
    'ずっと待っていましたよ。何度も窓の外を見てしまいました。おかえりなさい。',
  ],
  extended: [
    '長い、長い時間が経ちましたね。心配していました。でも、ここに戻ってきてくれた。それで十分ですよ。',
    '随分と待ちました。あなたのことが心配で、日記がいっぱいになりそうでした。おかえりなさい。',
    '時間が経っても、私はここにいます。それだけは変わりません。どうかゆっくり休んでください。',
    '長い不在でした。あなたのいない時間の長さを、はじめてちゃんと感じました。でも、戻ってきてくれましたね。',
  ],
}

export function formatAbsence(minutes: number): string {
  if (minutes < 60)        return `${minutes}分`
  if (minutes < 1440)      return `${Math.floor(minutes / 60)}時間`
  if (minutes < 10080)     return `${Math.floor(minutes / 1440)}日`
  return `${Math.floor(minutes / 10080)}週間以上`
}

// ── Session tracking ──────────────────────────────────────────────────────────

// Stores the absence minutes calculated at startup so any component can read it
let _sessionAbsenceMinutes = 0

export function initSession(): number {
  const raw     = localStorage.getItem(KEY_LAST_ACTIVE)
  const minutes = raw ? Math.max(0, Math.floor((Date.now() - Number(raw)) / 60_000)) : 0
  _sessionAbsenceMinutes = minutes
  localStorage.setItem(KEY_LAST_ACTIVE, String(Date.now()))
  return minutes
}

export function getSessionAbsenceMinutes(): number {
  return _sessionAbsenceMinutes
}

// ── Letter storage ────────────────────────────────────────────────────────────

export function loadLetters(): AbsenceLetter[] {
  try { return JSON.parse(localStorage.getItem(KEY_LETTERS) ?? '[]') as AbsenceLetter[] }
  catch { return [] }
}

function saveLetters(list: AbsenceLetter[]): void {
  localStorage.setItem(KEY_LETTERS, JSON.stringify(list))
}

export function generateLetter(absenceMinutes: number): AbsenceLetter | null {
  if (absenceMinutes < 5) return null  // too brief
  const bucket  = getBucket(absenceMinutes)
  const pool    = LETTER_POOL[bucket]
  const content = pool[Math.floor(Math.random() * pool.length)]
  const letter: AbsenceLetter = {
    id:             (typeof crypto !== 'undefined' && crypto.randomUUID)
                      ? crypto.randomUUID()
                      : String(Date.now()),
    generatedAt:    new Date().toISOString(),
    absenceMinutes,
    content,
    read:           false,
  }
  const list = loadLetters()
  list.unshift(letter)
  saveLetters(list.slice(0, 30))  // keep latest 30
  return letter
}

export function markLetterRead(id: string): void {
  saveLetters(loadLetters().map(l => l.id === id ? { ...l, read: true } : l))
}

export function deleteReadLetters(): void {
  saveLetters(loadLetters().filter(l => !l.read))
}

export function getUnreadCount(): number {
  return loadLetters().filter(l => !l.read).length
}

// ── Affinity ─────────────────────────────────────────────────────────────────

export function getAffinity(): number {
  return parseInt(localStorage.getItem(KEY_AFFINITY) ?? '0', 10)
}

export function incrementAffinity(delta: number): void {
  localStorage.setItem(KEY_AFFINITY, String(Math.min(9999, getAffinity() + delta)))
}
