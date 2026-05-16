/**
 * フシギちゃんの気まぐれ交換日記 — おみやげシステム
 * タイマー完了・ミッション達成時に一定確率でアイテムを贈る。
 */

const KEY = 'haku_souvenirs'

// ── 確率設定（デバッグ時は上げてテスト） ────────────────────────────────────
export const SOUVENIR_CHANCE = 0.10  // 10%

// ── アイテム定義 ─────────────────────────────────────────────────────────────

export interface SouvenirDef {
  id: string
  emoji: string
  name: string
  fushigiSays: string
}

export interface EarnedSouvenir {
  id: string
  earnedAt: string  // ISO date string
}

export const SOUVENIR_DEFS: readonly SouvenirDef[] = [
  {
    id: 'cat_whisker',
    emoji: '🐱',
    name: '猫のひげ',
    fushigiSays: '拾ったんです。きっと猫が落としていったものです。あなたに似合うと思って。',
  },
  {
    id: 'old_stamp',
    emoji: '🎫',
    name: '古い切手',
    fushigiSays: '遠いところから旅してきたものです。宛先は、最初からあなたでした。',
  },
  {
    id: 'glass_shard',
    emoji: '💎',
    name: 'ガラスの破片',
    fushigiSays: '割れているけど、とても綺麗です。あなたに似ているかもしれません。',
  },
  {
    id: 'mint_leaf',
    emoji: '🌿',
    name: 'ミントの葉',
    fushigiSays: 'ちょっと香りを嗅いでみてください。すっとしませんか？たまにはこういうのもいいです。',
  },
  {
    id: 'moonstone',
    emoji: '🌕',
    name: '月の欠片',
    fushigiSays: '夜に拾いました。本物かどうかはわかりません。でも本物みたいに見えます。',
  },
  {
    id: 'white_feather',
    emoji: '🪶',
    name: '白い羽根',
    fushigiSays: 'どこかから飛んできたものです。どこから来たかは、秘密にしておきます。',
  },
  {
    id: 'red_thread',
    emoji: '🧵',
    name: '赤い糸の端っこ',
    fushigiSays: 'どこかに繋がっているはずです。繋がりたい人は、いますか？',
  },
  {
    id: 'rusty_key',
    emoji: '🗝️',
    name: '錆びた小さな鍵',
    fushigiSays: '使い道はわかりません。でも捨てたくなかったんです。あなたが持っていてください。',
  },
]

// ── localStorage 管理 ─────────────────────────────────────────────────────────

function load(): EarnedSouvenir[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
  catch { return [] }
}

function save(list: EarnedSouvenir[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function loadEarnedSouvenirs(): EarnedSouvenir[] {
  return load()
}

export function isSouvenirEarned(id: string): boolean {
  return load().some((s) => s.id === id)
}

function earnSouvenir(id: string): EarnedSouvenir {
  const entry: EarnedSouvenir = { id, earnedAt: new Date().toISOString() }
  save([...load(), entry])
  return entry
}

// ── ガチャロジック ─────────────────────────────────────────────────────────────

/**
 * 指定確率でおみやげを1つ取得する。
 * まだ持っていないものを優先し、全部持っていたらランダムで重複選出。
 * 確率を外れた場合は null を返す。
 */
export function tryGetSouvenir(): SouvenirDef | null {
  if (Math.random() >= SOUVENIR_CHANCE) return null

  const earned = load()
  const earnedIds = new Set(earned.map((e) => e.id))

  // 未獲得のものを優先
  const unowned = SOUVENIR_DEFS.filter((d) => !earnedIds.has(d.id))
  const pool    = unowned.length > 0 ? unowned : [...SOUVENIR_DEFS]

  const def = pool[Math.floor(Math.random() * pool.length)]
  earnSouvenir(def.id)
  return def
}
