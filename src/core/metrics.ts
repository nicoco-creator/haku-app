import { db, posts, metrics } from './db'
import { calcPositiveDensity } from './lexicon'
import { useAppStore } from './store'

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function dateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const LAST_CALC_KEY = 'haku_metrics_last_calc'

// ── recordDailyMetrics ────────────────────────────────────────────────────────
// 指定日の投稿を集計し metrics テーブルに upsert する（冪等）

export async function recordDailyMetrics(date: string): Promise<void> {
  const dayPosts = await posts.listByDateRange(date, date)
  const postCount = dayPosts.length
  const positiveDensity =
    postCount > 0
      ? dayPosts.reduce((s, p) => s + calcPositiveDensity(p.content), 0) / postCount
      : 0.5

  const existing = await db.metrics.where('date').equals(date).first()
  if (existing?.id !== undefined) {
    await metrics.update(existing.id, { postCount, positiveDensity })
  } else {
    await metrics.add({ date, postCount, positiveDensity, alertLevel: 0 })
  }
}

// ── calculateAlertLevel ───────────────────────────────────────────────────────
// 過去14日の指標を使ってアラートレベル 0-3 を返す
//
// スコア計算（複数トリガーの合計）:
//   postCount が14日平均の 2倍超          → +1
//   positiveDensity が14日平均の 1.5倍超  → +2（テンション急上昇は2倍重み）
//   今日の総文字数が14日平均の 2倍超      → +1
//   フシギちゃん未対話 3日以上            → +1
//
//   score 0→level 0, 1→level 1, 2→level 2, 3+→level 3

export async function calculateAlertLevel(): Promise<0 | 1 | 2 | 3> {
  const today = todayStr()
  await recordDailyMetrics(today)

  const start14 = dateNDaysAgo(13)
  const recentMetrics = await metrics.listByDateRange(start14, today)

  const todayMetric = recentMetrics.find((m) => m.date === today)
  if (!todayMetric) return 0

  const baseline = recentMetrics.filter((m) => m.date !== today)
  if (baseline.length === 0) return 0

  // 14日平均（今日を除く）
  const avgPostCount =
    baseline.reduce((s, m) => s + m.postCount, 0) / baseline.length
  const avgPosDensity =
    baseline.reduce((s, m) => s + m.positiveDensity, 0) / baseline.length

  // 今日・過去の総文字数（DB から直接集計）
  const todayPosts   = await posts.listByDateRange(today, today)
  const todayChars   = todayPosts.reduce((s, p) => s + p.content.length, 0)

  const baselineDates = baseline.map((m) => m.date)
  const baselinePostsAll = await posts.listByDateRange(baselineDates[baselineDates.length - 1], baselineDates[0])
  const charsByDate = new Map<string, number>()
  for (const p of baselinePostsAll) {
    charsByDate.set(p.date, (charsByDate.get(p.date) ?? 0) + p.content.length)
  }
  const avgChars =
    baseline.length > 0
      ? [...charsByDate.values()].reduce((s, v) => s + v, 0) / baseline.length
      : 0

  // フシギちゃん最終対話日数
  const lastChat = await db.chatLogs.orderBy('createdAt').last()
  const companionInactiveDays = lastChat
    ? Math.floor((Date.now() - new Date(lastChat.createdAt).getTime()) / 86_400_000)
    : 999

  // トリガー集計
  let score = 0
  if (avgPostCount > 0 && todayMetric.postCount > avgPostCount * 2)       score += 1
  if (avgPosDensity > 0 && todayMetric.positiveDensity > avgPosDensity * 1.5) score += 2
  if (avgChars > 0 && todayChars > avgChars * 2)                          score += 1
  if (companionInactiveDays >= 3)                                         score += 1

  const level = Math.min(3, score) as 0 | 1 | 2 | 3

  // 計算結果を metrics に書き戻す
  const fresh = await db.metrics.where('date').equals(today).first()
  if (fresh?.id !== undefined) {
    await metrics.update(fresh.id, { alertLevel: level })
  }

  return level
}

// ── getAlertDiagnostics ───────────────────────────────────────────────────────
// 現在の指標とトリガー状況を返す（設定画面での「条件を見る」用）

