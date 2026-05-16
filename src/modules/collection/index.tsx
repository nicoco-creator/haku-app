import { useState } from 'react'
import { ModuleShell } from '../../ui/ModuleShell'
import { GlassCard } from '../../ui/GlassCard'
import { colors } from '../../ui/tokens'
import { BADGE_DEFS, loadEarnedBadges, isEarned } from '../../core/badges'
import { SOUVENIR_DEFS, loadEarnedSouvenirs, isSouvenirEarned, grantSouvenir } from '../../core/souvenirs'
import { SHOP_ITEMS, hasItem, purchaseItem, getInventoryCount, useFromInventory } from '../../core/shop'
import { getShards } from '../../core/shards'
import { CertificateOverlay } from '../../ui/overlays/CertificateOverlay'
import { CandleTimerOverlay } from '../../ui/overlays/CandleTimerOverlay'
import { ClayKneadOverlay } from '../../ui/overlays/ClayKneadOverlay'
import { GiftWrapOverlay } from '../../ui/overlays/GiftWrapOverlay'
import { HandkerchiefOverlay } from '../../ui/overlays/HandkerchiefOverlay'

// ── Abstract Art for shop_drawing souvenir ────────────────────────────────────

function AbstractDrawing() {
  return (
    <pre style={{
      fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6,
      color: colors.text.secondary, textAlign: 'center',
      letterSpacing: '0.18em', margin: 0,
    }}>
      {`∿  ∿  ✦  ·  ·\n∿  ◈  ∘  ◌  ·\n✦  ∘  ▪  ∘  ✦\n·  ◌  ∘  ◈  ∿\n·  ·  ✦  ∿  ∿`}
    </pre>
  )
}

// ── Badge card ────────────────────────────────────────────────────────────────

function BadgeCard({ id }: { id: string }) {
  const def     = BADGE_DEFS.find((b) => b.id === id)!
  const earned  = isEarned(id)
  const entry   = loadEarnedBadges().find((b) => b.id === id)
  const dateStr = entry?.earnedAt.slice(0, 10) ?? null

  return (
    <GlassCard
      size="sm"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 8, textAlign: 'center', padding: '16px 12px',
        opacity: earned ? 1 : 0.5,
      }}
    >
      <span style={{ fontSize: 36, lineHeight: 1, filter: earned ? 'none' : 'grayscale(1) brightness(0.4)' }}>
        {earned ? def.emoji : '？'}
      </span>
      <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: earned ? colors.text.primary : colors.text.secondary, lineHeight: 1.4 }}>
        {earned ? def.name : '？？？'}
      </p>
      {earned && dateStr && (
        <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary }}>{dateStr}</p>
      )}
      <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 11, color: colors.text.secondary, lineHeight: 1.6 }}>
        {earned ? def.message : def.hint}
      </p>
    </GlassCard>
  )
}

// ── Souvenir card ─────────────────────────────────────────────────────────────

function SouvenirCard({ id }: { id: string }) {
  const def     = SOUVENIR_DEFS.find((s) => s.id === id)!
  const earned  = isSouvenirEarned(id)
  const entry   = loadEarnedSouvenirs().find((s) => s.id === id)
  const dateStr = entry?.earnedAt.slice(0, 10) ?? null

  return (
    <GlassCard
      size="sm"
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 6, textAlign: 'center', padding: '14px 10px',
        opacity: earned ? 1 : 0.45,
      }}
    >
      {id === 'shop_drawing' && earned ? (
        <AbstractDrawing />
      ) : (
        <span style={{ fontSize: 30, lineHeight: 1, filter: earned ? 'none' : 'grayscale(1) brightness(0.35)' }}>
          {earned ? def.emoji : '📦'}
        </span>
      )}
      <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: earned ? colors.text.primary : colors.text.secondary, lineHeight: 1.4 }}>
        {earned ? def.name : (def.shopOnly ? '特別な方法でのみ入手可能' : '？？？')}
      </p>
      {earned && dateStr && (
        <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 10, color: colors.text.secondary }}>{dateStr}</p>
      )}
      {earned && (
        <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 10, color: colors.text.secondary, lineHeight: 1.6 }}>
          {def.fushigiSays}
        </p>
      )}
    </GlassCard>
  )
}

// ── Toolbox (道具箱) ──────────────────────────────────────────────────────────

const CONSUMABLE_IDS = ['certificate', 'candle_timer', 'clay_knead', 'gift_wrap', 'handkerchief']

interface ToolboxProps {
  onUse: (id: string) => void
  refreshKey: number
}

