import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BackgroundField }  from './ui/BackgroundField'
import { AIBridgePanel }   from './ui/AIBridgePanel'
import { syncAlertLevel }   from './core/metrics'
import { notif }            from './core/notifications'
import { useAppStore }      from './core/store'
import { initSession, generateLetter } from './core/absence'
import { setBadge }         from './core/app-badge'
import { recordSession }    from './core/meta'
import { checkStartupBadges } from './core/badges'
import { HomePage }         from './modules/home'
import { StudyPage }        from './modules/study'
import { EmotionPage }      from './modules/emotion'
import { WeatherPage }      from './modules/weather'
import { JournalPage }      from './modules/journal'
import { CompanionPage }    from './modules/companion'
import { GooddayPage }      from './modules/goodday'
import { WaitingPage }      from './modules/waiting'
import { VaultPage }        from './modules/vault'
import { SettingsPage }     from './modules/settings'
import { SeenPage }         from './modules/seen'
import { TimerPage }        from './modules/timer'
import { CollectionPage }   from './modules/collection'
import { AuctionPage }      from './modules/auction'
import { NewsPage }         from './modules/news'
import { BGMPage }          from './modules/bgm'
import { ThemePage }        from './modules/theme'
import { BGMPlayer }        from './ui/BGMPlayer'
import { BlockModeOverlay } from './ui/BlockModeOverlay'
import { GiftRevealPopup }  from './ui/GiftRevealPopup'
import { getReservedGift }  from './core/shop'
import './ui/transitions.css'

// ── テーマ・CSS変数・メタタグを一括管理 ────────────────────────────────────────
function ThemeSyncer() {
  const location         = useLocation()
  const alertLevel       = useAppStore((s) => s.alertLevel)
  const setTheme         = useAppStore((s) => s.setTheme)
  const uiThemeAlwaysDark = useAppStore((s) => s.uiThemeAlwaysDark)

  useEffect(() => {
    const root = document.documentElement

    // 模様替えでダークテーマが選ばれている場合は常に dark モード
    if (uiThemeAlwaysDark) {
      setTheme('dark')
      root.style.setProperty('--haku-text-primary',   '#F0EEF8')
      root.style.setProperty('--haku-text-secondary', '#A89FC0')
      const tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      const sb = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
      if (tc) tc.setAttribute('content', '#1C1A2E')
      if (sb) sb.setAttribute('content', 'black-translucent')
      return
    }

    const path   = location.pathname
    const isDark = path === '/study' || path.startsWith('/study/')
                 || path === '/vault' || path.startsWith('/vault/')
    const mode   = isDark || alertLevel >= 2 ? 'dark' : 'light'

    setTheme(mode)
    root.style.setProperty('--haku-text-primary',   mode === 'light' ? '#2D2A3E' : '#F0EEF8')
    root.style.setProperty('--haku-text-secondary', mode === 'light' ? '#7A7290' : '#A89FC0')

    const tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const sb = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (tc) tc.setAttribute('content', mode === 'light' ? '#F5F1EC' : '#1C1A2E')
    if (sb) sb.setAttribute('content', mode === 'light' ? 'default'  : 'black-translucent')
  }, [location.pathname, alertLevel, setTheme, uiThemeAlwaysDark])

  return null
}

function AppContent() {
  const location = useLocation()
  const [gift, setGift] = useState(() => getReservedGift())

  return (
    <>
      <ThemeSyncer />
      <div className="route-enter" key={location.pathname}>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/study"     element={<StudyPage />} />
          <Route path="/emotion"   element={<EmotionPage />} />
          <Route path="/weather"   element={<WeatherPage />} />
          <Route path="/journal"   element={<JournalPage />} />
          <Route path="/companion" element={<CompanionPage />} />
          <Route path="/goodday"   element={<GooddayPage />} />
          <Route path="/waiting"   element={<WaitingPage />} />
          <Route path="/vault"     element={<VaultPage />} />
          <Route path="/settings"  element={<SettingsPage />} />
          <Route path="/seen"       element={<SeenPage />} />
          <Route path="/timer"      element={<TimerPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/auction"    element={<AuctionPage />} />
          <Route path="/news"       element={<NewsPage />} />
          <Route path="/bgm"        element={<BGMPage />} />
          <Route path="/theme"      element={<ThemePage />} />
        </Routes>
      </div>
      {/* AI magic-button panel — hidden on /vault and /companion (isolation policy) */}
      <AIBridgePanel />
      {/* 5分間遮断モードオーバーレイ（ショップ購入時に起動） */}
      <BlockModeOverlay />
      {/* お守りラッピング — 前回セッションで書いたメッセージがあれば表示 */}
      {gift && <GiftRevealPopup message={gift.message} writtenAt={gift.writtenAt} onClose={() => setGift(null)} />}
      <BGMPlayer />
    </>
  )
}

export default function App() {
  useEffect(() => {
    // 起動時に指標を計算して alertLevel を zustand に反映
    syncAlertLevel()

    // 永続化済み通知スケジュールを復元
    notif.restoreSchedules()

    // メタデータ更新 → スタートアップバッジチェック
    const isFirst = recordSession()
    checkStartupBadges(isFirst)

    // 不在時間を計算し手紙を生成、last_active_time を更新
    const absenceMinutes = initSession()
    if (absenceMinutes >= 5) generateLetter(absenceMinutes)

    // App Badge API — 在室ランプとして「1」をセット（ホーム表示時にクリア）
    setBadge(1)

    // バックグラウンドから復帰したとき（日付をまたいだ場合も含む）に再計算
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncAlertLevel()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <BrowserRouter basename="/haku-app">
      <BackgroundField />
      <AppContent />
    </BrowserRouter>
  )
}
