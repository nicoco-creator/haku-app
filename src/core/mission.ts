const KEY_TODAY  = 'haku_mission_today'   // { date: 'YYYY-MM-DD', idx: number, done: boolean }
const KEY_COUNT  = 'haku_mission_count'   // cumulative completion count (number)

export interface MissionState {
  date: string
  idx: number
  done: boolean
}

const MISSIONS: readonly string[] = [
  '今日、水を1杯だけ飲む',
  '窓の外を30秒だけ見る',
  '深呼吸を3回、ゆっくりやってみる',
  '今日いちばん好きだった時間を、心の中だけで言語化する',
  '使っていないタブを1つ閉じる',
  '今の姿勢を、1ミリだけ整える',
  '誰にも言わなくていい秘密の感想を、今日の何かに持つ',
  '今日の天気を、ただ観察する',
  '5秒だけ目を閉じる',
  '今日の自分に、心の中で「お疲れ」と言う',
  '1つだけ、片付けないでいたものを片付ける',
  '好きなものの名前を、心の中で3つ挙げる',
  '今日食べたものを、1つだけ思い出す',
  '体のどこかが緊張していないか、確認する',
  '今日やらなかったことを、責めない練習をする',
  '何かの匂いを、意識して嗅いでみる',
  '1行だけ、どこかに何かを書く',
  '自分のために、何か小さな決定をする',
  '今日、静かだと思った瞬間を1つ探す',
  '誰かに「ありがとう」を心の中だけで送る',
]

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function loadState(): MissionState | null {
  try {
    const raw = localStorage.getItem(KEY_TODAY)
    if (!raw) return null
    return JSON.parse(raw) as MissionState
  } catch {
    return null
  }
}

function saveState(s: MissionState): void {
  localStorage.setItem(KEY_TODAY, JSON.stringify(s))
}

export function getTodayMission(): { text: string; done: boolean } {
  const today = todayStr()
  const state = loadState()

  if (state && state.date === today) {
    return { text: MISSIONS[state.idx], done: state.done }
  }

  // Pick deterministic index from date string (simple hash)
  const hash = today.replace(/-/g, '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const idx = hash % MISSIONS.length
  const next: MissionState = { date: today, idx, done: false }
  saveState(next)
  return { text: MISSIONS[idx], done: false }
}

export function completeTodayMission(): number {
  const today = todayStr()
  const state = loadState()
  if (!state || state.date !== today || state.done) return getCumulativeCount()

  saveState({ ...state, done: true })

  const prev = getCumulativeCount()
  const next = prev + 1
  localStorage.setItem(KEY_COUNT, String(next))
  return next
}

export function getCumulativeCount(): number {
  return parseInt(localStorage.getItem(KEY_COUNT) ?? '0', 10)
}
