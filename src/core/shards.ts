/**
 * 静けさの欠片（silence_shards）— アプリ内独自通貨
 * 逆オークションで獲得し、物々交換ショップで消費する。
 */

const KEY = 'haku_silence_shards'

export function getShards(): number {
  return parseInt(localStorage.getItem(KEY) ?? '0', 10)
}

export function addShards(n: number): void {
  localStorage.setItem(KEY, String(Math.max(0, getShards() + n)))
}

/** 消費。残高不足の場合は何もせず false を返す。 */
export function spendShards(n: number): boolean {
  const current = getShards()
  if (current < n) return false
  localStorage.setItem(KEY, String(current - n))
  return true
}