export interface AlertDiagnostics {
  todayPostCount:       number
  avgPostCount:         number
  postCountTriggered:   boolean
  todayPosDensity:      number
  avgPosDensity:        number
  posDensityTriggered:  boolean
  todayChars:           number
  avgChars:             number
  charsTriggered:       boolean
  companionInactiveDays: number
  companionTriggered:   boolean
  rawScore:             number
  calculatedLevel:      0 | 1 | 2 | 3
}

export async function getAlertDiagnostics(): Promise<AlertDiagnostics> {
  const today   = todayStr()
  const start14 = dateNDaysAgo(13)
  await recordDailyMetrics(today)

  const recentMetrics = await metrics.listByDateRange(start14, today)
  const todayMetric   = recentMetrics.find((m) => m.date === today)
  const baseline      = recentMetrics.filter((m) => m.date !== today)

  const avgPostCount  = baseline.length ? baseline.reduce((s, m) => s + m.postCount, 0) / baseline.length : 0
  const avgPosDensity = baseline.length ? baseline.reduce((s, m) => s + m.positiveDensity, 0) / baseline.length : 0

  const todayPosts = await posts.listByDateRange(today, today)
  const todayChars = todayPosts.reduce((s, p) => s + p.content.length, 0)

  const baselineDates    = baseline.map((m) => m.date)
  const baselinePostsAll = baselineDates.length
    ? await posts.listByDateRange(baselineDates[baselineDates.length - 1], baselineDates[0])
    : []
  const charsByDate = new Map<string, number>()
  for (const p of baselinePostsAll) {
    charsByDate.set(p.date, (charsByDate.get(p.date) ?? 0) + p.content.length)
  }
  const avgChars = baseline.length
    ? [...charsByDate.values()].reduce((s, v) => s + v, 0) / baseline.length
    : 0

  const lastChat = await db.chatLogs.orderBy('createdAt').last()
  const companionInactiveDays = lastChat
    ? Math.floor((Date.now() - new Date(lastChat.createdAt).getTime()) / 86_400_000)
    : 999

  const todayPostCount  = todayMetric?.postCount      ?? 0
  const todayPosDensity = todayMetric?.positiveDensity ?? 0.5

  const postCountTriggered  = avgPostCount  > 0 && todayPostCount  > avgPostCount  * 2
  const posDensityTriggered = avgPosDensity > 0 && todayPosDensity > avgPosDensity * 1.5
  const charsTriggered      = avgChars      > 0 && todayChars      > avgChars      * 2
  const companionTriggered  = companionInactiveDays >= 3

  let rawScore = 0
  if (postCountTriggered)  rawScore += 1
  if (posDensityTriggered) rawScore += 2
  if (charsTriggered)      rawScore += 1
  if (companionTriggered)  rawScore += 1

  return {
    todayPostCount, avgPostCount, postCountTriggered,
    todayPosDensity, avgPosDensity, posDensityTriggered,
    todayChars, avgChars, charsTriggered,
    companionInactiveDays, companionTriggered,
    rawScore,
    calculatedLevel: Math.min(3, rawScore) as 0 | 1 | 2 | 3,
  }
}

// ── syncAlertLevel ────────────────────────────────────────────────────────────
// アプリ起動時・日付切り替わり時に呼ぶ。
// override（一時停止 / "私はいま大丈夫"）を反映した上で zustand を更新する。

export async function syncAlertLevel(): Promise<void> {
  const today = todayStr()
  const last  = localStorage.getItem(LAST_CALC_KEY)

  if (last && last < today) await recordDailyMetrics(last)

  const store = useAppStore.getState()

  // override チェック
  const isPaused  = store.alertPaused
  const isOk      = store.alertOkUntil !== null && Date.now() < store.alertOkUntil

  if (isPaused || isOk) {
    localStorage.setItem(LAST_CALC_KEY, today)
    store.setAlertLevel(0)
    return
  }

  const level = await calculateAlertLevel()
  localStorage.setItem(LAST_CALC_KEY, today)
  store.setAlertLevel(level)
}
