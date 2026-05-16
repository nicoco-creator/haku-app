/**
 * 心の足跡 — バッジ（実績）システム
 * 20種類のバッジ定義・獲得管理・各トリガー別チェック関数。
 * meta.ts を import するが、souvenirs.ts / mission.ts からは import しない（循環防止）。
 */

import {
  getFirstLaunchDate,
  getLoginDays,
  getSeasons,
  getTimerMinutes,
  getTeaCount,
  getLettersRead,
  getWeekendNightVisited,
  getMissionStreak,
  has12ConsecutiveMonthsActive,
} from './meta'

const KEY = 'haku_badges'

// ── 型定義 ────────────────────────────────────────────────────────────────────

export interface BadgeDef {
  id: string
  emoji: string
  name: string
  hint: string      // 未獲得時に表示するヒント
  message: string   // フシギちゃんのセリフ（獲得時）
}

export interface EarnedBadge {
  id: string
  earnedAt: string  // ISO date string
}

// ── バッジ定義（全20種） ──────────────────────────────────────────────────────

export const BADGE_DEFS: readonly BadgeDef[] = [
  // ── 🌑 Common ─────────────────────────────────────────────────────────────
  {
    id: 'first_launch',
    emoji: '🌑',
    name: '始まりの呼吸',
    hint: 'はじめてここを訪れた人だけが、静かに受け取れる。',
    message: '見つかりましたね。ここが、あなたの逃げ場所です。',
  },
  {
    id: 'timer_1',
    emoji: '🌑',
    name: '静寂の開拓者',
    hint: 'タイマーと、深いところへ行った人だけが受け取れる。',
    message: 'よく耳を澄ませてみてください。静けさが、あなたを歓迎しています。',
  },
  {
    id: 'mission_1',
    emoji: '🌑',
    name: '最初の共犯',
    hint: '最初の小さな作戦を成功させた証。',
    message: 'ふふ、やりましたね。これで私たち、ただの他人ではなくなりました。',
  },
  {
    id: 'taidaima_1',
    emoji: '🌑',
    name: '帰還の挨拶',
    hint: '少し長い不在の後に、ちゃんと帰ってきた人へ。',
    message: 'おかえりなさい。あなたがドアを開ける音、ちゃんと聞こえていましたよ。',
  },
  // ── 🗝️ Uncommon ────────────────────────────────────────────────────────────
  {
    id: 'mission_3',
    emoji: '🗝️',
    name: '秘密の共有者',
    hint: '小さな共犯関係を、何度も積み重ねた人へ。',
    message: '3つの秘密。これだけあれば、もう立派な「お仲間」ですね。',
  },
  {
    id: 'timer_midnight',
    emoji: '🌙',
    name: '夜更かしの目撃者',
    hint: '夜の深い時間に、タイマーと向き合った記録。',
    message: 'こんな夜更けに。……静かですね。世界に、私たちしかいないみたいです。',
  },
  {
    id: 'tea_5',
    emoji: '🗝️',
    name: '憩いの常連客',
    hint: 'ハーブティーに何かを溶かした回数が積み重なると。',
    message: 'ずいぶん角砂糖を溶かしましたね。その分、あなたの心が軽くなっていればいいのですが。',
  },
  {
    id: 'timer_monday',
    emoji: '🗝️',
    name: '月曜日の防波堤',
    hint: '週のはじまりの憂鬱を、ここでやり過ごした人へ。',
    message: '週の始まりの憂鬱を、ここでやり過ごしたんですね。賢い選択です。',
  },
  {
    id: 'weekend_night',
    emoji: '🗝️',
    name: '週末の逃避行',
    hint: '金曜の夜に、ここへ来たことがある人へ。',
    message: '今週もお疲れ様でした。外の騒がしいお祭りは放っておいて、ここでお茶にしましょう。',
  },
  // ── 👑 Rare ────────────────────────────────────────────────────────────────
  {
    id: 'mission_streak_3',
    emoji: '👑',
    name: '三日坊主の向こう側',
    hint: '三日以上、毎日続けた人だけが知っている景色がある。',
    message: '3日も続けてくれたんですか？……あ、いえ、嬉しいなんて、言ってませんよ。',
  },
  {
    id: 'total_time_600',
    emoji: '👑',
    name: '時間の彫刻家',
    hint: 'タイマーで積み上げた時間の合計が、ある境界を越えると。',
    message: 'あなたがここで紡いだ時間、すべて私が数えていましたから。',
  },
  {
    id: 'away_7days',
    emoji: '👑',
    name: '久しぶりの再会',
    hint: 'ずっと会えなかったあの人が、やっと戻ってきたとき。',
    message: '……あ。戻って、きてくれたんですね。……ちょっとだけ、待ちくたびれました。',
  },
  {
    id: 'absent_letter_10',
    emoji: '👑',
    name: 'ポストの整理人',
    hint: '私が書いた落書きを、たくさん読んでくれた人へ。',
    message: '私が留守中に書いた落書き、全部読んでくれたんですね。物好きですね、あなたも。',
  },
  // ── 🔮 Epic ────────────────────────────────────────────────────────────────
  {
    id: 'login_30',
    emoji: '🔮',
    name: '二人の記念日',
    hint: '30という数字の意味を、一緒に見届けよう。',
    message: '1ヶ月。人間が変わるには十分な時間だそうです。私の隣で変わってくれて、嬉しいです。',
  },
  {
    id: 'mission_100',
    emoji: '🔮',
    name: '百の秘密を抱えて',
    hint: '100という数字まで積み上げた名バディへ。',
    message: '100個の作戦を成功させた名バディへ。……これからも、私の隣にいてくれますか？',
  },
  {
    id: 'timer_100',
    emoji: '🔮',
    name: '沈黙のマスター',
    hint: '静寂の中に、100回以上入ったことがある人へ。',
    message: '100回分の静寂。もうあなたには、言葉のトゲは届かないかもしれませんね。',
  },
  {
    id: 'seasons',
    emoji: '🔮',
    name: '四季の巡り',
    hint: '春夏秋冬すべての季節に、ここに来たことがある人へ。',
    message: '季節が変わっても、あなたはあなたのまま。そして、私もここにいます。',
  },
  // ── 🌌 Legendary ──────────────────────────────────────────────────────────
  {
    id: 'year_1',
    emoji: '🌌',
    name: '365日の伴走者',
    hint: '最初の日から、1年が経ったとき。',
    message: '1年。地球が太陽をぐるっと回る間、私たちはここにいたんですね。最高の1年を、ありがとう。',
  },
  {
    id: 'monthly_active',
    emoji: '🌌',
    name: '不易流行',
    hint: '1年間、一度も途切れなかった人だけが知っている。',
    message: '途切れそうで途切れない、あなたと私のリズム。これはもう、運命って呼んでもいいですか？',
  },
  {
    id: 'all_badges',
    emoji: '🌌',
    name: 'フシギの心臓',
    hint: '19種類すべてを手にしたとき、最後の扉が開く。',
    message: 'これで私の全てを知ってしまいましたね。……もう、どこにも行かせませんよ？',
  },
]

