import Dexie, { type EntityTable } from 'dexie'

// ── Table interfaces ─────────────────────────────────────────────────────────

export interface Post {
  id?: number
  date: string
  content: string
  source: 'threads' | 'manual'
  createdAt: string
}

export interface Study {
  id?: number
  subject: string
  content: string
  chapter?: string
  page?: number
  mediaType?: 'text' | 'pdf' | 'image'
  needsOcr?: boolean
  imageData?: string
  status: 'todo' | 'doing' | 'done'
  createdAt: string
}

export interface Schedule {
  id?: number
  examDate: string
  dailyLoad: number
  subject: string
  totalSections?: number
  createdAt: string
}

export interface QAPair {
  q: string
  a: string
}

export interface Journal {
  id?: number
  date: string
  goodThings: string
  qaPairs: QAPair[]
  createdAt: string
}

export interface GoodDay {
  id?: number
  date: string
  content: string
  createdAt: string
}

export interface Waiting {
  id?: number
  target: string
  content: string
  since: string
  expectation: string
  recallToday?: boolean
  createdAt: string
}

export interface VaultNote {
  id?: number
  content: string
  createdAt: string
  updatedAt: string
}

export interface ChatLog {
  id?: number
  role: 'user' | 'fushigi'
  text: string
  mood?: string
  createdAt: string
}

export interface Metric {
  id?: number
  date: string
  postCount: number
  sleepHours?: number
  positiveDensity: number
  alertLevel: 0 | 1 | 2 | 3
}

export interface SeenStat {
  id?: number
  date: string
  openCount: number
  charsWritten: number
  companionTime: number
  idleCompanionTime: number
}

export interface NewsReport {
  id?: number
  date: string           // YYYY-MM-DD
  category: string       // category id
  categoryLabel: string
  categoryEmoji: string
  content: string        // AI response text ('' if PDF-only)
  pdfBlob?: Blob         // imported PDF file
  reportType?: 'text' | 'pdf'
  createdAt: string      // ISO timestamp
}

export interface BGMTrack {
  id?:       number
  name:      string
  audioBlob: Blob
  createdAt: string
}

// ── Database class ────────────────────────────────────────────────────────────

class HakuDatabase extends Dexie {
  posts!:       EntityTable<Post,       'id'>
  studies!:     EntityTable<Study,      'id'>
  schedules!:   EntityTable<Schedule,   'id'>
  journals!:    EntityTable<Journal,    'id'>
  goodDays!:    EntityTable<GoodDay,    'id'>
  waitings!:    EntityTable<Waiting,    'id'>
  vaultNotes!:  EntityTable<VaultNote,  'id'>
  chatLogs!:    EntityTable<ChatLog,    'id'>
  metrics!:     EntityTable<Metric,     'id'>
  seenStats!:   EntityTable<SeenStat,   'id'>
  newsReports!: EntityTable<NewsReport, 'id'>
  bgmTracks!:   EntityTable<BGMTrack,   'id'>

  constructor() {
    super('HakuDB')
    this.version(1).stores({
      posts:      '++id, date, source, createdAt',
      studies:    '++id, subject, status, createdAt',
      schedules:  '++id, examDate, createdAt',
      journals:   '++id, date, createdAt',
      goodDays:   '++id, date, createdAt',
      waitings:   '++id, target, since, createdAt',
      vaultNotes: '++id, createdAt, updatedAt',
      chatLogs:   '++id, role, createdAt',
      metrics:    '++id, date',
      seenStats:  '++id, date',
    })
    // v2: mediaType index for studies, subject index for schedules
    this.version(2).stores({
      studies:   '++id, subject, status, mediaType, createdAt',
      schedules: '++id, examDate, subject, createdAt',
    })
    // v3: daily news reports
    this.version(3).stores({
      newsReports: '++id, date, category, createdAt',
    })
    // v4: BGM imported tracks
    this.version(4).stores({
      bgmTracks: '++id, name, createdAt',
    })
  }
}

export const db = new HakuDatabase()

// ── Generic CRUD factory ──────────────────────────────────────────────────────
// EntityTable<T,'id'> の IDType が number に解決されないため、
// Dexie.Table<T, number> にキャストして渡す。

function makeHelpers<T extends { id?: number }>(rawTable: EntityTable<T, 'id'>) {
  const table = rawTable as unknown as Dexie.Table<T, number>
  return {
    add(item: Omit<T, 'id'>): Promise<number> {
      return table.add(item as T)
    },
    get(id: number): Promise<T | undefined> {
      return table.get(id)
    },
    list(): Promise<T[]> {
      return table.orderBy('id').toArray()
    },
    update(id: number, changes: Partial<T>): Promise<number> {
      // UpdateSpec<T> は Partial<T> のスーパーセット。実行時は同一形式。
      return table.update(id, changes as Parameters<typeof table.update>[1])
    },
    delete(id: number): Promise<void> {
      return table.delete(id)
    },
    listByDateRange(start: string, end: string, field = 'date'): Promise<T[]> {
      return table.filter((item) => {
        const val = (item as Record<string, unknown>)[field]
        return typeof val === 'string' && val >= start && val <= end
      }).toArray()
    },
  }
}

// ── Per-table helpers (re-exported for convenience) ───────────────────────────

export const posts       = makeHelpers(db.posts)
export const studies     = makeHelpers(db.studies)
export const schedules   = makeHelpers(db.schedules)
export const journals    = makeHelpers(db.journals)
export const goodDays    = makeHelpers(db.goodDays)
export const waitings    = makeHelpers(db.waitings)
export const vaultNotes  = makeHelpers(db.vaultNotes)
export const chatLogs    = makeHelpers(db.chatLogs)
export const metrics     = makeHelpers(db.metrics)
export const seenStats   = makeHelpers(db.seenStats)
export const newsReports = makeHelpers(db.newsReports)
export const bgmTracks   = makeHelpers(db.bgmTracks)
