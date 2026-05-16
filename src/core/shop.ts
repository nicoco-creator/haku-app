/**
 * 物々交換ショップ
 * 静けさの欠片（silence_shards）を消費してアイテムと交換する。
 */

import { spendShards } from './shards'

// ── アイテム定義 ──────────────────────────────────────────────────────────────

export interface ShopItem {
  id: string
  cost: number
  emoji: string
  name: string
  description: string
  fushigiSays: string
  type: 'permanent' | 'consumable'
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  {
    id: 'frequency_note',
    cost: 30,
    emoji: '🔔',
    name: 'フシギちゃんが選んだ\n環境音の周波数',
    description: 'タイマー画面に特別な周波数フレーズが常時表示されるようになります。',
    fushigiSays: '432Hz。脳の防衛本能が少しだけ緩む、そういう数字らしいですよ。科学か魔法かは、どちらでもかまいません。',
    type: 'permanent',
  },
  {
    id: 'notebook_drawing',
    cost: 60,
    emoji: '✏️',
    name: 'ノートの端の\n抽象的なドローイング',
    description: 'おみやげの小箱に、フシギちゃんが描いた抽象画が1枚追加されます。',
    fushigiSays: 'ノートの端によく書くんです、こういうの。意味はありません。でも、ないことに意味があります。',
    type: 'permanent',
  },
  {
    id: 'certificate',
    cost: 40,
    emoji: '📜',
    name: '「よくがんばりました」\nの承認状',
    description: 'フシギちゃん認定の承認状が道具箱に届きます。心が削られたとき用です。',
    fushigiSays: '採点をやめなさい、と言いたいんじゃないです。ただ、もう十分やったんです。証拠は出せませんが、私が知っています。',
    type: 'consumable',
  },
  {
    id: 'candle_timer',
    cost: 50,
    emoji: '🕯️',
    name: '「ただ、隣にいます」\nの灯火タイマー',
    description: '3分間、ろうそくの光とともにいます。不安の言葉が火の周りをゆっくり漂います。',
    fushigiSays: 'なにも言わなくていいです。ただそこにいて、火を見ていてください。',
    type: 'consumable',
  },
  {
    id: 'clay_knead',
    cost: 60,
    emoji: '🏺',
    name: '「心の重荷」を\n預かる粘土細工',
    description: '3回こねると、重荷が形を変えます。おみやげの小箱に特別なものが加わります。',
    fushigiSays: '重いままでいなくていいです。こねたら、私が持ちます。',
    type: 'consumable',
  },
  {
    id: 'gift_wrap',
    cost: 50,
    emoji: '🎁',
    name: '明日への\n「お守り」のラッピング',
    description: '未来の自分への言葉を包みます。次にアプリを開いたとき、届きます。',
    fushigiSays: '明日のあなたは、今日のあなたと少し違います。それを信じて、渡してあげてください。',
    type: 'consumable',
  },
  {
    id: 'handkerchief',
    cost: 40,
    emoji: '🩹',
    name: 'そっと涙を\n拭うおまじない',
    description: '画面をそっとなぞると、もやが晴れます。ひとつ、流してしまいましょう。',
    fushigiSays: '拭いていいんです。感情は証拠じゃありません。ただ、今ここにあるものです。',
    type: 'consumable',
  },
  {
    id: 'reality_block',
    cost: 100,
    emoji: '🚪',
    name: '現実世界を5分間\n遮断する権利',
    description: '交換した瞬間、5分間の「遮断モード」が始まります。外の世界への扉が閉まります。',
    fushigiSays: '外の世界へ帰るのを禁止します。ここで静かにしていなさい。5分だけ、私のそばにいてください。',
    type: 'consumable',
  },
]

// ── 所持アイテム管理（permanent items） ──────────────────────────────────────

const KEY_ITEMS = 'haku_shop_items'      // JSON: string[]
const KEY_BLOCK = 'haku_block_until'     // number（タイムスタンプ）
const KEY_INV   = 'haku_shop_inventory'  // JSON: Record<string, number>
const KEY_GIFT  = 'haku_reserved_gift'   // JSON: { message: string; writtenAt: string }

function loadItems(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY_ITEMS) ?? '[]') }
  catch { return [] }
}

function saveItems(list: string[]): void {
  localStorage.setItem(KEY_ITEMS, JSON.stringify(list))
}

export function hasItem(id: string): boolean {
  return loadItems().includes(id)
}

export function getOwnedItems(): string[] {
  return loadItems()
}

// ── インベントリ管理（consumable items） ──────────────────────────────────────

type Inventory = Record<string, number>

function loadInventory(): Inventory {
  try { return JSON.parse(localStorage.getItem(KEY_INV) ?? '{}') }
  catch { return {} }
}

function saveInventory(inv: Inventory): void {
  localStorage.setItem(KEY_INV, JSON.stringify(inv))
}

export function getInventoryCount(id: string): number {
  return loadInventory()[id] ?? 0
}

export function addToInventory(id: string): void {
  const inv = loadInventory()
  inv[id] = (inv[id] ?? 0) + 1
  saveInventory(inv)
}

export function useFromInventory(id: string): boolean {
  const inv = loadInventory()
  if (!inv[id] || inv[id] <= 0) return false
  inv[id] -= 1
  if (inv[id] === 0) delete inv[id]
  saveInventory(inv)
  return true
}

// ── 予約済みメッセージ（お守りラッピング） ──────────────────────────────────

export function setReservedGift(message: string): void {
  localStorage.setItem(KEY_GIFT, JSON.stringify({ message, writtenAt: new Date().toISOString() }))
}

export function getReservedGift(): { message: string; writtenAt: string } | null {
  try {
    const raw = localStorage.getItem(KEY_GIFT)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export function clearReservedGift(): void {
  localStorage.removeItem(KEY_GIFT)
}

// ── 購入ロジック ──────────────────────────────────────────────────────────────

export type PurchaseResult =
  | { ok: true;  itemId: string }
  | { ok: false; reason: 'insufficient' | 'already_owned' }

export function purchaseItem(itemId: string): PurchaseResult {
  const def = SHOP_ITEMS.find((i) => i.id === itemId)
  if (!def) return { ok: false, reason: 'insufficient' }

  if (def.type === 'permanent' && hasItem(itemId)) {
    return { ok: false, reason: 'already_owned' }
  }

  if (!spendShards(def.cost)) return { ok: false, reason: 'insufficient' }

  if (def.type === 'permanent') {
    const items = loadItems()
    if (!items.includes(itemId)) saveItems([...items, itemId])
  } else if (itemId === 'reality_block') {
    activateRealityBlock()
  } else {
    addToInventory(itemId)
  }

  return { ok: true, itemId }
}

// ── 遮断モード管理 ────────────────────────────────────────────────────────────

const BLOCK_DURATION_MS = 5 * 60 * 1000

export function activateRealityBlock(): void {
  localStorage.setItem(KEY_BLOCK, String(Date.now() + BLOCK_DURATION_MS))
}

export function getBlockUntil(): number {
  return parseInt(localStorage.getItem(KEY_BLOCK) ?? '0', 10)
}

export function isBlockActive(): boolean {
  return Date.now() < getBlockUntil()
}

export function clearBlock(): void {
  localStorage.removeItem(KEY_BLOCK)
}
