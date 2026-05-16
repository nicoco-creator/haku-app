/**
 * RFC 5545 準拠の .ics ファイル生成ユーティリティ。
 * サーバー不要、Blob + URL.createObjectURL でダウンロードを実現する。
 */

function pad(n: number): string { return String(n).padStart(2, '0') }

function toICSLocal(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
         `T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function toICSUTC(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
         `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}

export interface ICSEvent {
  summary:     string
  description: string
  startDate:   Date
  durationMin: number
}

export function generateICS(events: ICSEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//haku-app//FushigiChan//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const ev of events) {
    const end = new Date(ev.startDate.getTime() + ev.durationMin * 60_000)
    const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@haku-app`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toICSUTC(new Date())}`,
      `DTSTART:${toICSLocal(ev.startDate)}`,
      `DTEND:${toICSLocal(end)}`,
      `SUMMARY:${ev.summary}`,
      `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(ics: string, filename = 'fushigi-chan.ics'): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const PRESET_NAMES = [
  'フシギちゃんとのお茶の時間',
  '部屋を片付ける気配',
  '少し休む約束',
  '気持ちを整理する時間',
  '今日の振り返り',
  'フシギちゃんへの近況報告',
  '空白のじかん',
  '小さな休憩',
] as const
