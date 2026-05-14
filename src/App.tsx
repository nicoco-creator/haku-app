import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BackgroundField } from './ui/BackgroundField'
import { HomePage } from './modules/home'

export default function App() {
  return (
    <BrowserRouter basename="/haku-app">
      <BackgroundField />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}
