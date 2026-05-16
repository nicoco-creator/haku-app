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

const KEY_ITEMS = 'haku_shop_items'   // JSON: string[]
const KEY_BLOCK = 'haku_block_until'  // number（タイムスタンプ）

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

// ── 購入ロジック ──────────────────────────────────────────────────────────────

export type PurchaseResult =
  | { ok: true;  itemId: string }
  | { ok: false; reason: 'insufficient' | 'already_owned' }

export function purchaseItem(itemId: string): PurchaseResult {
  const def = SHOP_ITEMS.find((i) => i.id === itemId)
  if (!def) return { ok: false, reason: 'insufficient' }

  // permanentアイテムは重複購入不可
  if (def.type === 'permanent' && hasItem(itemId)) {
    return { ok: false, reason: 'already_owned' }
  }

  // 残高チェック＆消費
  if (!spendShards(def.cost)) return { ok: false, reason: 'insufficient' }

  // 処理
  if (def.type === 'permanent') {
    const items = loadItems()
    if (!items.includes(itemId)) saveItems([...items, itemId])
  } else if (itemId === 'reality_block') {
    activateRealityBlock()
  }

  return { ok: true, itemId }
}

// ── 遮断モード管理 ────────────────────────────────────────────────────────────

const BLOCK_DURATION_MS = 5 * 60 * 1000  // 5分

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