function Toolbox({ onUse, refreshKey }: ToolboxProps) {
  void refreshKey  // re-render trigger
  const items = CONSUMABLE_IDS
    .map((id) => ({ ...(SHOP_ITEMS.find((s) => s.id === id)!), count: getInventoryCount(id) }))
    .filter((item) => item.count > 0)

  if (items.length === 0) {
    return (
      <p style={{
        textAlign: 'center',
        fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
        fontSize: 12, color: `${colors.text.secondary}80`,
        lineHeight: 1.8, margin: '4px 0 0',
      }}>
        道具箱は空です
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 16, padding: '12px 14px',
          }}
        >
          <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: '0 0 2px',
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 13, color: colors.text.primary,
              lineHeight: 1.4, whiteSpace: 'pre-line',
            }}>
              {item.name}
            </p>
            <p style={{
              margin: 0,
              fontFamily: 'Inter,sans-serif', fontSize: 10,
              color: colors.text.secondary,
            }}>
              ×{item.count}
            </p>
          </div>
          <button
            onClick={() => onUse(item.id)}
            style={{
              flexShrink: 0,
              padding: '7px 18px', borderRadius: 14,
              border: `1px solid ${colors.accent.silver}55`,
              background: `${colors.accent.silver}14`,
              color: colors.text.primary,
              fontFamily: "'Noto Serif JP',serif", fontWeight: 300,
              fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            使う
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Shop tab ──────────────────────────────────────────────────────────────────

interface ShopTabProps {
  onUseItem: (id: string) => void
  toolboxKey: number
}

function ShopTab({ onUseItem, toolboxKey }: ShopTabProps) {
  const [shards, setShards]   = useState(getShards)
  const [owned,  setOwned]    = useState(() => SHOP_ITEMS.map((i) => hasItem(i.id)))
  const [flash,  setFlash]    = useState<Record<string, string>>({})

  const refresh = () => {
    setShards(getShards())
    setOwned(SHOP_ITEMS.map((i) => hasItem(i.id)))
  }

  const handleBuy = (itemId: string) => {
    const result = purchaseItem(itemId)

    if (result.ok) {
      if (itemId === 'notebook_drawing') grantSouvenir('shop_drawing')
      refresh()
      setFlash((f) => ({ ...f, [itemId]: 'ok' }))
      setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[itemId]; return n }), 3000)
    } else {
      const msg = result.reason === 'already_owned' ? 'already' : 'poor'
      setFlash((f) => ({ ...f, [itemId]: msg }))
      setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[itemId]; return n }), 3000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

      {/* 残高 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 0' }}>
        <span style={{ fontSize: 22 }}>✦</span>
        <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 36, color: colors.accent.silver, letterSpacing: '-0.02em' }}>
          {shards}
        </span>
        <span style={{ fontFamily: "'Noto Sans JP',sans-serif", fontSize: 13, color: colors.text.secondary }}>
          静けさの欠片
        </span>
      </div>

      {/* 道具箱 */}
      <div>
        <p style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
          color: colors.text.secondary, margin: '0 0 10px',
          letterSpacing: '0.08em',
        }}>
          ── 道具箱
        </p>
        <Toolbox onUse={onUseItem} refreshKey={toolboxKey} />
      </div>

      <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 16 }}>
        <p style={{
          fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
          color: colors.text.secondary, margin: '0 0 10px',
          letterSpacing: '0.08em',
        }}>
          ── 交換する
        </p>
        <p style={{ margin: '0 0 16px', textAlign: 'center', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.text.secondary, lineHeight: 1.8 }}>
          不安の買い取りで貯めた欠片を、何か意味のあるものと交換しましょう。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SHOP_ITEMS.map((item, i) => {
            const isOwned     = owned[i]
            const canAfford   = shards >= item.cost
            const isPermanent = item.type === 'permanent'
            const flashState  = flash[item.id]
            const btnDisabled = isPermanent && isOwned

            return (
              <GlassCard key={item.id} size="sm">
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.primary, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {item.name}
                    </p>
                    <p style={{ margin: '0 0 8px', fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: colors.text.secondary, lineHeight: 1.7 }}>
                      {item.description}
                    </p>
                    <p style={{ margin: '0 0 10px', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 11, color: colors.text.secondary, lineHeight: 1.7, borderLeft: `2px solid ${colors.accent.silver}44`, paddingLeft: 10 }}>
                      「{item.fushigiSays}」
                    </p>

                    {flashState === 'ok' ? (
                      <p style={{ margin: 0, fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12, color: colors.accent.blue }}>
                        ✓ 交換しました
                      </p>
                    ) : flashState === 'already' ? (
                      <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: colors.text.secondary }}>
                        すでに所持しています
                      </p>
                    ) : flashState === 'poor' ? (
                      <p style={{ margin: 0, fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11, color: colors.accent.amber }}>
                        欠片が足りません（{item.cost} シャード必要）
                      </p>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 300, fontSize: 13, color: canAfford ? colors.accent.silver : colors.text.secondary }}>
                          ✦ {item.cost}
                        </span>
                        <button
                          onClick={() => handleBuy(item.id)}
                          disabled={btnDisabled}
                          style={{
                            padding: '5px 16px', borderRadius: 12,
                            border: `1px solid ${btnDisabled ? 'rgba(255,255,255,0.1)' : canAfford ? colors.accent.silver + '55' : 'rgba(255,255,255,0.1)'}`,
                            background: btnDisabled ? 'transparent' : canAfford ? `${colors.accent.silver}18` : 'transparent',
                            color: btnDisabled ? colors.text.secondary : canAfford ? colors.text.primary : colors.text.secondary,
                            fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 12,
                            cursor: btnDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {btnDisabled ? '所持済み' : '交換する'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Overlay type ──────────────────────────────────────────────────────────────

type ActiveOverlay = 'certificate' | 'candle_timer' | 'clay_knead' | 'gift_wrap' | 'handkerchief' | null

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'badges' | 'souvenirs' | 'shop'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'badges',    label: '心の足跡', emoji: '🌑' },
  { key: 'souvenirs', label: 'おみやげ', emoji: '🎁' },
  { key: 'shop',      label: '物々交換', emoji: '✦'  },
]

export function CollectionPage() {
  const [tab, setTab] = useState<Tab>('badges')
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null)
  const [toolboxKey, setToolboxKey] = useState(0)

  const earnedBadges    = loadEarnedBadges().length
  const earnedSouvenirs = loadEarnedSouvenirs().length
  const totalBadges     = BADGE_DEFS.length
  const totalSouvenirs  = SOUVENIR_DEFS.length

  const handleUseItem = (itemId: string) => {
    if (itemId === 'gift_wrap') {
      // GiftWrapOverlay handles its own consumption on send
      setActiveOverlay('gift_wrap')
    } else if (useFromInventory(itemId)) {
      setActiveOverlay(itemId as ActiveOverlay)
    }
  }

  const handleCloseOverlay = () => {
    setActiveOverlay(null)
    setToolboxKey((k) => k + 1)  // refresh toolbox counts
  }

  return (
    <ModuleShell title="心の足跡" accent="silver" backTo="/">

      {/* タブ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {TABS.map(({ key, label, emoji }) => {
          const active = tab === key
          const badge  = key === 'badges'
            ? `${earnedBadges}/${totalBadges}`
            : key === 'souvenirs'
            ? `${earnedSouvenirs}/${totalSouvenirs}`
            : null
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '9px 4px', borderRadius: 14,
                border: `1px solid ${active ? colors.accent.silver : 'rgba(255,255,255,0.10)'}`,
                background: active ? `${colors.accent.silver}18` : 'transparent',
                color: active ? colors.text.primary : colors.text.secondary,
                fontFamily: "'Noto Sans JP',sans-serif", fontSize: 11,
                cursor: 'pointer', transition: 'all 0.18s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span>{label}</span>
              {badge && (
                <span style={{ fontSize: 9, color: colors.text.secondary, fontFamily: 'Inter,sans-serif' }}>{badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* バッジタブ */}
      {tab === 'badges' && (
        <div style={{ paddingBottom: 32 }}>
          <p style={{ margin: '0 0 16px', textAlign: 'center', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, lineHeight: 1.8 }}>
            ここにあるのは、あなたがここにいた証拠です。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
            {BADGE_DEFS.map((def) => <BadgeCard key={def.id} id={def.id} />)}
          </div>
          {earnedBadges === totalBadges && (
            <p style={{ textAlign: 'center', margin: '16px 0 0', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 14, color: colors.accent.blue, lineHeight: 1.8 }}>
              全部、受け取ってくれましたね。
            </p>
          )}
        </div>
      )}

      {/* おみやげタブ */}
      {tab === 'souvenirs' && (
        <div style={{ paddingBottom: 32 }}>
          <p style={{ margin: '0 0 16px', textAlign: 'center', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, lineHeight: 1.8 }}>
            タイマーやミッションの後、気まぐれに渡したものたちです。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {SOUVENIR_DEFS.map((def) => <SouvenirCard key={def.id} id={def.id} />)}
          </div>
          {earnedSouvenirs === 0 && (
            <p style={{ textAlign: 'center', margin: '20px 0 0', fontFamily: "'Noto Serif JP',serif", fontWeight: 300, fontSize: 13, color: colors.text.secondary, lineHeight: 1.8 }}>
              まだ何もありません。タイマーかミッションを試してみてください。
            </p>
          )}
        </div>
      )}

      {/* ショップタブ */}
      {tab === 'shop' && (
        <ShopTab onUseItem={handleUseItem} toolboxKey={toolboxKey} />
      )}

      {/* オーバーレイ */}
      {activeOverlay === 'certificate'  && <CertificateOverlay  onClose={handleCloseOverlay} />}
      {activeOverlay === 'candle_timer' && <CandleTimerOverlay  onClose={handleCloseOverlay} />}
      {activeOverlay === 'clay_knead'   && <ClayKneadOverlay    onClose={handleCloseOverlay} />}
      {activeOverlay === 'gift_wrap'    && <GiftWrapOverlay      onClose={handleCloseOverlay} />}
      {activeOverlay === 'handkerchief' && <HandkerchiefOverlay  onClose={handleCloseOverlay} />}

    </ModuleShell>
  )
}
