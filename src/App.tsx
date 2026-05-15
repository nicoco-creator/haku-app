import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BackgroundField }  from './ui/BackgroundField'
import { AIBridgePanel }   from './ui/AIBridgePanel'
import { syncAlertLevel }   from './core/metrics'
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

function AppContent() {
  const location = useLocation()
  return (
    <>
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