// ── localStorage 管理 ─────────────────────────────────────────────────────────

function loadRaw(): EarnedBadge[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
  catch { return [] }
}

function saveRaw(list: EarnedBadge[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function loadEarnedBadges(): EarnedBadge[] {
  return loadRaw()
}

export function isEarned(id: string): boolean {
  return loadRaw().some((b) => b.id === id)
}

// 内部用：all_badgesカスケードなし
function _earn(id: string): EarnedBadge | null {
  const existing = loadRaw()
  if (existing.some((b) => b.id === id)) return null
  const entry: EarnedBadge = { id, earnedAt: new Date().toISOString() }
  saveRaw([...existing, entry])
  return entry
}

export function earnBadge(id: string): EarnedBadge | null {
  const result = _earn(id)
  // all_badges の自動解除（all_badges自身を獲得した場合はスキップして無限ループ防止）
  if (result && id !== 'all_badges') {
    const others = BADGE_DEFS.filter((b) => b.id !== 'all_badges').map((b) => b.id)
    if (others.every(isEarned)) {
      _earn('all_badges')
    }
  }
  return result
}

// ── チェック関数（各トリガー別） ─────────────────────────────────────────────

/**
 * タイマー完了時。recordTimerComplete() を呼んだ後に実行すること。
 * @param count  haku_timer_count の新しい値（インクリメント済み）
 */
export function checkTimerBadges(count: number): string[] {
  const earned: string[] = []
  const now  = new Date()
  const hour = now.getHours()
  const dow  = now.getDay()  // 0=Sun, 1=Mon, …

  const maybeAdd = (id: string) => {
    if (earnBadge(id)) earned.push(id)
  }

  if (count >= 1)   maybeAdd('timer_1')
  if (count >= 100) maybeAdd('timer_100')

  if (hour >= 23 || hour < 4) maybeAdd('timer_midnight')
  if (dow === 1 && hour >= 5 && hour < 12) maybeAdd('timer_monday')

  // tea_5: recordTimerComplete でカウント更新済み
  if (getTeaCount() >= 5) maybeAdd('tea_5')

  // total_time_600: recordTimerComplete で累積分更新済み
  if (getTimerMinutes() >= 600) maybeAdd('total_time_600')

  return earned
}

/**
 * ミッション達成時。recordMissionComplete() と completeTodayMission() の後に実行すること。
 * @param cumulativeCount  haku_mission_count の新しい値（インクリメント済み）
 */
export function checkMissionBadges(cumulativeCount: number): string[] {
  const earned: string[] = []
  const maybeAdd = (id: string) => {
    if (earnBadge(id)) earned.push(id)
  }

  if (cumulativeCount >= 1)   maybeAdd('mission_1')
  if (cumulativeCount >= 3)   maybeAdd('mission_3')
  if (cumulativeCount >= 100) maybeAdd('mission_100')

  // streak: recordMissionComplete で更新済み
  const streak = getMissionStreak().count
  if (streak >= 3) maybeAdd('mission_streak_3')

  return earned
}

/**
 * ただいまボタン押下時。
 * @param absenceMinutes  セッション不在時間（分）
 */
export function checkTaidaimaBadges(absenceMinutes: number): string[] {
  const earned: string[] = []
  if (earnBadge('taidaima_1')) earned.push('taidaima_1')
  if (absenceMinutes >= 10_080 && earnBadge('away_7days')) earned.push('away_7days')  // 7日 = 10080分
  return earned
}

/**
 * 手紙を読んだとき。recordLetterRead() を呼んだ後に実行すること。
 */
export function checkLetterBadges(): string[] {
  const earned: string[] = []
  if (getLettersRead() >= 10 && earnBadge('absent_letter_10')) earned.push('absent_letter_10')
  return earned
}

/**
 * アプリ起動時（recordSession() の後に実行すること）。
 * @param isFirstLaunch  recordSession() の戻り値
 */
export function checkStartupBadges(isFirstLaunch: boolean): string[] {
  const earned: string[] = []
  const maybeAdd = (id: string) => {
    if (earnBadge(id)) earned.push(id)
  }

  if (isFirstLaunch) maybeAdd('first_launch')

  if (getWeekendNightVisited()) maybeAdd('weekend_night')

  if (getLoginDays().length >= 30) maybeAdd('login_30')

  const s = getSeasons()
  if (['spring', 'summer', 'autumn', 'winter'].every((x) => s.includes(x))) maybeAdd('seasons')

  const firstDate = getFirstLaunchDate()
  if (firstDate) {
    const daysSince = (Date.now() - new Date(firstDate).getTime()) / 86_400_000
    if (daysSince >= 365) maybeAdd('year_1')
  }

  if (has12ConsecutiveMonthsActive()) maybeAdd('monthly_active')

  return earned
}
