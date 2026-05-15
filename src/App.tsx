import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BackgroundField }  from './ui/BackgroundField'
import { AIBridgePanel }   from './ui/AIBridgePanel'
import { syncAlertLevel }   from './core/metrics'
import { notif }            from './core/notifications'
import { useAppStore }      from './core/store'
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
import './ui/transitions.css'

// ── テーマ・CSS変数・メタタグを一括管理 ────────────────────────────────────────
function ThemeSyncer() {
  const location   = useLocation()
  const alertLevel = useAppStore((s) => s.alertLevel)
  const setTheme   = useAppStore((s) => s.setTheme)

  useEffect(() => {
    const path    = location.pathname
    const isDark  = path === '/study' || path.startsWith('/study/')
                  || path === '/vault' || path.startsWith('/vault/')
    const mode    = isDark || alertLevel >= 2 ? 'dark' : 'light'

    setTheme(mode)

    // CSS 変数を更新（全コンポーネントが自動追従）
    const root = document.documentElement
    root.style.setProperty('--haku-text-primary',   mode === 'light' ? '#2D2A3E' : '#F0EEF8')
    root.style.setProperty('--haku-text-secondary', mode === 'light' ? '#7A7290' : '#A89FC0')

    // html キャンバス背景を更新（body が transparent なのでここが実際の背景色）
    root.style.backgroundColor = mode === 'light' ? '#F5F1EC' : '#1C1A2E'

    // PWA ステータスバー・theme-color
    const tc = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const sb = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (tc) tc.setAttribute('content', mode === 'light' ? '#F5F1EC' : '#1C1A2E')
    if (sb) sb.setAttribute('content', mode === 'light' ? 'default'  : 'black-translucent')
  }, [location.pathname, alertLevel, setTheme])

  return null
}

function AppContent() {
  const location = useLocation()
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
          <Route path="/seen"      element={<SeenPage />} />
        </Routes>
      </div>
      {/* AI magic-button panel — hidden on /vault and /companion (isolation policy) */}
      <AIBridgePanel />
    </>
  )
}

export default function App() {
  useEffect(() => {
    // 起動時に指標を計算して alertLevel を zustand に反映
    syncAlertLevel()

    // 永続化済み通知スケジュールを復元
    notif.restoreSchedules()

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
