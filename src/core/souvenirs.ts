/**
 * フシギちゃんの気まぐれ交換日記 — おみやげシステム
 * タイマー完了・ミッション達成時に一定確率でアイテムを贈る。
 * shop_drawing のみショップ限定（tryGetSouvenir の抽選から除外）。
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
  shopOnly?: boolean  // true = 抽選から除外、ショップのみ入手可
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
  // ── ショップ限定 ──────────────────────────────────────────────────────────
  {
    id: 'shop_drawing',
    emoji: '✏️',
    name: 'ノートの端のドローイング',
    fushigiSays: 'ノートの端によく書くんです、こういうの。意味はありません。でも、ないことに意味があります。',
    shopOnly: true,
  },
  {
    id: 'clay_star',
    emoji: '⭐',
    name: '粘土から生まれた星',
    fushigiSays: '重かったものが、こんな形になりました。かわいくないですか？',
    shopOnly: true,
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
  if (isSouvenirEarned(id)) return load().find((s) => s.id === id)!
  const entry: EarnedSouvenir = { id, earnedAt: new Date().toISOString() }
  save([...load(), entry])
  return entry
}

/** ショップ購入など、外部から直接付与する場合に使う */
export function grantSouvenir(id: string): EarnedSouvenir {
  return earnSouvenir(id)
}

// ── ガチャロジック ─────────────────────────────────────────────────────────────

/**
 * 指定確率でおみやげを1つ取得する。
 * shopOnly アイテムは抽選から除外。
 * まだ持っていないものを優先し、全部持っていたらランダムで重複選出。
 */
export function tryGetSouvenir(): SouvenirDef | null {
  if (Math.random() >= SOUVENIR_CHANCE) return null

  const earned    = load()
  const earnedIds = new Set(earned.map((e) => e.id))
  const pool      = SOUVENIR_DEFS.filter((d) => !d.shopOnly)

  const unowned = pool.filter((d) => !earnedIds.has(d.id))
  const pick    = unowned.length > 0 ? unowned : pool

  const def = pick[Math.floor(Math.random() * pick.length)]
  earnSouvenir(def.id)
  return def
}
